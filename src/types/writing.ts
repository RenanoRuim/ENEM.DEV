export type WritingStatus = "draft" | "completed";
export type WritingCompetencyId = "I" | "II" | "III" | "IV" | "V";

export interface WritingPromptImage {
  id: string;
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  description?: string;
  source?: string;
}

export interface WritingSupportingText {
  title: string;
  text: string;
  source?: string;
  images?: WritingPromptImage[];
}

export interface WritingTopic {
  id: string;
  title: string;
  year?: number;
  category: string;
  type: "official" | "authorial" | "personal";
  description: string;
  supportingTexts?: WritingSupportingText[];
  source?: string;
  references?: string[];
  createdAt?: string;
}

export interface WritingEssay {
  id: string;
  topicId: string;
  topicSnapshot?: WritingTopic;
  title: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  status: WritingStatus;
  reviewedCompetencies: WritingCompetencyId[];
  elapsedSeconds: number;
  timerStartedAt: string | null;
}
