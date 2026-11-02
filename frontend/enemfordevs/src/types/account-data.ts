import type { PersonalQuestionRecord } from "@/features/questions/types/personal-question-note";
import type { WritingEssay, WritingTopic } from "@/features/essays/types/writing";
import type { StudentState } from "@/types/student-state";
import type { VisualPreferences } from "@/types/visual-preferences";

export interface AccountData {
  format: "enem.dev-account-data";
  version: 1;
  studentState: StudentState;
  writingEssays: WritingEssay[];
  personalWritingTopics: WritingTopic[];
  personalQuestionRecords: PersonalQuestionRecord[];
  visualPreferences?: VisualPreferences;
  deleted: {
    essays: Record<string, string>;
    topics: Record<string, string>;
    questionRecords: Record<string, string>;
  };
}

export interface AccountDataSnapshot {
  studentState: StudentState;
  writingEssays: WritingEssay[];
  personalWritingTopics: WritingTopic[];
  personalQuestionRecords: PersonalQuestionRecord[];
  visualPreferences: VisualPreferences;
  deleted: AccountData["deleted"];
}
