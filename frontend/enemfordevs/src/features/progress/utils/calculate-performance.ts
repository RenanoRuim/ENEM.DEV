import type { AnswerAttempt } from "@/types/history";

const areaLabels: Record<string, string> = {
  linguagens: "Linguagens",
  matematica: "Matemática",
  "ciencias-natureza": "Ciências da Natureza",
  "ciencias-humanas": "Ciências Humanas",
};

export interface AreaPerformance {
  code: string | null;
  name: string;
  attempts: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
}

export interface PerformanceSummary {
  totalAttempts: number;
  uniqueQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  byArea: AreaPerformance[];
  lowestPerformingArea: AreaPerformance | null;
}

function calculatePercentage(correctAnswers: number, attempts: number) {
  if (attempts === 0) {
    return 0;
  }

  return Math.round((correctAnswers / attempts) * 1000) / 10;
}

export function calculatePerformance(
  attempts: AnswerAttempt[],
): PerformanceSummary {
  const uniqueQuestionIds = new Set(
    attempts.map((attempt) => attempt.questionId),
  );
  const areaTotals = new Map<
    string | null,
    { attempts: number; correctAnswers: number }
  >();

  for (const attempt of attempts) {
    const area = attempt.discipline;
    const totals = areaTotals.get(area) ?? {
      attempts: 0,
      correctAnswers: 0,
    };

    totals.attempts += 1;
    if (attempt.isCorrect) {
      totals.correctAnswers += 1;
    }
    areaTotals.set(area, totals);
  }

  const byArea = Array.from(areaTotals, ([code, totals]) => ({
    code,
    name:
      code === null
        ? "Área não identificada"
        : (areaLabels[code] ?? code),
    attempts: totals.attempts,
    correctAnswers: totals.correctAnswers,
    incorrectAnswers: totals.attempts - totals.correctAnswers,
    accuracy: calculatePercentage(totals.correctAnswers, totals.attempts),
  })).sort(
    (first, second) =>
      first.accuracy - second.accuracy ||
      second.attempts - first.attempts ||
      first.name.localeCompare(second.name, "pt-BR"),
  );

  const correctAnswers = attempts.filter(
    (attempt) => attempt.isCorrect,
  ).length;

  return {
    totalAttempts: attempts.length,
    uniqueQuestions: uniqueQuestionIds.size,
    correctAnswers,
    incorrectAnswers: attempts.length - correctAnswers,
    accuracy: calculatePercentage(correctAnswers, attempts.length),
    byArea,
    lowestPerformingArea: byArea[0] ?? null,
  };
}
