import AsyncStorage from "@react-native-async-storage/async-storage";

import { isWritingPromptImage } from "@/services/writing-prompt-images";
import type {
  WritingCompetencyId,
  WritingEssay,
  WritingStatus,
  WritingTopic,
} from "@/types/writing";

const STORAGE_KEY = "enemfordevs:writing-essays:v1";
const competencyIds: WritingCompetencyId[] = ["I", "II", "III", "IV", "V"];
let operationQueue: Promise<void> = Promise.resolve();

function queueOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation);
  operationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function isWritingEssay(value: unknown): value is WritingEssay {
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

async function readEssays(): Promise<WritingEssay[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
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

export function getWritingEssays(): Promise<WritingEssay[]> {
  return queueOperation(readEssays);
}

export function saveWritingEssay(essay: WritingEssay): Promise<void> {
  return queueOperation(async () => {
    const essays = await readEssays();
    const exists = essays.some((item) => item.id === essay.id);
    const updated = exists
      ? essays.map((item) => (item.id === essay.id ? essay : item))
      : [essay, ...essays];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  });
}

export function deleteWritingEssay(essayId: string): Promise<void> {
  return queueOperation(async () => {
    const essays = await readEssays();
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(essays.filter((essay) => essay.id !== essayId)),
    );
  });
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
