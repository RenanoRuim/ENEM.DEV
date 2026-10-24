import type { AnswerAttempt } from "@/types/history";
import type { QuestionProgress } from "@/types/question-progress";

export type DailyGoal = 5 | 10 | 15;

export interface DailyCommitDay {
  date: string;
  questionIds: string[];
  goal: DailyGoal;
}

export interface StudentState {
  attempts: AnswerAttempt[];
  progress: QuestionProgress[];
  xpTotal: number;
  rewardedFirstAttempts: string[];
  rewardedFirstCorrect: string[];
  rewardedDebugCorrect: string[];
  unlockedAchievements: string[];
  dailyGoal: DailyGoal;
  dailyDays: DailyCommitDay[];
}

export interface DailyCommitSummary {
  goal: DailyGoal;
  completed: number;
  percentage: number;
  isComplete: boolean;
  currentStreak: number;
  bestStreak: number;
  days: DailyCommitDay[];
}

export interface LevelSummary {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number | null;
  xpToNextLevel: number;
  progressPercentage: number;
}

export interface ProcessAnswerResult {
  duplicate: boolean;
  isCorrect: boolean;
  gainedXp: number;
  levelBefore: number;
  levelAfter: number;
  newlyUnlockedAchievements: string[];
  dailyCommit: DailyCommitSummary;
}
