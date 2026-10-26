import AsyncStorage from "@react-native-async-storage/async-storage";

import type { EnemAlternativeLetter } from "@/types/enem";
import type {
  PersonalQuestionExplanation,
  PersonalQuestionRecord,
} from "@/types/personal-question-note";

const STORAGE_KEY = "enemfordevs:personal-question-notes:v1";
const letters: EnemAlternativeLetter[] = ["A", "B", "C", "D", "E"];
const maxTextLength = 5000;
let operationQueue: Promise<void> = Promise.resolve();

function queueOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation);
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

function isPersonalQuestionRecord(
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
    typeof record.wantsReview === "boolean"
  );
}

async function readRecords(): Promise<PersonalQuestionRecord[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
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
): Promise<PersonalQuestionRecord | null> {
  return queueOperation(async () => {
    const records = await readRecords();
    return records.find((record) => record.questionId === questionId) ?? null;
  });
}

export function getPersonalQuestionRecords(): Promise<PersonalQuestionRecord[]> {
  return queueOperation(readRecords);
}

export function savePersonalQuestionExplanation(
  questionId: string,
  explanation: Omit<PersonalQuestionExplanation, "updatedAt">,
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

  return queueOperation(async () => {
    const records = await readRecords();
    const current =
      records.find((record) => record.questionId === questionId) ??
      emptyRecord(questionId);
    const updated: PersonalQuestionRecord = {
      ...current,
      explanation: preparedExplanation,
    };
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        ...records.filter((record) => record.questionId !== questionId),
        updated,
      ]),
    );
    return updated;
  });
}

export function deletePersonalQuestionExplanation(
  questionId: string,
): Promise<PersonalQuestionRecord | null> {
  return queueOperation(async () => {
    const records = await readRecords();
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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    return updated.isFavorite || updated.wantsReview ? updated : null;
  });
}

export function setPersonalQuestionFlag(
  questionId: string,
  flag: "isFavorite" | "wantsReview",
  enabled: boolean,
): Promise<PersonalQuestionRecord> {
  return queueOperation(async () => {
    const records = await readRecords();
    const current =
      records.find((record) => record.questionId === questionId) ??
      emptyRecord(questionId);
    const updated = { ...current, [flag]: enabled };
    const nextRecords =
      !updated.explanation && !updated.isFavorite && !updated.wantsReview
        ? records.filter((record) => record.questionId !== questionId)
        : [
            ...records.filter((record) => record.questionId !== questionId),
            updated,
          ];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    return updated;
  });
}
