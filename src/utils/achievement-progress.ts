import { ACHIEVEMENTS, getLevelSummary } from "@/constants/gamification";
import { calculateDailyCommit } from "@/utils/daily-commit";
import { getQuestionId } from "@/utils/question-identity";
import type { AnswerAttempt } from "@/types/history";
import type { StudentState } from "@/types/student-state";

const ENEM_AREAS = [
  "ciencias-humanas",
  "ciencias-natureza",
  "linguagens",
  "matematica",
] as const;
const ENEM_AREA_SET = new Set<string>(ENEM_AREAS);

export interface AchievementProgress {
  current: number;
  target: number;
  completed: boolean;
  detail?: string;
}

function getAttemptIdentity(attempt: AnswerAttempt) {
  return getQuestionId(
    attempt.year,
    attempt.questionNumber,
    attempt.language ?? null,
  );
}

function isEnemArea(
  area: string | null,
): area is (typeof ENEM_AREAS)[number] {
  return area !== null && ENEM_AREA_SET.has(area);
}

function getReviewMilestones(attempts: AnswerAttempt[]) {
  const pending = new Set<string>();
  const corrected = new Set<string>();
  let maximumPending = 0;
  let clearedAfterFive = false;

  const orderedAttempts = attempts
    .map((attempt, index) => ({ attempt, index }))
    .sort(
      (first, second) =>
        first.attempt.answeredAt.localeCompare(second.attempt.answeredAt) ||
        first.index - second.index,
    );

  for (const { attempt } of orderedAttempts) {
    const questionId = getAttemptIdentity(attempt);
    const wasPending = pending.has(questionId);

    if (attempt.isCorrect) {
      pending.delete(questionId);
      if (attempt.mode === "debug" && wasPending) {
        corrected.add(questionId);
        if (maximumPending >= 5 && pending.size === 0) {
          clearedAfterFive = true;
        }
      }
    } else {
      pending.add(questionId);
    }

    maximumPending = Math.max(maximumPending, pending.size);
  }

  return {
    correctedCount: corrected.size,
    maximumPending,
    pendingCount: pending.size,
    clearedAfterFive,
  };
}

export function calculateAchievementProgress(
  state: StudentState,
): Record<string, AchievementProgress> {
  const uniqueQuestionIds = new Set(state.attempts.map(getAttemptIdentity));
  const correctlyCompletedIds = new Set(
    state.attempts
      .filter((attempt) => attempt.isCorrect)
      .map(getAttemptIdentity),
  );
  const answeredAreas = new Set(
    state.attempts
      .map((attempt) => attempt.discipline)
      .filter(isEnemArea),
  );
  const correctByArea = new Map<
    (typeof ENEM_AREAS)[number],
    Set<string>
  >(ENEM_AREAS.map((area) => [area, new Set<string>()]));

  for (const attempt of state.attempts) {
    if (attempt.isCorrect && isEnemArea(attempt.discipline)) {
      correctByArea.get(attempt.discipline)?.add(getAttemptIdentity(attempt));
    }
  }

  const dailyCommit = calculateDailyCommit(state.dailyGoal, state.dailyDays);
  const review = getReviewMilestones(state.attempts);
  const level = getLevelSummary(state.xpTotal).level;
  const correctAreaCounts = ENEM_AREAS.map(
    (area) => correctByArea.get(area)?.size ?? 0,
  );
  const fullStackProgress = correctAreaCounts.reduce(
    (total, count) => total + Math.min(count, 5),
    0,
  );
  const fullStackDetail = ENEM_AREAS.map((area, index) => {
    const areaLabel = {
      "ciencias-humanas": "Humanas",
      "ciencias-natureza": "Natureza",
      linguagens: "Linguagens",
      matematica: "Matemática",
    }[area];
    return `${areaLabel} ${Math.min(correctAreaCounts[index], 5)}/5`;
  }).join(" · ");
  const cleanCodeComplete = review.clearedAfterFive;
  const cleanCodeProgress =
    review.maximumPending >= 5
      ? {
          current: cleanCodeComplete ? 1 : 0,
          target: 1,
          completed: cleanCodeComplete,
          detail: cleanCodeComplete
            ? "Fila zerada após pelo menos 5 pendências"
            : `Fila atual: ${review.pendingCount} · já acumulou 5 pendências`,
        }
      : {
          current: review.maximumPending,
          target: 5,
          completed: false,
          detail: `Maior fila: ${review.maximumPending}/5`,
        };

  const progress: Record<string, AchievementProgress> = {
    "first-step": {
      current: Math.min(state.attempts.length, 1),
      target: 1,
      completed: state.attempts.length > 0,
    },
    "first-correct": {
      current: Math.min(correctlyCompletedIds.size, 1),
      target: 1,
      completed: correctlyCompletedIds.size > 0,
    },
    "warm-up": {
      current: Math.min(uniqueQuestionIds.size, 5),
      target: 5,
      completed: uniqueQuestionIds.size >= 5,
    },
    "ten-questions": {
      current: Math.min(uniqueQuestionIds.size, 10),
      target: 10,
      completed: uniqueQuestionIds.size >= 10,
    },
    "focus-total": {
      current: Math.min(uniqueQuestionIds.size, 25),
      target: 25,
      completed: uniqueQuestionIds.size >= 25,
    },
    marathoner: {
      current: Math.min(uniqueQuestionIds.size, 50),
      target: 50,
      completed: uniqueQuestionIds.size >= 50,
    },
    "study-machine": {
      current: Math.min(uniqueQuestionIds.size, 100),
      target: 100,
      completed: uniqueQuestionIds.size >= 100,
    },
    tireless: {
      current: Math.min(uniqueQuestionIds.size, 250),
      target: 250,
      completed: uniqueQuestionIds.size >= 250,
    },
    "sharp-mind": {
      current: Math.min(correctlyCompletedIds.size, 10),
      target: 10,
      completed: correctlyCompletedIds.size >= 10,
    },
    specialist: {
      current: Math.min(correctlyCompletedIds.size, 25),
      target: 25,
      completed: correctlyCompletedIds.size >= 25,
    },
    "master-of-knowledge": {
      current: Math.min(correctlyCompletedIds.size, 50),
      target: 50,
      completed: correctlyCompletedIds.size >= 50,
    },
    reviewer: {
      current: Math.min(review.correctedCount, 1),
      target: 1,
      completed: review.correctedCount >= 1,
    },
    "bug-hunter": {
      current: Math.min(review.correctedCount, 5),
      target: 5,
      completed: review.correctedCount >= 5,
    },
    "experienced-debugger": {
      current: Math.min(review.correctedCount, 20),
      target: 20,
      completed: review.correctedCount >= 20,
    },
    "clean-code": cleanCodeProgress,
    "first-commit": {
      current: Math.min(dailyCommit.bestStreak, 1),
      target: 1,
      completed: dailyCommit.bestStreak >= 1,
    },
    "commit-triple": {
      current: Math.min(dailyCommit.bestStreak, 3),
      target: 3,
      completed: dailyCommit.bestStreak >= 3,
    },
    "study-week": {
      current: Math.min(dailyCommit.bestStreak, 7),
      target: 7,
      completed: dailyCommit.bestStreak >= 7,
    },
    "stable-branch": {
      current: Math.min(dailyCommit.bestStreak, 14),
      target: 14,
      completed: dailyCommit.bestStreak >= 14,
    },
    "continuous-deploy": {
      current: Math.min(dailyCommit.bestStreak, 30),
      target: 30,
      completed: dailyCommit.bestStreak >= 30,
    },
    explorer: {
      current: answeredAreas.size,
      target: ENEM_AREAS.length,
      completed: answeredAreas.size === ENEM_AREAS.length,
    },
    "full-stack": {
      current: fullStackProgress,
      target: ENEM_AREAS.length * 5,
      completed: correctAreaCounts.every((count) => count >= 5),
      detail: fullStackDetail,
    },
    "first-upgrade": {
      current: Math.min(level, 2),
      target: 2,
      completed: level >= 2,
    },
    "optimized-build": {
      current: Math.min(level, 5),
      target: 5,
      completed: level >= 5,
    },
    "version-10": {
      current: Math.min(level, 10),
      target: 10,
      completed: level >= 10,
    },
  };

  return Object.fromEntries(
    ACHIEVEMENTS.map((achievement) => [
      achievement.id,
      progress[achievement.id],
    ]),
  );
}

export function getEligibleAchievementIds(state: StudentState) {
  const progress = calculateAchievementProgress(state);
  return ACHIEVEMENTS.filter(
    (achievement) => progress[achievement.id].completed,
  ).map((achievement) => achievement.id);
}
