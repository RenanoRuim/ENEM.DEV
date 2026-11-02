import type {
  DailyCommitDay,
  DailyCommitSummary,
  DailyGoal,
} from "@/types/student-state";

function addDays(date: string, amount: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(year, month - 1, day + amount);
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, "0")}-${String(result.getDate()).padStart(2, "0")}`;
}

export function getLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function calculateDailyCommit(
  goal: DailyGoal,
  days: DailyCommitDay[],
  now = new Date(),
): DailyCommitSummary {
  const today = getLocalDateKey(now);
  const todayRecord = days.find((day) => day.date === today);
  const effectiveGoal = todayRecord?.goal ?? goal;
  const completed = todayRecord?.questionIds.length ?? 0;
  const completedDates = new Set(
    days.filter((day) => day.questionIds.length >= day.goal).map((day) => day.date),
  );

  let currentStreak = 0;
  let streakDate = completedDates.has(today) ? today : addDays(today, -1);
  while (completedDates.has(streakDate)) {
    currentStreak += 1;
    streakDate = addDays(streakDate, -1);
  }

  let bestStreak = 0;
  let runningStreak = 0;
  const sortedDates = Array.from(completedDates).sort();
  let previousDate: string | null = null;

  for (const date of sortedDates) {
    runningStreak =
      previousDate !== null && addDays(previousDate, 1) === date
        ? runningStreak + 1
        : 1;
    bestStreak = Math.max(bestStreak, runningStreak);
    previousDate = date;
  }

  return {
    goal: effectiveGoal,
    completed,
    percentage: Math.min(100, Math.floor((completed / effectiveGoal) * 100)),
    isComplete: completed >= effectiveGoal,
    currentStreak,
    bestStreak,
    days: [...days].sort((first, second) =>
      second.date.localeCompare(first.date),
    ),
  };
}
