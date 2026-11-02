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
import { isWritingPromptImage } from "@/features/essays/services/writing-prompt-images";
import type {
  WritingCompetencyId,
  WritingEssay,
  WritingStatus,
  WritingTopic,
} from "@/features/essays/types/writing";

export const WRITING_ESSAYS_STORAGE_KEY = "enemfordevs:writing-essays:v1";
const competencyIds: WritingCompetencyId[] = ["I", "II", "III", "IV", "V"];
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

export function isWritingEssay(value: unknown): value is WritingEssay {
  if (!value || typeof value !== "object") {
    return false;
  }

  const essay = value as Record<string, unknown>;
  return (
    typeof essay.id === "string" &&
    typeof essay.topicId === "string" &&
    (essay.topicSnapshot === undefined ||
      isWritingTopicSnapshot(essay.topicSnapshot)) &&
    typeof essay.title === "string" &&
    typeof essay.text === "string" &&
    typeof essay.createdAt === "string" &&
    typeof essay.updatedAt === "string" &&
    (essay.status === "draft" || essay.status === "completed") &&
    Array.isArray(essay.reviewedCompetencies) &&
    essay.reviewedCompetencies.every((id) =>
      competencyIds.includes(id as WritingCompetencyId),
    ) &&
    typeof essay.elapsedSeconds === "number" &&
    Number.isFinite(essay.elapsedSeconds) &&
    essay.elapsedSeconds >= 0 &&
    (essay.timerStartedAt === null ||
      typeof essay.timerStartedAt === "string")
  );
}

function isWritingTopicSnapshot(value: unknown): value is WritingTopic {
  if (!value || typeof value !== "object") {
    return false;
  }
  const topic = value as Record<string, unknown>;
  return (
    typeof topic.id === "string" &&
    typeof topic.title === "string" &&
    typeof topic.category === "string" &&
    typeof topic.description === "string" &&
    (topic.updatedAt === undefined || typeof topic.updatedAt === "string") &&
    (topic.type === "official" ||
      topic.type === "authorial" ||
      topic.type === "personal") &&
    (topic.year === undefined || typeof topic.year === "number") &&
    (topic.source === undefined || typeof topic.source === "string") &&
    (topic.references === undefined ||
      (Array.isArray(topic.references) &&
        topic.references.every((reference) => typeof reference === "string"))) &&
    (topic.supportingTexts === undefined ||
      (Array.isArray(topic.supportingTexts) &&
        topic.supportingTexts.every(isSnapshotSupportingText)))
  );
}

function isSnapshotSupportingText(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.title === "string" &&
    typeof item.text === "string" &&
    (item.source === undefined || typeof item.source === "string") &&
    (item.images === undefined ||
      (Array.isArray(item.images) &&
        item.images.length <= 3 &&
        item.images.every(isWritingPromptImage)))
  );
}

async function readEssays(
  scope: AccountStorageScope,
): Promise<WritingEssay[]> {
  const stored = await scope.getItem(WRITING_ESSAYS_STORAGE_KEY);
  if (stored === null) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error("Os dados das redações salvos não contêm JSON válido.");
  }

  if (!Array.isArray(parsed) || !parsed.every(isWritingEssay)) {
    throw new Error("Os dados das redações salvos têm formato inválido.");
  }
  return parsed;
}

export function getWritingEssays(
  scope = getAccountStorageScope(),
): Promise<WritingEssay[]> {
  return queueOperation(readEssays, scope);
}

export function saveWritingEssay(
  essay: WritingEssay,
  scope = getAccountStorageScope(),
): Promise<void> {
  return queueOperation(async (storage) => {
    const essays = await readEssays(storage);
    const exists = essays.some((item) => item.id === essay.id);
    const updated = exists
      ? essays.map((item) => (item.id === essay.id ? essay : item))
      : [essay, ...essays];
    await storage.setItem(WRITING_ESSAYS_STORAGE_KEY, JSON.stringify(updated));
    await markAccountRecordRestored("essays", essay.id, storage);
  }).then(() => {
    notifyAccountDataChanged(scope);
  });
}

export function deleteWritingEssay(
  essayId: string,
  scope = getAccountStorageScope(),
): Promise<void> {
  return queueOperation(async (storage) => {
    const essays = await readEssays(storage);
    await storage.setItem(
      WRITING_ESSAYS_STORAGE_KEY,
      JSON.stringify(essays.filter((essay) => essay.id !== essayId)),
    );
    await markAccountRecordDeleted("essays", essayId, storage);
  }).then(() => {
    notifyAccountDataChanged(scope);
  });
}

export function replaceWritingEssaysFromAccount(
  essays: WritingEssay[],
  scope = getAccountStorageScope(),
): Promise<void> {
  if (!Array.isArray(essays) || !essays.every(isWritingEssay)) {
    return Promise.reject(new Error("As redações remotas têm formato inválido."));
  }
  return queueOperation(async (storage) => {
    const [current, deleted] = await Promise.all([
      readEssays(storage),
      getDeletedAccountRecords(storage),
    ]);
    const merged = new Map(essays.map((essay) => [essay.id, essay]));
    for (const essay of current) {
      const remote = merged.get(essay.id);
      if (!remote || essay.updatedAt.localeCompare(remote.updatedAt) >= 0) {
        merged.set(essay.id, essay);
      }
    }

    const active: WritingEssay[] = [];
    for (const essay of merged.values()) {
      const deletedAt = deleted.essays[essay.id];
      if (!deletedAt) {
        active.push(essay);
      } else if (essay.updatedAt.localeCompare(deletedAt) > 0) {
        await markAccountRecordRestored("essays", essay.id, storage);
        active.push(essay);
      }
    }
    await storage.setItem(WRITING_ESSAYS_STORAGE_KEY, JSON.stringify(active));
  }, scope);
}

export function createWritingEssay(topic: WritingTopic): WritingEssay {
  const now = new Date().toISOString();
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    topicId: topic.id,
    topicSnapshot: { ...topic },
    title: "",
    text: "",
    createdAt: now,
    updatedAt: now,
    status: "draft",
    reviewedCompetencies: [],
    elapsedSeconds: 0,
    timerStartedAt: null,
  };
}

export function duplicateWritingEssay(
  essay: WritingEssay,
): WritingEssay {
  const now = new Date().toISOString();
  return {
    ...essay,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    title: essay.title ? `${essay.title} (cópia)` : "Cópia da redação",
    createdAt: now,
    updatedAt: now,
    status: "draft",
    reviewedCompetencies: [],
    elapsedSeconds: 0,
    timerStartedAt: null,
  };
}

export function getElapsedWritingSeconds(
  essay: Pick<WritingEssay, "elapsedSeconds" | "timerStartedAt">,
  now = Date.now(),
): number {
  if (!essay.timerStartedAt) {
    return essay.elapsedSeconds;
  }
  const startedAt = Date.parse(essay.timerStartedAt);
  if (!Number.isFinite(startedAt)) {
    return essay.elapsedSeconds;
  }
  return essay.elapsedSeconds + Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function setWritingStatus(
  essay: WritingEssay,
  status: WritingStatus,
): WritingEssay {
  return { ...essay, status, updatedAt: new Date().toISOString() };
}
