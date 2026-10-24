export type EnemAlternativeLetter = "A" | "B" | "C" | "D" | "E";

export interface EnemAlternative {
  letter: EnemAlternativeLetter;
  text: string | null;
  file: string | null;
  isCorrect: boolean;
}

export interface EnemQuestion {
  title: string;
  index: number;
  discipline: string | null;
  language: string | null;
  year: number;
  context: string | null;
  files: string[];
  correctAlternative: EnemAlternativeLetter;
  alternativesIntroduction: string | null;
  alternatives: EnemAlternative[];
}

export interface EnemQuestionsMetadata {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface EnemQuestionsResponse {
  metadata: EnemQuestionsMetadata;
  questions: EnemQuestion[];
}

export interface EnemExamOption {
  label: string;
  value: string;
}

export interface EnemExam {
  title: string;
  year: number;
  disciplines: EnemExamOption[];
  languages: EnemExamOption[];
}
