import { ArrowRight, Flame, Target, Trophy } from "lucide-react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AppHeader } from "@/components/app-header";
import { getLevelSummary } from "@/constants/gamification";
import { useViewportWidth } from "@/hooks/use-is-wide-layout";
import {
  getDailyCommitSummary,
  getStudentState,
} from "@/services/student-state-storage";
import {
  calculatePerformance,
  type PerformanceSummary,
} from "@/utils/calculate-performance";
import type { StudentState } from "@/types/student-state";

const colors = {
  background: "#0D1117",
  surface: "#161B22",
  border: "#30363D",
  text: "#E6EDF3",
  muted: "#8B949E",
  green: "#39D353",
  blue: "#58A6FF",
  orange: "#F0883E",
};

export default function DashboardScreen() {
  const router = useRouter();
  const width = useViewportWidth();
  const reduceMotion = useReducedMotion();
  const isWide = width >= 900;
  const [performance, setPerformance] = useState<PerformanceSummary | null>(
    null,
  );
  const [studentState, setStudentState] = useState<StudentState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isFocusedRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const metricWidth: `${number}%` = isWide
    ? "23.6%"
    : width < 360
      ? "100%"
      : "48%";

  const loadPerformance = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    setPerformance(null);

    try {
      const state = await getStudentState();
      if (isFocusedRef.current && requestId === loadRequestIdRef.current) {
        setStudentState(state);
        setPerformance(calculatePerformance(state.attempts));
      }
    } catch (error) {
      if (isFocusedRef.current && requestId === loadRequestIdRef.current) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Ocorreu um erro inesperado ao ler seu histórico.",
        );
      }
    } finally {
      if (isFocusedRef.current && requestId === loadRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      void loadPerformance();
      return () => {
        isFocusedRef.current = false;
        loadRequestIdRef.current += 1;
      };
    }, [loadPerformance]),
  );

  const hasAttempts = (performance?.totalAttempts ?? 0) > 0;
  const weakestArea = performance?.lowestPerformingArea;
  const level = studentState ? getLevelSummary(studentState.xpTotal) : null;
  const dailyCommit = studentState ? getDailyCommitSummary(studentState) : null;
  const uniqueCompleted =
    studentState?.progress.filter((item) => item.status === "completed")
      .length ?? 0;
  const reviewsPending =
    studentState?.progress.filter((item) => item.status === "needs_review")
      .length ?? 0;

  return (
    <View style={styles.screen}>
      <AppHeader title="Dashboard" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !isWide && styles.mobileScrollContent,
        ]}
      >
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(220)}
          style={styles.welcomeRow}
        >
          <View style={styles.welcomeCopy}>
            <View style={styles.eyebrow}>
              <View style={styles.statusDot} />
              <TextLabel style={styles.eyebrowText}>
                SEU ESPAÇO DE ESTUDOS
              </TextLabel>
            </View>
            <TextLabel style={styles.greeting}>
              Olá, meu dev estudante 👋
            </TextLabel>
            <TextLabel style={styles.intro}>
              Um passo de cada vez. Sua próxima conquista começa agora.
            </TextLabel>
          </View>
          <View style={styles.sessionCard}>
            <View style={styles.sessionCopy}>
              <TextLabel style={styles.sessionKicker}>
                PRONTO PARA HOJE?
              </TextLabel>
              <TextLabel style={styles.sessionTitle}>
                Seu próximo passo
              </TextLabel>
              <TextLabel style={styles.sessionDescription}>
                Continue evoluindo no seu ritmo.
              </TextLabel>
            </View>
            <Link href="/questions" asChild>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.sessionButton,
                  pressed && styles.pressed,
                  pressed && !reduceMotion && styles.pressedScale,
                ]}
              >
                <TextLabel style={styles.sessionButtonText}>
                  Iniciar estudos
                </TextLabel>
                <ArrowRight color={colors.text} size={16} />
              </Pressable>
            </Link>
          </View>
        </Animated.View>

        {isLoading && (
          <TextLabel style={styles.statusMessage}>
            Carregando estatísticas do seu histórico...
          </TextLabel>
        )}
        {loadError && (
          <View style={styles.errorMessage}>
            <TextLabel style={styles.errorText}>
              Não foi possível carregar o histórico: {loadError}
            </TextLabel>
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadPerformance()}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
            >
              <TextLabel style={styles.retryButtonText}>
                Tentar novamente
              </TextLabel>
            </Pressable>
          </View>
        )}

        <Animated.View
          entering={
            reduceMotion ? undefined : FadeInDown.delay(40).duration(220)
          }
          style={styles.gamificationRow}
        >
          <View style={styles.levelCard}>
            <View style={styles.levelTopline}>
              <TextLabel style={styles.levelKicker}>NÍVEL ATUAL</TextLabel>
              <TextLabel style={styles.levelNumber}>
                {level ? `LVL ${level.level}` : "..."}
              </TextLabel>
            </View>
            {studentState ? (
              <AnimatedXpValue value={studentState.xpTotal} />
            ) : (
              <TextLabel style={styles.xpTotal}>... XP</TextLabel>
            )}
            <View style={styles.levelTrack}>
              <AnimatedProgressFill
                progress={level?.progressPercentage ?? 0}
                fillStyle={styles.levelFill}
              />
            </View>
            <TextLabel style={styles.levelHelper}>
              {level?.nextLevelXp
                ? `${level.xpToNextLevel} XP para o nível ${level.level + 1}`
                : "Nível máximo da progressão atual"}
            </TextLabel>
          </View>
          <View
            style={[
              styles.dailyCard,
              dailyCommit?.isComplete && styles.dailyCardComplete,
            ]}
          >
            <View style={styles.levelTopline}>
              <TextLabel style={styles.levelKicker}>DAILY COMMIT</TextLabel>
              <TextLabel style={styles.streakValue}>
                {dailyCommit?.currentStreak ?? 0} dias seguidos
              </TextLabel>
            </View>
            <TextLabel style={styles.dailyValue}>
              {dailyCommit
                ? `${dailyCommit.completed}/${dailyCommit.goal}`
                : "..."}
              {dailyCommit?.isComplete ? "  ✓" : ""}
            </TextLabel>
            <View style={styles.levelTrack}>
              <AnimatedProgressFill
                progress={dailyCommit?.percentage ?? 0}
                fillStyle={styles.dailyFill}
              />
            </View>
            <TextLabel style={styles.levelHelper}>
              {dailyCommit?.isComplete
                ? "Meta de hoje concluída!"
                : "Questões únicas confirmadas hoje"}
            </TextLabel>
          </View>
        </Animated.View>

        <Animated.View
          entering={
            reduceMotion ? undefined : FadeInDown.delay(80).duration(220)
          }
          style={styles.metricsGrid}
        >
          <MetricCard
            width={metricWidth}
            icon={<Target color={colors.blue} size={17} />}
            iconStyle={styles.blueIcon}
            label="TENTATIVAS"
            value={
              performance
                ? String(performance.totalAttempts)
                : isLoading
                  ? "..."
                  : "—"
            }
            helper={
              performance
                ? `${uniqueCompleted} concluídas · ${reviewsPending} para revisar`
                : isLoading
                  ? "Lendo o histórico..."
                  : "Histórico indisponível"
            }
          />
          <MetricCard
            width={metricWidth}
            icon={<Trophy color={colors.green} size={17} />}
            iconStyle={styles.greenIcon}
            label="ACERTOS"
            value={
              performance
                ? String(performance.correctAnswers)
                : isLoading
                  ? "..."
                  : "—"
            }
            helper={
              performance
                ? "respostas corretas"
                : isLoading
                  ? "Lendo o histórico..."
                  : "Histórico indisponível"
            }
          />
          <MetricCard
            width={metricWidth}
            icon={<Flame color={colors.orange} size={17} />}
            iconStyle={styles.orangeIcon}
            label="ERROS"
            value={
              performance
                ? String(performance.incorrectAnswers)
                : isLoading
                  ? "..."
                  : "—"
            }
            helper={
              performance
                ? "respostas incorretas"
                : isLoading
                  ? "Lendo o histórico..."
                  : "Histórico indisponível"
            }
          />
          <MetricCard
            width={metricWidth}
            icon={<Trophy color={colors.green} size={17} />}
            iconStyle={styles.greenIcon}
            label="TAXA DE ACERTOS"
            value={
              !performance || !hasAttempts
                ? isLoading
                  ? "..."
                  : "—"
                : `${performance.accuracy.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}%`
            }
            helper="considera todas as tentativas"
          />
        </Animated.View>

        <Animated.View
          entering={
            reduceMotion ? undefined : FadeInDown.delay(120).duration(220)
          }
          style={[styles.contentGrid, isWide && styles.contentGridWide]}
        >
          <View
            style={[
              styles.panel,
              styles.progressPanel,
              isWide && styles.progressPanelWide,
            ]}
          >
            <View style={styles.panelHeader}>
              <View>
                <TextLabel style={styles.panelTitle}>
                  Progresso por matéria
                </TextLabel>
                <TextLabel style={styles.panelSubtitle}>
                  Acertos por tentativa em cada área
                </TextLabel>
              </View>
              <TextLabel style={styles.panelMeta}>DADOS REAIS</TextLabel>
            </View>
            <View style={styles.subjectList}>
              {!isLoading && !loadError && !hasAttempts && (
                <TextLabel style={styles.emptyMessage}>
                  Seu desempenho por área aparecerá aqui depois que você
                  responder e confirmar questões.
                </TextLabel>
              )}
              {performance?.byArea.map((area) => (
                <View key={area.code ?? "unknown"} style={styles.subjectItem}>
                  <View style={styles.subjectTopline}>
                    <TextLabel style={styles.subjectName}>
                      {area.name}
                    </TextLabel>
                    <TextLabel style={styles.subjectScore}>
                      {area.accuracy.toLocaleString("pt-BR", {
                        maximumFractionDigits: 1,
                      })}
                      %
                    </TextLabel>
                  </View>
                  <View style={styles.subjectTrack}>
                    <AnimatedProgressFill
                      progress={area.accuracy}
                      fillStyle={[
                        styles.subjectFill,
                        { backgroundColor: colors.blue },
                      ]}
                    />
                  </View>
                  <TextLabel style={styles.subjectDetail}>
                    {area.correctAnswers} acertos de {area.attempts} tentativas
                    {area.attempts < 5 ? " · amostra pequena" : ""}
                  </TextLabel>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.panel, styles.recommendationPanel]}>
            <View style={styles.recommendationTopline}>
              <View style={styles.recommendationBadge}>
                <TextLabel style={styles.recommendationBadgeText}>
                  MENOR TAXA DE ACERTO
                </TextLabel>
              </View>
              <View style={styles.suggestionDot} />
            </View>
            <TextLabel style={styles.recommendationTitle}>
              {isLoading
                ? "Carregando..."
                : loadError
                  ? "Histórico indisponível"
                  : (weakestArea?.name ?? "Ainda sem dados")}
            </TextLabel>
            <TextLabel style={styles.recommendationDescription}>
              {isLoading
                ? "Buscando seu histórico de respostas."
                : loadError
                  ? "Não foi possível calcular seu desempenho agora."
                  : weakestArea
                    ? `${weakestArea.accuracy.toLocaleString("pt-BR", {
                        maximumFractionDigits: 1,
                      })}% de acerto em ${weakestArea.attempts} ${
                        weakestArea.attempts === 1 ? "tentativa" : "tentativas"
                      }.`
                    : "Responda questões para descobrir seu desempenho por área."}
            </TextLabel>
            <View style={styles.recommendationDivider} />
            <TextLabel style={styles.recommendationNote}>
              {weakestArea && weakestArea.attempts < 5
                ? `Amostra pequena: apenas ${weakestArea.attempts} ${
                    weakestArea.attempts === 1 ? "tentativa" : "tentativas"
                  }; este dado ainda não indica uma tendência confiável.`
                : "Comparação baseada na taxa de acerto por tentativa. Em caso de empate, a área com mais respostas aparece primeiro."}
            </TextLabel>
            <Link href="/questions" asChild>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.recommendationLink,
                  pressed && styles.pressed,
                  pressed && !reduceMotion && styles.pressedScale,
                ]}
              >
                <TextLabel style={styles.recommendationLinkText}>
                  {weakestArea ? "Praticar questões" : "Começar a responder"}
                </TextLabel>
                <ArrowRight color={colors.blue} size={15} />
              </Pressable>
            </Link>
            <Link href="/performance" asChild>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.recommendationLink,
                  pressed && styles.pressed,
                  pressed && !reduceMotion && styles.pressedScale,
                ]}
              >
                <TextLabel style={styles.recommendationLinkText}>
                  Ver conquistas e histórico diário
                </TextLabel>
                <ArrowRight color={colors.blue} size={15} />
              </Pressable>
            </Link>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir Sobre o ENEM.DEV"
              onPress={() => router.push("/about")}
              style={({ pressed }) => [
                styles.recommendationLink,
                pressed && styles.pressed,
                pressed && !reduceMotion && styles.pressedScale,
              ]}
            >
              <TextLabel style={styles.recommendationLinkText}>
                Sobre o ENEM.DEV
              </TextLabel>
              <ArrowRight color={colors.blue} size={15} />
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function MetricCard({
  width,
  icon,
  iconStyle,
  label,
  value,
  helper,
}: {
  width: `${number}%`;
  icon: ReactNode;
  iconStyle: StyleProp<ViewStyle>;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <View style={[styles.metricCard, { width }]}>
      <View style={styles.metricHeading}>
        <View style={[styles.metricIcon, iconStyle]}>{icon}</View>
        <TextLabel style={styles.metricCaption}>{label}</TextLabel>
      </View>
      <TextLabel style={styles.metricValue}>{value}</TextLabel>
      <TextLabel style={styles.metricHelper}>{helper}</TextLabel>
    </View>
  );
}

function AnimatedXpValue({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const displayValueRef = useRef(value);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (displayValueRef.current === value) {
      return;
    }

    if (reduceMotion) {
      const timeoutId = setTimeout(() => {
        displayValueRef.current = value;
        setDisplayValue(value);
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    const startValue = displayValueRef.current;
    const steps = 10;
    let step = 0;
    const intervalId = setInterval(() => {
      step += 1;
      const nextValue =
        step === steps
          ? value
          : Math.round(startValue + ((value - startValue) * step) / steps);
      displayValueRef.current = nextValue;
      setDisplayValue(nextValue);

      if (step === steps) {
        clearInterval(intervalId);
      }
    }, 30);

    return () => clearInterval(intervalId);
  }, [reduceMotion, value]);

  return (
    <Text
      accessibilityLabel={`${displayValue.toLocaleString("pt-BR")} XP`}
      style={[styles.text, styles.xpTotal]}
    >
      {displayValue.toLocaleString("pt-BR")} XP
    </Text>
  );
}

function AnimatedProgressFill({
  progress,
  fillStyle,
}: {
  progress: number;
  fillStyle: StyleProp<ViewStyle>;
}) {
  const animatedProgress = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const boundedProgress = Math.max(0, Math.min(100, progress));
    animatedProgress.value = reduceMotion
      ? boundedProgress
      : withTiming(boundedProgress, { duration: 420 });
  }, [animatedProgress, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
  }));

  return <Animated.View style={[fillStyle, animatedStyle]} />;
}

function TextLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <Text style={[styles.text, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    width: "100%",
    maxWidth: 1440,
    alignSelf: "center",
    paddingHorizontal: 30,
    paddingTop: 26,
    paddingBottom: 40,
    gap: 22,
  },
  mobileScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  text: {
    color: colors.text,
    fontFamily: "system-ui",
  },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 22,
    flexWrap: "wrap",
  },
  welcomeCopy: {
    flexGrow: 1,
    flexBasis: 280,
    gap: 8,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  eyebrowText: {
    color: colors.green,
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  greeting: {
    fontSize: 27,
    fontWeight: "700",
    letterSpacing: -0.7,
  },
  intro: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    minWidth: 0,
    flexBasis: 290,
    flexGrow: 0.8,
    padding: 18,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  sessionCopy: {
    gap: 5,
  },
  sessionKicker: {
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "700",
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  sessionDescription: {
    color: colors.muted,
    fontSize: 11,
  },
  sessionButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.green,
  },
  pressedScale: {
    transform: [{ scale: 0.98 }],
  },
  pressed: {
    opacity: 0.75,
  },
  sessionButtonText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    columnGap: 12,
    rowGap: 12,
  },
  metricCard: {
    minHeight: 152,
    padding: 17,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  gamificationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  levelCard: {
    flex: 1,
    minWidth: 250,
    padding: 17,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    gap: 10,
  },
  dailyCard: {
    flex: 1,
    minWidth: 250,
    padding: 17,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    gap: 10,
  },
  dailyCardComplete: {
    borderColor: colors.green,
    backgroundColor: "#39D3530A",
  },
  levelTopline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  levelKicker: {
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  levelNumber: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "700",
  },
  xpTotal: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  dailyValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  streakValue: {
    color: colors.orange,
    fontSize: 10,
    fontWeight: "700",
  },
  levelTrack: {
    height: 6,
    overflow: "hidden",
    borderRadius: 4,
    backgroundColor: "#30363D",
  },
  levelFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  dailyFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.blue,
  },
  levelHelper: {
    color: colors.muted,
    fontSize: 10,
  },
  metricHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 18,
  },
  metricIcon: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  greenIcon: {
    backgroundColor: "#39D35318",
  },
  blueIcon: {
    backgroundColor: "#58A6FF18",
  },
  orangeIcon: {
    backgroundColor: "#F0883E18",
  },
  metricCaption: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 9,
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  metricValue: {
    fontSize: 23,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  metricHelper: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 11,
  },
  statusMessage: {
    color: colors.muted,
    fontSize: 12,
  },
  errorMessage: {
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.orange,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  errorText: {
    color: colors.orange,
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  retryButtonText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyMessage: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  contentGrid: {
    gap: 14,
  },
  contentGridWide: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  panel: {
    padding: 19,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  progressPanel: {
    width: "100%",
  },
  progressPanelWide: {
    width: "58%",
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  panelSubtitle: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 11,
  },
  panelMeta: {
    color: colors.muted,
    fontSize: 8,
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  subjectList: {
    paddingTop: 17,
    gap: 17,
  },
  subjectItem: {
    gap: 7,
  },
  subjectTopline: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  subjectName: {
    fontSize: 12,
    fontWeight: "600",
  },
  subjectScore: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "600",
  },
  subjectTrack: {
    height: 5,
    overflow: "hidden",
    borderRadius: 4,
    backgroundColor: "#30363D",
  },
  subjectFill: {
    height: "100%",
    borderRadius: 4,
  },
  subjectDetail: {
    color: colors.muted,
    fontSize: 10,
  },
  recommendationPanel: {
    flex: 1,
    minWidth: 260,
    gap: 15,
  },
  recommendationTopline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recommendationBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#58A6FF18",
  },
  recommendationBadgeText: {
    color: colors.blue,
    fontSize: 8,
    letterSpacing: 0.6,
    fontWeight: "700",
  },
  suggestionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.blue,
  },
  recommendationTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  recommendationDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  recommendationDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  recommendationNote: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 16,
  },
  recommendationLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: "auto",
  },
  recommendationLinkText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "600",
  },
});
