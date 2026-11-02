import { processStudentAnswer } from "@/services/student-state-storage";
import type { AnswerAttempt } from "@/types/history";
import type { ProcessAnswerResult } from "@/types/student-state";

export async function recordAnswer(
  attempt: AnswerAttempt,
): Promise<ProcessAnswerResult> {
  return processStudentAnswer(attempt);
}
