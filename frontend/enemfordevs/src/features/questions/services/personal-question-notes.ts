import {
  getDeletedAccountRecords,
  markAccountRecordDeleted,
  markAccountRecordRestored,
  notifyAccountDataChanged,
} from "@/services/account-data-events";
import {
  getAccountStorageScope,
  type AccountStorageScope,
} from "@/services/account-storage";
import type { EnemAlternativeLetter } from "@/types/enem";
import type {
  PersonalQuestionExplanation,
  PersonalQuestionRecord,
} from "@/features/questions/types/personal-question-note";

const STORAGE_KEY = "enemfordevs:personal-question-notes:v1";
const letters: EnemAlternativeLetter[] = ["A", "B", "C", "D", "E"];
const maxTextLength = 5000;
let operationQueue: Promise<void> = Promise.resolve();

function queueOperation<T>(
  operation: (scope: AccountStorageScope) => Promise<T>,
  scope = getAccountStorageScope(),
): Promise<T> {
  const result = operationQueue.then(() => operation(scope));
  operationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function isExplanation(value: unknown): value is PersonalQuestionExplanation {
  if (!value || typeof value !== "object") {
    return false;
  }
  const explanation = value as Record<string, unknown>;
  const alternatives = explanation.alternatives;
  return (
    typeof explanation.general === "string" &&
    explanation.general.length <= maxTextLength &&
    alternatives !== null &&
    typeof alternatives === "object" &&
    Object.entries(alternatives).every(
      ([letter, text]) =>
        letters.includes(letter as EnemAlternativeLetter) &&
        typeof text === "string" &&
        text.length <= maxTextLength,
    ) &&
    Array.isArray(explanation.sources) &&
    explanation.sources.length <= 20 &&
    explanation.sources.every(
      (source) => typeof source === "string" && source.length <= 500,
    ) &&
    typeof explanation.updatedAt === "string"
  );
}

export function isPersonalQuestionRecord(
  value: unknown,
): value is PersonalQuestionRecord {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.questionId === "string" &&
    record.questionId.length > 0 &&
    (record.explanation === null || isExplanation(record.explanation)) &&
    typeof record.isFavorite === "boolean" &&
    typeof record.wantsReview === "boolean" &&
    (record.isFavoriteUpdatedAt === undefined ||
      typeof record.isFavoriteUpdatedAt === "string") &&
    (record.wantsReviewUpdatedAt === undefined ||
      typeof record.wantsReviewUpdatedAt === "string")
  );
}

export function mergePersonalQuestionRecords(
  local: PersonalQuestionRecord[],
  remote: PersonalQuestionRecord[],
): PersonalQuestionRecord[] {
  const result = new Map(remote.map((item) => [item.questionId, item]));
  for (const item of local) {
    const current = result.get(item.questionId);
    if (!current) {
      result.set(item.questionId, item);
      continue;
    }
    const localExplanation = item.explanation;
    const remoteExplanation = current.explanation;
    const explanation =
      !localExplanation
        ? remoteExplanation
        : !remoteExplanation ||
            localExplanation.updatedAt.localeCompare(remoteExplanation.updatedAt) >= 0
          ? localExplanation
          : remoteExplanation;
    const localFavoriteUpdatedAt = item.isFavoriteUpdatedAt ?? "";
    const remoteFavoriteUpdatedAt = current.isFavoriteUpdatedAt ?? "";
    const localReviewUpdatedAt = item.wantsReviewUpdatedAt ?? "";
    const remoteReviewUpdatedAt = current.wantsReviewUpdatedAt ?? "";
    const hasFavoriteTimestamp =
      Boolean(localFavoriteUpdatedAt || remoteFavoriteUpdatedAt);
    const hasReviewTimestamp = Boolean(localReviewUpdatedAt || remoteReviewUpdatedAt);
    const localFavoriteIsNewer =
      localFavoriteUpdatedAt.localeCompare(remoteFavoriteUpdatedAt) >= 0;
    const localReviewIsNewer =
      localReviewUpdatedAt.localeCompare(remoteReviewUpdatedAt) >= 0;
    result.set(item.questionId, {
      questionId: item.questionId,
      explanation,
      isFavorite: hasFavoriteTimestamp
        ? localFavoriteIsNewer
          ? item.isFavorite
          : current.isFavorite
        : item.isFavorite || current.isFavorite,
      wantsReview: hasReviewTimestamp
        ? localReviewIsNewer
          ? item.wantsReview
          : current.wantsReview
        : item.wantsReview || current.wantsReview,
      isFavoriteUpdatedAt:
        hasFavoriteTimestamp && localFavoriteIsNewer
          ? item.isFavoriteUpdatedAt
          : current.isFavoriteUpdatedAt,
      wantsReviewUpdatedAt:
        hasReviewTimestamp && localReviewIsNewer
          ? item.wantsReviewUpdatedAt
          : current.wantsReviewUpdatedAt,
    });
  }
  return Array.from(result.values());
}

export function getPersonalQuestionRecordUpdatedAt(
  record: PersonalQuestionRecord,
): string {
  return [
    record.explanation?.updatedAt ?? "",
    record.isFavoriteUpdatedAt ?? "",
    record.wantsReviewUpdatedAt ?? "",
  ].sort().at(-1) ?? "";
}

async function readRecords(
  scope: AccountStorageScope,
): Promise<PersonalQuestionRecord[]> {
  const stored = await scope.getItem(STORAGE_KEY);
  if (stored === null) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error("As anotações pessoais salvas não contêm JSON válido.");
  }
  if (!Array.isArray(parsed) || !parsed.every(isPersonalQuestionRecord)) {
    throw new Error("As anotações pessoais salvas têm formato inválido.");
  }
  return parsed;
}

function emptyRecord(questionId: string): PersonalQuestionRecord {
  return {
    questionId,
    explanation: null,
    isFavorite: false,
    wantsReview: false,
  };
}

export function getPersonalQuestionRecord(
  questionId: string,
  scope = getAccountStorageScope(),
): Promise<PersonalQuestionRecord | null> {
  return queueOperation(async (storage) => {
    const records = await readRecords(storage);
    return records.find((record) => record.questionId === questionId) ?? null;
  }, scope);
}

export function getPersonalQuestionRecords(
  scope = getAccountStorageScope(),
): Promise<PersonalQuestionRecord[]> {
  return queueOperation(readRecords, scope);
}

export function replacePersonalQuestionRecordsFromAccount(
  records: PersonalQuestionRecord[],
  scope = getAccountStorageScope(),
): Promise<void> {
  if (!Array.isArray(records) || !records.every(isPersonalQuestionRecord)) {
    return Promise.reject(new Error("As anotações remotas têm formato inválido."));
  }
  return queueOperation(async (storage) => {
    const [current, deleted] = await Promise.all([
      readRecords(storage),
      getDeletedAccountRecords(storage),
    ]);
    const merged = mergePersonalQuestionRecords(current, records);
    const active: PersonalQuestionRecord[] = [];
    for (const record of merged) {
      const deletedAt = deleted.questionRecords[record.questionId];
      if (!deletedAt) {
        active.push(record);
        continue;
      }
      const updatedAt = getPersonalQuestionRecordUpdatedAt(record);
      if (updatedAt.localeCompare(deletedAt) > 0) {
        await markAccountRecordRestored(
          "questionRecords",
          record.questionId,
          storage,
        );
        active.push(record);
      }
    }
    await storage.setItem(STORAGE_KEY, JSON.stringify(active));
  }, scope);
}

export function savePersonalQuestionExplanation(
  questionId: string,
  explanation: Omit<PersonalQuestionExplanation, "updatedAt">,
  scope = getAccountStorageScope(),
): Promise<PersonalQuestionRecord> {
  const preparedExplanation: PersonalQuestionExplanation = {
    ...explanation,
    updatedAt: new Date().toISOString(),
  };
  if (
    !questionId.trim() ||
    !isExplanation(preparedExplanation) ||
    Object.keys(preparedExplanation.alternatives).length > letters.length
  ) {
    return Promise.reject(new Error("A explicação pessoal tem dados inválidos."));
  }

  return queueOperation(async (storage) => {
    const records = await readRecords(storage);
    const current =
      records.find((record) => record.questionId === questionId) ??
      emptyRecord(questionId);
    const updated: PersonalQuestionRecord = {
      ...current,
      explanation: preparedExplanation,
    };
    await storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        ...records.filter((record) => record.questionId !== questionId),
        updated,
      ]),
    );
    await markAccountRecordRestored("questionRecords", questionId, storage);
    return updated;
  }).then((record) => {
    notifyAccountDataChanged(scope);
    return record;
  });
}

export function deletePersonalQuestionExplanation(
  questionId: string,
  scope = getAccountStorageScope(),
): Promise<PersonalQuestionRecord | null> {
  return queueOperation(async (storage) => {
    const records = await readRecords(storage);
    const current = records.find((record) => record.questionId === questionId);
    if (!current) {
      return null;
    }
    const updated = { ...current, explanation: null };
    const nextRecords =
      updated.isFavorite || updated.wantsReview
        ? records.map((record) =>
            record.questionId === questionId ? updated : record,
          )
        : records.filter((record) => record.questionId !== questionId);
    await storage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    if (updated.isFavorite || updated.wantsReview) {
      await markAccountRecordRestored("questionRecords", questionId, storage);
    } else {
      await markAccountRecordDeleted("questionRecords", questionId, storage);
    }
    return updated.isFavorite || updated.wantsReview ? updated : null;
  }).then((record) => {
    notifyAccountDataChanged(scope);
    return record;
  });
}

export function setPersonalQuestionFlag(
  questionId: string,
  flag: "isFavorite" | "wantsReview",
  enabled: boolean,
  scope = getAccountStorageScope(),
): Promise<PersonalQuestionRecord> {
  return queueOperation(async (storage) => {
    const records = await readRecords(storage);
    const current =
      records.find((record) => record.questionId === questionId) ??
      emptyRecord(questionId);
    const updated = {
      ...current,
      [flag]: enabled,
      [flag === "isFavorite" ? "isFavoriteUpdatedAt" : "wantsReviewUpdatedAt"]:
        new Date().toISOString(),
    };
    const nextRecords =
      !updated.explanation && !updated.isFavorite && !updated.wantsReview
        ? records.filter((record) => record.questionId !== questionId)
        : [
            ...records.filter((record) => record.questionId !== questionId),
            updated,
          ];
    await storage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    if (
      updated.explanation ||
      updated.isFavorite ||
      updated.wantsReview
    ) {
      await markAccountRecordRestored("questionRecords", questionId, storage);
    } else {
      await markAccountRecordDeleted("questionRecords", questionId, storage);
    }
    return updated;
  }).then((record) => {
    notifyAccountDataChanged(scope);
    return record;
  });
}
