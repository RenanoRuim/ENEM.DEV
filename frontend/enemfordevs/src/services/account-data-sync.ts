import {
  downloadRemoteWritingImage,
  getAccountSession,
  uploadRemoteWritingImage,
  type AccountSession,
} from "@/services/account-data-api";
import {
  AccountDataConflictError,
  fetchRemoteAccountData,
  saveRemoteAccountData,
} from "@/services/account-data-repository";
import {
  getAccountStorageScope,
  type AccountStorageScope,
} from "@/services/account-storage";
import {
  getPendingAccountDataSyncVersion,
  markAccountDataSyncCompleted,
  getDeletedAccountRecords,
  replaceDeletedAccountRecords,
  type AccountDataDeletedRecords,
} from "@/services/account-data-events";
import {
  getStudentState,
  isStudentState,
  mergeStudentStates,
  replaceStudentStateFromAccount,
} from "@/services/student-state-storage";
import {
  getWritingEssays,
  isWritingEssay,
  replaceWritingEssaysFromAccount,
} from "@/features/essays/services/writing-storage";
import {
  getPersonalWritingTopics,
  isPersonalWritingTopic,
  replacePersonalWritingTopicsFromAccount,
} from "@/features/essays/services/personal-writing-topics";
import {
  getPersonalQuestionRecordUpdatedAt,
  getPersonalQuestionRecords,
  isPersonalQuestionRecord,
  mergePersonalQuestionRecords,
  replacePersonalQuestionRecordsFromAccount,
} from "@/features/questions/services/personal-question-notes";
import {
  readWritingPromptImageBase64,
  saveWritingPromptImageBase64,
} from "@/features/essays/services/writing-prompt-images";
import type { AccountData, AccountDataSnapshot } from "@/types/account-data";
import {
  DEFAULT_VISUAL_PREFERENCES,
  isVisualPreferences,
} from "@/types/visual-preferences";
import {
  getVisualPreferences,
  replaceVisualPreferencesFromAccount,
} from "@/services/visual-preferences-storage";
import type {
  WritingEssay,
  WritingPromptImage,
  WritingTopic,
} from "@/features/essays/types/writing";

const MAX_CONFLICT_RETRIES = 3;
let syncQueue: Promise<void> = Promise.resolve();
const syncedImages = new Set<string>();

function isAccountData(value: unknown): value is AccountData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  const deleted = data.deleted as Record<string, unknown> | undefined;
  return (
    data.format === "enem.dev-account-data" &&
    data.version === 1 &&
    isStudentState(data.studentState) &&
    Array.isArray(data.writingEssays) &&
    data.writingEssays.every(isWritingEssay) &&
    Array.isArray(data.personalWritingTopics) &&
    data.personalWritingTopics.every(isPersonalWritingTopic) &&
    Array.isArray(data.personalQuestionRecords) &&
    data.personalQuestionRecords.every(isPersonalQuestionRecord) &&
    (data.visualPreferences === undefined ||
      isVisualPreferences(data.visualPreferences)) &&
    Boolean(deleted) &&
    ["essays", "topics", "questionRecords"].every(
      (key) => {
        const entries = deleted?.[key];
        return (
          entries !== null &&
          typeof entries === "object" &&
          !Array.isArray(entries) &&
          Object.values(entries).every((deletedAt) => typeof deletedAt === "string")
        );
      },
    )
  );
}

async function getLocalSnapshot(
  scope: AccountStorageScope,
): Promise<AccountDataSnapshot> {
  const [
    studentState,
    writingEssays,
    personalWritingTopics,
    personalQuestionRecords,
    visualPreferences,
    deleted,
  ] = await Promise.all([
    getStudentState(scope),
    getWritingEssays(scope),
    getPersonalWritingTopics(scope),
    getPersonalQuestionRecords(scope),
    getVisualPreferences(scope),
    getDeletedAccountRecords(scope),
  ]);
  return {
    studentState,
    writingEssays,
    personalWritingTopics,
    personalQuestionRecords,
    visualPreferences,
    deleted,
  };
}

function mergeById<T>(
  local: T[],
  remote: T[],
  getId: (item: T) => string,
  getUpdatedAt: (item: T) => string,
): T[] {
  const result = new Map(remote.map((item) => [getId(item), item]));
  for (const item of local) {
    const id = getId(item);
    const current = result.get(id);
    if (!current || getUpdatedAt(item).localeCompare(getUpdatedAt(current)) >= 0) {
      result.set(id, item);
    }
  }
  return Array.from(result.values());
}

function mergeDeleted(
  local: AccountDataDeletedRecords,
  remote: AccountDataDeletedRecords,
): AccountDataDeletedRecords {
  function mergeKind(
    localEntries: Record<string, string>,
    remoteEntries: Record<string, string>,
  ): Record<string, string> {
    const merged = { ...remoteEntries };
    for (const [id, deletedAt] of Object.entries(localEntries)) {
      if (!merged[id] || deletedAt.localeCompare(merged[id]) > 0) {
        merged[id] = deletedAt;
      }
    }
    return merged;
  }

  return {
    essays: mergeKind(local.essays, remote.essays),
    topics: mergeKind(local.topics, remote.topics),
    questionRecords: mergeKind(
      local.questionRecords,
      remote.questionRecords,
    ),
  };
}

function mergeAccountData(
  local: AccountDataSnapshot,
  remote: AccountData,
): AccountData {
  const deleted = mergeDeleted(local.deleted, remote.deleted);
  const essays = mergeById<WritingEssay>(
    local.writingEssays,
    remote.writingEssays,
    (essay) => essay.id,
    (essay) => essay.updatedAt,
  ).filter((essay) => {
    const deletedAt = deleted.essays[essay.id];
    if (!deletedAt) return true;
    if (essay.updatedAt.localeCompare(deletedAt) > 0) {
      delete deleted.essays[essay.id];
      return true;
    }
    return false;
  });
  const topics = mergeById<WritingTopic>(
    local.personalWritingTopics,
    remote.personalWritingTopics,
    (topic) => topic.id,
    (topic) => topic.updatedAt ?? topic.createdAt ?? "",
  ).filter((topic) => {
    const deletedAt = deleted.topics[topic.id];
    if (!deletedAt) return true;
    if ((topic.updatedAt ?? topic.createdAt ?? "").localeCompare(deletedAt) > 0) {
      delete deleted.topics[topic.id];
      return true;
    }
    return false;
  });
  const records = mergePersonalQuestionRecords(
    local.personalQuestionRecords,
    remote.personalQuestionRecords,
  ).filter((record) => {
    const deletedAt = deleted.questionRecords[record.questionId];
    if (!deletedAt) return true;
    if (getPersonalQuestionRecordUpdatedAt(record).localeCompare(deletedAt) > 0) {
      delete deleted.questionRecords[record.questionId];
      return true;
    }
    return false;
  });
  const remotePreferences =
    remote.visualPreferences ?? DEFAULT_VISUAL_PREFERENCES;
  const visualPreferences =
    local.visualPreferences.updatedAt.localeCompare(
      remotePreferences.updatedAt,
    ) >= 0
      ? local.visualPreferences
      : remotePreferences;

  return {
    format: "enem.dev-account-data",
    version: 1,
    studentState: mergeStudentStates(local.studentState, remote.studentState),
    writingEssays: essays,
    personalWritingTopics: topics,
    personalQuestionRecords: records,
    visualPreferences,
    deleted,
  };
}

function createAccountData(snapshot: AccountDataSnapshot): AccountData {
  return {
    format: "enem.dev-account-data",
    version: 1,
    studentState: snapshot.studentState,
    writingEssays: snapshot.writingEssays,
    personalWritingTopics: snapshot.personalWritingTopics,
    personalQuestionRecords: snapshot.personalQuestionRecords,
    visualPreferences: snapshot.visualPreferences,
    deleted: snapshot.deleted,
  };
}

function getAccountImages(data: AccountData): WritingPromptImage[] {
  const images = new Map<string, WritingPromptImage>();
  const topics = [
    ...data.personalWritingTopics,
    ...data.writingEssays.flatMap((essay) =>
      essay.topicSnapshot ? [essay.topicSnapshot] : [],
    ),
  ];
  for (const topic of topics) {
    for (const text of topic.supportingTexts ?? []) {
      for (const image of text.images ?? []) {
        images.set(image.id, image);
      }
    }
  }
  return Array.from(images.values());
}

async function synchronizeImages(
  data: AccountData,
  session: AccountSession,
  scope: AccountStorageScope,
): Promise<void> {
  for (const image of getAccountImages(data)) {
    const cacheKey = `${session.userId}:${image.id}:${image.mimeType}:${image.sizeBytes}`;
    if (syncedImages.has(cacheKey)) continue;
    let localBase64: string;
    try {
      localBase64 = await readWritingPromptImageBase64(
        image.id,
        image.mimeType,
        scope,
      );
    } catch {
      const remoteBase64 = await downloadRemoteWritingImage(
        image.id,
        image.mimeType,
        session,
      );
      await saveWritingPromptImageBase64(
        image.id,
        image.mimeType,
        remoteBase64,
        scope,
      );
      syncedImages.add(cacheKey);
      continue;
    }
    await uploadRemoteWritingImage(
      image.id,
      image.mimeType,
      localBase64,
      session,
    );
    syncedImages.add(cacheKey);
  }
}

async function applyAccountData(
  data: AccountData,
  scope: AccountStorageScope,
): Promise<void> {
  if (!isAccountData(data)) {
    throw new Error("Os dados remotos da conta não correspondem ao formato esperado.");
  }
  await replaceDeletedAccountRecords(data.deleted, scope);
  await Promise.all([
    replaceStudentStateFromAccount(data.studentState, scope),
    replaceWritingEssaysFromAccount(data.writingEssays, scope),
    replacePersonalWritingTopicsFromAccount(data.personalWritingTopics, scope),
    replacePersonalQuestionRecordsFromAccount(data.personalQuestionRecords, scope),
    replaceVisualPreferencesFromAccount(
      data.visualPreferences ?? DEFAULT_VISUAL_PREFERENCES,
      scope,
    ),
  ]);
}

async function synchronize(
  restoreLocal: boolean,
  scope: AccountStorageScope,
): Promise<void> {
  const session = await getAccountSession(scope);
  const pendingVersion = await getPendingAccountDataSyncVersion(scope);
  const local = await getLocalSnapshot(scope);
  let remote = await fetchRemoteAccountData(scope);

  for (let attempt = 0; attempt < MAX_CONFLICT_RETRIES; attempt += 1) {
    const remoteData = remote.data;
    if (remoteData !== null && !isAccountData(remoteData)) {
      throw new Error("Os dados remotos da conta têm formato inválido.");
    }
    const merged = remoteData !== null
      ? mergeAccountData(local, remoteData)
      : createAccountData(local);

    try {
      await synchronizeImages(merged, session, scope);
      await saveRemoteAccountData(merged, remote.revision, scope);
      if (restoreLocal) await applyAccountData(merged, scope);
      await markAccountDataSyncCompleted(scope, pendingVersion);
      return;
    } catch (error) {
      if (!(error instanceof AccountDataConflictError)) {
        throw error;
      }
      remote = await fetchRemoteAccountData(scope);
    }
  }
  throw new Error(
    "A conta foi alterada em outro dispositivo durante a sincronização. Os dados locais foram mantidos; tente novamente.",
  );
}

export function synchronizeAccountData(
  restoreLocal = false,
  scope = getAccountStorageScope(),
): Promise<void> {
  const result = syncQueue.then(() => synchronize(restoreLocal, scope));
  syncQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function waitForAccountDataSync(): Promise<void> {
  await syncQueue;
}

export function clearSynchronizedImageCache(userId: string): void {
  const prefix = `${userId}:`;
  for (const key of syncedImages) {
    if (key.startsWith(prefix)) syncedImages.delete(key);
  }
}
