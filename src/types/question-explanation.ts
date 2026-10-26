import type { EnemAlternativeLetter } from "@/types/enem";

export type ExplanationReviewStatus =
  | "unreviewed"
  | "reviewed"
  | "validated";

export interface QuestionExplanation {
  questionId: string;
  general?: string;
  alternatives?: Partial<Record<EnemAlternativeLetter, string>>;
  source?: string;
  reviewStatus: ExplanationReviewStatus;
}
