export type QuestionProgressStatus =
  | "unseen"
  | "needs_review"
  | "completed";

export interface QuestionProgress {
  questionId: string;
  year: number;
  questionNumber: number;
  language: string | null;
  discipline: string | null;
  status: QuestionProgressStatus;
  updatedAt: string;
}
