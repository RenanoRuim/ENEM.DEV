import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  Activity,
  BookOpenCheck,
  Brain,
  Bug,
  BugPlay,
  CalendarDays,
  CheckCircle2,
  Code2,
  Compass,
  Cpu,
  Crown,
  Flame,
  Footprints,
  GitBranch,
  GitCommitHorizontal,
  Infinity as InfinityIcon,
  Layers,
  ListChecks,
  Medal,
  Rocket,
  ShieldCheck,
  Star,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppHeader } from "@/components/app-header";
import { FilterOptionGroup } from "@/components/filter-option-group";
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENTS,
  DAILY_GOALS,
  LEGACY_ACHIEVEMENTS,
  getLevelSummary,
} from "@/constants/gamification";
import {
  getDailyCommitSummary,
  getStudentState,
  setDailyGoal,
} from "@/services/student-state-storage";
import type { StudentState } from "@/types/student-state";
import { calculatePerformance } from "@/utils/calculate-performance";
import { calculateAchievementProgress } from "@/utils/achievement-progress";
import { getLocalDateKey } from "@/utils/daily-commit";
import { useIsWideLayout } from "@/hooks/use-is-wide-layout";

const colors = {
  background: "#0D1117",
  surface: "#161B22",
  border: "#30363D",
  text: "#E6EDF3",
  muted: "#8B949E",
  green: "#39D353",
  blue: "#58A6FF",
  orange: "#F0883E",
  red: "#F85149",
};

const achievementIcons: Record<string, LucideIcon> = {
  footprints: Footprints,
  "circle-check": CheckCircle2,
  flame: Flame,
  activity: Activity,
  target: Target,
  medal: Medal,
  cpu: Cpu,
  infinity: InfinityIcon,
  brain: Brain,
  "book-check": BookOpenCheck,
  trophy: Trophy,
  bug: Bug,
  "bug-play": BugPlay,
  code: Code2,
  "list-checks": ListChecks,
  "git-commit": GitCommitHorizontal,
  "git-branch": GitBranch,
  "calendar-days": CalendarDays,
  "shield-check": ShieldCheck,
  rocket: Rocket,
  compass: Compass,
  layers: Layers,
  star: Star,
  zap: Zap,
  crown: Crown,
};

function getLastDays(count: number) {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - (count - index - 1),
    );
    return {
      key: getLocalDateKey(date),
      label: date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
    };
  });
}

export default function PerformanceScreen() {
  const isWide = useIsWideLayout();
  const [state, setState] = useState<StudentState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingGoal, setSavingGoal] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setState(await getStudentState());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar seus dados de estudo.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const performance = state ? calculatePerformance(state.attempts) : null;
  const dailyCommit = state ? getDailyCommitSummary(state) : null;
  const level = state ? getLevelSummary(state.xpTotal) : null;
  const achievementProgress = state
    ? calculateAchievementProgress(state)
    : null;
  const unlockedAchievementCount = state
    ? ACHIEVEMENTS.filter((achievement) =>
        state.unlockedAchievements.includes(achievement.id),
      ).length
    : 0;
  const completedQuestions =
    state?.progress.filter((item) => item.status === "completed").length ?? 0;
  const pendingReviews =
    state?.progress.filter((item) => item.status === "needs_review").length ??
    0;
  const lastDays = getLastDays(14);
  const dayByDate = new Map(
    dailyCommit?.days.map((day) => [day.date, day]) ?? [],
  );

  async function handleGoalSelect(value: string) {
    const goal = DAILY_GOALS.find((option) => String(option) === value);
    if (!goal || !state || goal === state.dailyGoal) {
      return;
    }

    setSavingGoal(true);
    setError(null);
    try {
      setState(await setDailyGoal(goal));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar a meta diária.",
      );
    } finally {
      setSavingGoal(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Desempenho" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: isWide ? 30 : 16 },
        ]}
      >
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.green} size="large" />
            <Text style={styles.mutedText}>Carregando seus dados...</Text>
          </View>
        ) : error && !state ? (
          <View style={styles.centerState}>
            <Text style={styles.errorText}>{error}</Text>
            <ActionButton label="Tentar novamente" onPress={() => void refresh()} />
          </View>
        ) : state && performance && dailyCommit && level ? (
          <>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.metricsGrid}>
              <Metric label="TENTATIVAS" value={performance.totalAttempts} />
              <Metric label="ACERTOS" value={performance.correctAnswers} />
              <Metric label="ERROS" value={performance.incorrectAnswers} />
              <Metric
                label="TAXA DE ACERTO"
                value={
                  performance.totalAttempts
                    ? `${performance.accuracy.toLocaleString("pt-BR")}%`
                    : "—"
                }
              />
              <Metric label="CONCLUÍDAS" value={completedQuestions} />
              <Metric label="REVISÕES PENDENTES" value={pendingReviews} />
            </View>

            {!performance.totalAttempts ? (
              <Panel title="Seu desempenho">
                <Text style={styles.mutedText}>
                  Ainda não há tentativas registradas. Responda uma questão
                  para começar a acompanhar seu progresso.
                </Text>
              </Panel>
            ) : performance.totalAttempts < 5 ? (
              <Text style={styles.caveat}>
                Amostra pequena: estes indicadores são descritivos e ainda não
                representam uma avaliação confiável do seu desempenho.
              </Text>
            ) : null}

            <Panel title="Desempenho por área">
              {performance.byArea.length === 0 ? (
                <Text style={styles.mutedText}>
                  Os resultados por área aparecerão após suas primeiras
                  respostas.
                </Text>
              ) : (
                performance.byArea.map((area) => (
                  <View key={area.code ?? "unknown"} style={styles.areaRow}>
                    <View style={styles.areaHeading}>
                      <Text style={styles.areaName}>{area.name}</Text>
                      <Text style={styles.areaPercentage}>
                        {area.accuracy.toLocaleString("pt-BR")}% ·{" "}
                        {area.correctAnswers}/{area.attempts}
                      </Text>
                    </View>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          { width: `${area.accuracy}%` },
                        ]}
                      />
                    </View>
                    {area.attempts < 5 ? (
                      <Text style={styles.sampleNote}>
                        Amostra pequena: {area.attempts}{" "}
                        {area.attempts === 1 ? "tentativa" : "tentativas"}.
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </Panel>

            <Panel title="Daily Commit">
              <Text style={styles.mutedText}>
                Meta diária: uma questão única confirmada conta uma vez no dia,
                mesmo que você tente novamente.
              </Text>
              <FilterOptionGroup
                label="META DIÁRIA"
                options={DAILY_GOALS.map((goal) => ({
                  label: `${goal} questões`,
                  value: String(goal),
                }))}
                selectedValue={String(state.dailyGoal)}
                onSelect={(value) => void handleGoalSelect(value)}
              />
              <Text style={styles.goalText}>
                Meta de hoje: {dailyCommit.completed}/{dailyCommit.goal}
                {dailyCommit.isComplete ? " — concluída!" : ""}
              </Text>
              <View style={styles.track}>
                <View
                  style={[
                    styles.dailyFill,
                    { width: `${dailyCommit.percentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.mutedText}>
                {dailyCommit.percentage}% · sequência atual:{" "}
                {dailyCommit.currentStreak} dias · recorde:{" "}
                {dailyCommit.bestStreak} dias
              </Text>
              {savingGoal ? (
                <Text style={styles.sampleNote}>Salvando a nova meta...</Text>
              ) : (
                <Text style={styles.sampleNote}>
                  A meta de um dia é definida na primeira resposta daquele dia.
                  Se alterar a configuração depois de começar, o novo valor
                  valerá a partir do próximo dia ainda não iniciado.
                </Text>
              )}
              <View style={styles.calendar}>
                {lastDays.map(({ key, label }) => {
                  const day = dayByDate.get(key);
                  const complete = Boolean(
                    day && day.questionIds.length >= day.goal,
                  );
                  return (
                    <View
                      key={key}
                      style={[
                        styles.calendarDay,
                        complete && styles.calendarDayComplete,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarLabel,
                          complete && styles.calendarLabelComplete,
                        ]}
                      >
                        {label}
                      </Text>
                      <Text
                        style={[
                          styles.calendarCount,
                          complete && styles.calendarLabelComplete,
                        ]}
                      >
                        {day ? `${day.questionIds.length}/${day.goal}` : "—"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Panel>

            <Panel
              title={`Conquistas (${unlockedAchievementCount}/${ACHIEVEMENTS.length})`}
            >
              {ACHIEVEMENT_CATEGORIES.map((category) => (
                <View key={category} style={styles.achievementCategory}>
                  <Text style={styles.achievementCategoryTitle}>
                    {category}
                  </Text>
                  {ACHIEVEMENTS.filter(
                    (achievement) => achievement.category === category,
                  ).map((achievement) => {
                    const unlocked = state.unlockedAchievements.includes(
                      achievement.id,
                    );
                    const progress = achievementProgress?.[achievement.id];
                    const Icon = achievementIcons[achievement.icon];
                    return (
                      <View
                        key={achievement.id}
                        style={[
                          styles.achievement,
                          !unlocked && styles.achievementLocked,
                        ]}
                      >
                        <View
                          style={[
                            styles.achievementIcon,
                            unlocked && styles.achievementIconUnlocked,
                          ]}
                        >
                          <Icon
                            color={unlocked ? colors.green : colors.muted}
                            size={16}
                          />
                        </View>
                        <View style={styles.achievementCopy}>
                          <View style={styles.achievementHeading}>
                            <Text
                              style={[
                                styles.achievementName,
                                !unlocked && styles.mutedText,
                              ]}
                            >
                              {achievement.name}
                            </Text>
                            <Text
                              style={[
                                styles.achievementState,
                                unlocked && styles.achievementStateUnlocked,
                              ]}
                            >
                              {unlocked ? "DESBLOQUEADA" : "BLOQUEADA"}
                            </Text>
                          </View>
                          <Text style={styles.achievementDescription}>
                            {achievement.description}
                          </Text>
                          {progress ? (
                            <>
                              <View
                                accessibilityLabel={`Progresso de ${achievement.name}: ${progress.current} de ${progress.target}`}
                                accessibilityRole="progressbar"
                                accessibilityValue={{
                                  min: 0,
                                  max: progress.target,
                                  now: Math.min(
                                    progress.current,
                                    progress.target,
                                  ),
                                }}
                                style={styles.achievementTrack}
                              >
                                <View
                                  style={[
                                    styles.achievementFill,
                                    unlocked && styles.achievementFillUnlocked,
                                    {
                                      width: `${Math.min(
                                        100,
                                        (progress.current / progress.target) *
                                          100,
                                      )}%`,
                                    },
                                  ]}
                                />
                              </View>
                              <Text style={styles.achievementProgressText}>
                                {progress.detail ??
                                  `${progress.current}/${progress.target}`}
                              </Text>
                            </>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
              {LEGACY_ACHIEVEMENTS.some((achievement) =>
                state.unlockedAchievements.includes(achievement.id),
              ) ? (
                <View style={styles.achievementCategory}>
                  <Text style={styles.achievementCategoryTitle}>
                    Conquistas anteriores
                  </Text>
                  {LEGACY_ACHIEVEMENTS.filter((achievement) =>
                    state.unlockedAchievements.includes(achievement.id),
                  ).map((achievement) => (
                    <View key={achievement.id} style={styles.achievement}>
                      <View
                        style={[
                          styles.achievementIcon,
                          styles.achievementIconUnlocked,
                        ]}
                      >
                        <CheckCircle2 color={colors.green} size={16} />
                      </View>
                      <View style={styles.achievementCopy}>
                        <Text style={styles.achievementName}>
                          {achievement.name}
                        </Text>
                        <Text style={styles.achievementDescription}>
                          {achievement.description}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.achievementState,
                          styles.achievementStateUnlocked,
                        ]}
                      >
                        DESBLOQUEADA
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Panel>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      <View style={styles.panelContent}>{children}</View>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.actionButton}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: "100%",
    maxWidth: 1100,
    alignSelf: "center",
    paddingTop: 22,
    paddingBottom: 45,
    gap: 16,
  },
  centerState: {
    flex: 1,
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 145,
    minHeight: 100,
    justifyContent: "center",
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.surface,
    gap: 12,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  metricValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  panel: {
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    gap: 15,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  panelContent: {
    gap: 13,
  },
  mutedText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  errorText: {
    color: colors.red,
    fontSize: 12,
  },
  caveat: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#F0883E66",
    borderRadius: 8,
    color: colors.orange,
    backgroundColor: "#F0883E12",
    fontSize: 11,
    lineHeight: 17,
  },
  areaRow: {
    gap: 7,
  },
  areaHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  areaName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  areaPercentage: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "600",
  },
  track: {
    height: 6,
    overflow: "hidden",
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  fill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.blue,
  },
  dailyFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  sampleNote: {
    color: colors.orange,
    fontSize: 10,
    lineHeight: 15,
  },
  goalText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  calendar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  calendarDay: {
    minWidth: 67,
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 7,
    backgroundColor: colors.background,
    gap: 4,
  },
  calendarDayComplete: {
    borderColor: colors.green,
    backgroundColor: "#39D35318",
  },
  calendarLabel: {
    color: colors.muted,
    fontSize: 9,
  },
  calendarLabelComplete: {
    color: colors.green,
  },
  calendarCount: {
    color: colors.text,
    fontSize: 9,
    fontWeight: "600",
  },
  achievement: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  achievementCategory: {
    gap: 4,
  },
  achievementCategoryTitle: {
    marginTop: 8,
    marginBottom: 2,
    color: colors.blue,
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  achievementLocked: {
    opacity: 0.65,
  },
  achievementIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  achievementIconUnlocked: {
    borderColor: "#39D35366",
    backgroundColor: "#39D35312",
  },
  achievementCopy: {
    flex: 1,
    gap: 3,
  },
  achievementHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  achievementName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  achievementDescription: {
    color: colors.muted,
    fontSize: 10,
  },
  achievementState: {
    color: colors.muted,
    fontSize: 7,
    fontWeight: "700",
  },
  achievementStateUnlocked: {
    color: colors.green,
  },
  achievementTrack: {
    height: 4,
    overflow: "hidden",
    marginTop: 3,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  achievementFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.blue,
  },
  achievementFillUnlocked: {
    backgroundColor: colors.green,
  },
  achievementProgressText: {
    color: colors.muted,
    fontSize: 9,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.green,
  },
  actionButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "700",
  },
});
