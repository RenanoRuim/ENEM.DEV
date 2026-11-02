import type { EnemQuestion } from "@/types/enem";

export function getQuestionId(
  year: number,
  questionNumber: number,
  language: string | null = null,
): string {
  const baseId = `${year}:${questionNumber}`;
  return language ? `${baseId}:${language}` : baseId;
}

export function getQuestionIdentity(
  question: EnemQuestion,
  requestedLanguage?: string,
): string {
  return getQuestionId(
    question.year,
    question.index,
    question.language ?? requestedLanguage ?? null,
  );
}
