import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEFAULT_DAILY_GOAL,
  XP_REWARDS,
  getLevelSummary,
} from "@/constants/gamification";
import { calculateDailyCommit, getLocalDateKey } from "@/utils/daily-commit";
import { getEligibleAchievementIds } from "@/utils/achievement-progress";
import { getQuestionId } from "@/utils/question-identity";
import type { AnswerAttempt } from "@/types/history";
import type { QuestionProgress } from "@/types/question-progress";
import type {
  DailyCommitDay,
  DailyCommitSummary,
  DailyGoal,
  ProcessAnswerResult,
  StudentState,
} from "@/types/student-state";

const STATE_STORAGE_KEY = "enemfordevs:student-state:v1";
const LEGACY_HISTORY_KEY = "enemfordevs:answer-history:v1";
const LEGACY_PROGRESS_KEY = "enemfordevs:question-progress:v1";

let operationQueue: Promise<void> = Promise.resolve();

function emptyStudentState(): StudentState {
  return {
    attempts: [],
    progress: [],
    xpTotal: 0,
    rewardedFirstAttempts: [],
    rewardedFirstCorrect: [],
    rewardedDebugCorrect: [],
    unlockedAchievements: [],
    dailyGoal: DEFAULT_DAILY_GOAL,
    dailyDays: [],
  };
}

function isDailyGoal(value: unknown): value is DailyGoal {
  return value === 5 || value === 10 || value === 15;
}

function isAnswerAttempt(value: unknown): value is AnswerAttempt {
  if (!value || typeof value !== "object") {
    return false;
  }

  const attempt = value as Record<string, unknown>;
  return (
    typeof attempt.id === "string" &&
    typeof attempt.questionId === "string" &&
    typeof attempt.year === "number" &&
    typeof attempt.questionNumber === "number" &&
    (attempt.language === undefined ||
      attempt.language === null ||
      typeof attempt.language === "string") &&
    (attempt.mode === undefined ||
      attempt.mode === "study" ||
      attempt.mode === "debug") &&
    (attempt.discipline === null || typeof attempt.discipline === "string") &&
    ["A", "B", "C", "D", "E"].includes(
      String(attempt.selectedAlternative),
    ) &&
    ["A", "B", "C", "D", "E"].includes(
      String(attempt.correctAlternative),
    ) &&
    typeof attempt.isCorrect === "boolean" &&
    typeof attempt.answeredAt === "string"
  );
}

function isQuestionProgress(value: unknown): value is QuestionProgress {
  if (!value || typeof value !== "object") {
    return false;
  }

  const progress = value as Record<string, unknown>;
  return (
    typeof progress.questionId === "string" &&
    typeof progress.year === "number" &&
    typeof progress.questionNumber === "number" &&
    (progress.language === null || typeof progress.language === "string") &&
    (progress.discipline === null || typeof progress.discipline === "string") &&
    ["unseen", "needs_review", "completed"].includes(
      String(progress.status),
    ) &&
    typeof progress.updatedAt === "string"
  );
}

function isDailyCommitDay(value: unknown): value is DailyCommitDay {
  if (!value || typeof value !== "object") {
    return false;
  }

  const day = value as Record<string, unknown>;
  return (
    typeof day.date === "string" &&
    Array.isArray(day.questionIds) &&
    day.questionIds.every((id) => typeof id === "string") &&
    isDailyGoal(day.goal)
  );
}

function isStudentState(value: unknown): value is StudentState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Record<string, unknown>;
  return (
    Array.isArray(state.attempts) &&
    state.attempts.every(isAnswerAttempt) &&
    Array.isArray(state.progress) &&
    state.progress.every(isQuestionProgress) &&
    typeof state.xpTotal === "number" &&
    Array.isArray(state.rewardedFirstAttempts) &&
    Array.isArray(state.rewardedFirstCorrect) &&
    Array.isArray(state.rewardedDebugCorrect) &&
    Array.isArray(state.unlockedAchievements) &&
    isDailyGoal(state.dailyGoal) &&
    Array.isArray(state.dailyDays) &&
    state.dailyDays.every(isDailyCommitDay)
  );
}

async function readLegacyArray<T>(
  key: string,
  validator: (value: unknown) => value is T,
  label: string,
): Promise<T[]> {
  const storedValue = await AsyncStorage.getItem(key);
  if (storedValue === null) {
    return [];
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    throw new Error(`${label} salvo não contém JSON válido.`);
  }
  if (!Array.isArray(parsedValue) || !parsedValue.every(validator)) {
    throw new Error(`${label} salvo não tem o formato esperado.`);
  }
  return parsedValue;
}

function buildProgressFromHistory(
  attempts: AnswerAttempt[],
  existingProgress: QuestionProgress[],
): QuestionProgress[] {
  const progressById = new Map(
    existingProgress.map((item) => [item.questionId, item]),
  );

  for (const attempt of [...attempts].sort((a, b) =>
    a.answeredAt.localeCompare(b.answeredAt),
  )) {
    if (attempt.discipline === "linguagens" && !attempt.language) {
      continue;
    }

    const questionId = getQuestionId(
      attempt.year,
      attempt.questionNumber,
      attempt.language ?? null,
    );
    const previous = progressById.get(questionId);
    if (previous && attempt.answeredAt < previous.updatedAt) {
      continue;
    }

    progressById.set(questionId, {
      questionId,
      year: attempt.year,
      questionNumber: attempt.questionNumber,
      language: attempt.language ?? null,
      discipline: attempt.discipline,
      status: attempt.isCorrect ? "completed" : "needs_review",
      updatedAt: attempt.answeredAt,
    });
  }

  return Array.from(progressById.values());
}

function mergeEligibleAchievements(state: StudentState): StudentState {
  const unlockedAchievements = Array.from(
    new Set([
      ...state.unlockedAchievements,
      ...getEligibleAchievementIds(state),
    ]),
  );
  return { ...state, unlockedAchievements };
}

function rebuildRewardsAndDaily(state: StudentState): StudentState {
  const firstAttempts = new Set<string>();
  const firstCorrect = new Set<string>();
  const debugCorrect = new Set<string>();
  const statusByQuestionId = new Map<string, QuestionProgress["status"]>();
  const days = new Map<string, DailyCommitDay>();
  let xpTotal = 0;

  for (const attempt of [...state.attempts].sort((a, b) =>
    a.answeredAt.localeCompare(b.answeredAt),
  )) {
    const questionId = attempt.questionId;
    if (!firstAttempts.has(questionId)) {
      firstAttempts.add(questionId);
      xpTotal += XP_REWARDS.firstAttempt;
    }
    if (attempt.isCorrect && !firstCorrect.has(questionId)) {
      firstCorrect.add(questionId);
      xpTotal += XP_REWARDS.firstCorrect;
    }
    if (
      attempt.mode === "debug" &&
      attempt.isCorrect &&
      statusByQuestionId.get(questionId) === "needs_review" &&
      !debugCorrect.has(questionId)
    ) {
      debugCorrect.add(questionId);
      xpTotal += XP_REWARDS.firstDebugCorrect;
    }
    statusByQuestionId.set(
      questionId,
      attempt.isCorrect ? "completed" : "needs_review",
    );

    const date = getLocalDateKey(new Date(attempt.answeredAt));
    const day = days.get(date) ?? {
      date,
      questionIds: [],
      goal: state.dailyGoal,
    };
    if (!day.questionIds.includes(questionId)) {
      day.questionIds.push(questionId);
    }
    days.set(date, day);
  }

  const dailyDays = Array.from(days.values());
  const nextState = {
    ...state,
    progress: buildProgressFromHistory(state.attempts, state.progress),
    xpTotal,
    rewardedFirstAttempts: Array.from(firstAttempts),
    rewardedFirstCorrect: Array.from(firstCorrect),
    rewardedDebugCorrect: Array.from(debugCorrect),
    dailyDays,
  };
  return mergeEligibleAchievements(nextState);
}

async function loadOrMigrateState(): Promise<StudentState> {
  const storedState = await AsyncStorage.getItem(STATE_STORAGE_KEY);
  if (storedState !== null) {
    let parsedState: unknown;
    try {
      parsedState = JSON.parse(storedState);
    } catch {
      throw new Error("Os dados de estudo salvos não contêm JSON válido.");
    }
    if (!isStudentState(parsedState)) {
      throw new Error("Os dados de estudo salvos têm formato inválido.");
    }
    const reconciledState = mergeEligibleAchievements(parsedState);
    if (
      reconciledState.unlockedAchievements.some(
        (id, index) => id !== parsedState.unlockedAchievements[index],
      ) ||
      reconciledState.unlockedAchievements.length !==
        parsedState.unlockedAchievements.length
    ) {
      await AsyncStorage.setItem(
        STATE_STORAGE_KEY,
        JSON.stringify(reconciledState),
      );
    }
    return reconciledState;
  }

  const [attempts, progress] = await Promise.all([
    readLegacyArray(LEGACY_HISTORY_KEY, isAnswerAttempt, "Histórico"),
    readLegacyArray(
      LEGACY_PROGRESS_KEY,
      isQuestionProgress,
      "Progresso",
    ),
  ]);
  const initialState = rebuildRewardsAndDaily({
    ...emptyStudentState(),
    attempts,
    progress,
  });
  await AsyncStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(initialState));
  return initialState;
}

function queueOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation);
  operationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function getStudentState(): Promise<StudentState> {
  return queueOperation(loadOrMigrateState);
}

export function getDailyCommitSummary(
  state: StudentState,
): DailyCommitSummary {
  return calculateDailyCommit(state.dailyGoal, state.dailyDays);
}

export function setDailyGoal(goal: DailyGoal): Promise<StudentState> {
  return queueOperation(async () => {
    const state = await loadOrMigrateState();
    const updatedState = { ...state, dailyGoal: goal };
    await AsyncStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(updatedState));
    return updatedState;
  });
}

export function saveProgressRecord(
  progress: QuestionProgress,
): Promise<StudentState> {
  return queueOperation(async () => {
    const state = await loadOrMigrateState();
    const updatedState = {
      ...state,
      progress: [
        ...state.progress.filter(
          (item) => item.questionId !== progress.questionId,
        ),
        progress,
      ],
    };
    await AsyncStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(updatedState));
    return updatedState;
  });
}

export function processStudentAnswer(
  attempt: AnswerAttempt,
): Promise<ProcessAnswerResult> {
  return queueOperation(async () => {
    const state = await loadOrMigrateState();
    const currentLevel = getLevelSummary(state.xpTotal).level;

    if (state.attempts.some((saved) => saved.id === attempt.id)) {
      return {
        duplicate: true,
        isCorrect: attempt.isCorrect,
        gainedXp: 0,
        levelBefore: currentLevel,
        levelAfter: currentLevel,
        newlyUnlockedAchievements: [],
        dailyCommit: getDailyCommitSummary(state),
      };
    }

    const earnedFirstAttempt = !state.rewardedFirstAttempts.includes(
      attempt.questionId,
    );
    const earnedFirstCorrect =
      attempt.isCorrect &&
      !state.rewardedFirstCorrect.includes(attempt.questionId);
    const priorProgress = state.progress.find(
      (item) => item.questionId === attempt.questionId,
    );
    const earnedDebugCorrect =
      attempt.mode === "debug" &&
      attempt.isCorrect &&
      priorProgress?.status === "needs_review" &&
      !state.rewardedDebugCorrect.includes(attempt.questionId);

    const gainedXp =
      (earnedFirstAttempt ? XP_REWARDS.firstAttempt : 0) +
      (earnedFirstCorrect ? XP_REWARDS.firstCorrect : 0) +
      (earnedDebugCorrect ? XP_REWARDS.firstDebugCorrect : 0);

    const status = attempt.isCorrect ? "completed" : "needs_review";
    const nextProgress: QuestionProgress = {
      questionId: attempt.questionId,
      year: attempt.year,
      questionNumber: attempt.questionNumber,
      language: attempt.language ?? null,
      discipline: attempt.discipline,
      status,
      updatedAt: attempt.answeredAt,
    };
    const date = getLocalDateKey(new Date(attempt.answeredAt));
    const existingDay = state.dailyDays.find((day) => day.date === date);
    const day: DailyCommitDay = existingDay
      ? {
          ...existingDay,
          questionIds: existingDay.questionIds.includes(attempt.questionId)
            ? existingDay.questionIds
            : [...existingDay.questionIds, attempt.questionId],
        }
      : {
          date,
          questionIds: [attempt.questionId],
          goal: state.dailyGoal,
        };
    const dailyDays = [
      ...state.dailyDays.filter((item) => item.date !== date),
      day,
    ];

    const updatedState: StudentState = {
      ...state,
      attempts: [...state.attempts, attempt],
      progress: [
        ...state.progress.filter(
          (item) => item.questionId !== attempt.questionId,
        ),
        nextProgress,
      ],
      xpTotal: state.xpTotal + gainedXp,
      rewardedFirstAttempts: earnedFirstAttempt
        ? [...state.rewardedFirstAttempts, attempt.questionId]
        : state.rewardedFirstAttempts,
      rewardedFirstCorrect: earnedFirstCorrect
        ? [...state.rewardedFirstCorrect, attempt.questionId]
        : state.rewardedFirstCorrect,
      rewardedDebugCorrect: earnedDebugCorrect
        ? [...state.rewardedDebugCorrect, attempt.questionId]
        : state.rewardedDebugCorrect,
      dailyDays,
    };

    const dailyCommit = getDailyCommitSummary(updatedState);
    const unlocked = Array.from(
      new Set([
        ...state.unlockedAchievements,
        ...getEligibleAchievementIds(updatedState),
      ]),
    );
    const newlyUnlockedAchievements = unlocked.filter(
      (id) => !state.unlockedAchievements.includes(id),
    );
    updatedState.unlockedAchievements = unlocked;

    await AsyncStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(updatedState));
    return {
      duplicate: false,
      isCorrect: attempt.isCorrect,
      gainedXp,
      levelBefore: currentLevel,
      levelAfter: getLevelSummary(updatedState.xpTotal).level,
      newlyUnlockedAchievements,
      dailyCommit,
    };
  });
}
