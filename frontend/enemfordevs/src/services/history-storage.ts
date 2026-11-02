import { processStudentAnswer, getStudentState } from "@/services/student-state-storage";
import type { AnswerAttempt } from "@/types/history";

export async function getAnswerHistory(): Promise<AnswerAttempt[]> {
  const state = await getStudentState();
  return state.attempts;
}

export async function saveAnswerAttempt(
  attempt: AnswerAttempt,
): Promise<void> {
  await processStudentAnswer(attempt);
}
