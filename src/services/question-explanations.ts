import { questionExplanationCatalog } from "@/services/question-explanation-catalog";
import type { QuestionExplanation } from "@/types/question-explanation";

export type ExplanationLookupResult =
  | { available: true; explanation: QuestionExplanation }
  | { available: false; reason: "not_found" };

export interface ExplanationSource {
  lookup(questionId: string): Promise<ExplanationLookupResult>;
}

const localCatalogSource: ExplanationSource = {
  async lookup(questionId) {
    const explanation = questionExplanationCatalog[questionId];
    const hasExplanation =
      Boolean(explanation?.general?.trim()) ||
      Object.values(explanation?.alternatives ?? {}).some(
        (comment) => typeof comment === "string" && Boolean(comment.trim()),
      );

    return explanation?.questionId === questionId && hasExplanation
      ? { available: true, explanation }
      : { available: false, reason: "not_found" };
  },
};

const explanationSources: ExplanationSource[] = [localCatalogSource];

export async function getQuestionExplanation(
  questionId: string,
): Promise<ExplanationLookupResult> {
  for (const source of explanationSources) {
    const result = await source.lookup(questionId);
    if (result.available) {
      return result;
    }
  }

  return { available: false, reason: "not_found" };
}
