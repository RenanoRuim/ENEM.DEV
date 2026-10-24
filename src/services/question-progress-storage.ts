import {
  getStudentState,
  saveProgressRecord,
} from "@/services/student-state-storage";
import type { QuestionProgress } from "@/types/question-progress";

export async function getQuestionProgress(): Promise<QuestionProgress[]> {
  const state = await getStudentState();
  return state.progress;
}

export async function saveQuestionProgress(
  progress: QuestionProgress,
): Promise<void> {
  await saveProgressRecord(progress);
}
