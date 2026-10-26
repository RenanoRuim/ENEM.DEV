import type { EnemAlternativeLetter } from "@/types/enem";

export interface PersonalQuestionExplanation {
  general: string;
  alternatives: Partial<Record<EnemAlternativeLetter, string>>;
  sources: string[];
  updatedAt: string;
}

export interface PersonalQuestionRecord {
  questionId: string;
  explanation: PersonalQuestionExplanation | null;
  isFavorite: boolean;
  wantsReview: boolean;
}
