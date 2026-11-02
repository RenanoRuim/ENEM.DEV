import type { EnemAlternativeLetter } from "@/types/enem";

export interface AnswerAttempt {
  id: string;
  questionId: string;
  year: number;
  questionNumber: number;
  language?: string | null;
  mode?: "study" | "debug";
  discipline: string | null;
  selectedAlternative: EnemAlternativeLetter;
  correctAlternative: EnemAlternativeLetter;
  isCorrect: boolean;
  answeredAt: string;
}
