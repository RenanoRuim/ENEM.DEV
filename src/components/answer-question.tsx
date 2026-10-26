import { CircleCheck, CircleX, Sparkles } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeOutUp,
  ZoomIn,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { EnemRichText } from "@/components/enem-rich-text";
import { QuestionExplanationPanel } from "@/components/question-explanation-panel";
import { recordAnswer } from "@/services/record-answer";
import { ACHIEVEMENTS } from "@/constants/gamification";
import type {
  EnemAlternative,
  EnemAlternativeLetter,
  EnemQuestion,
} from "@/types/enem";
import type { AnswerAttempt } from "@/types/history";
import type { ProcessAnswerResult } from "@/types/student-state";
import { getQuestionIdentity } from "@/utils/question-identity";
import {
  isUnavailableImageUrl,
  validateEnemQuestion,
} from "@/utils/question-validation";

const colors = {
  background: "#0D1117",
  surface: "#161B22",
  border: "#30363D",
  text: "#E6EDF3",
  muted: "#8B949E",
  green: "#39D353",
  blue: "#58A6FF",
  red: "#F85149",
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AnswerQuestion({
  question,
  areaLabel,
  language,
  mode,
  isLastInBatch = false,
  onSaved,
  onNext,
  onSkipUnavailable,
}: {
  question: EnemQuestion;
  areaLabel: string;
  language?: string;
  mode: "study" | "debug";
  isLastInBatch?: boolean;
  onSaved?: (result: ProcessAnswerResult) => void;
  onNext?: (wasCorrect: boolean) => void;
  onSkipUnavailable?: () => void;
}) {
  const [selectedAnswer, setSelectedAnswer] =
    useState<EnemAlternativeLetter | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<AnswerAttempt | null>(null);
  const [rewardResult, setRewardResult] =
    useState<ProcessAnswerResult | null>(null);
  const [imageStatuses, setImageStatuses] = useState<
    Record<string, "loading" | "loaded" | "error">
  >({});
  const [continueWithoutImages, setContinueWithoutImages] = useState(false);
  const [isAchievementNoticeDismissed, setIsAchievementNoticeDismissed] =
    useState(false);
  const confirmationStarted = useRef(false);
  const attemptRef = useRef<AnswerAttempt | null>(null);
  const savedAttemptIdRef = useRef<string | null>(null);
  const feedbackOffset = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const isCorrect = selectedAnswer === question.correctAlternative;
  const validation = validateEnemQuestion(question);
  const criticalImageUrls = validation.criticalImageUrls;
  const unavailableCriticalImage = criticalImageUrls.find(
    (url) =>
      isUnavailableImageUrl(url) || imageStatuses[url] === "error",
  );
  const loadingCriticalImage = criticalImageUrls.some(
    (url) =>
      !isUnavailableImageUrl(url) &&
      imageStatuses[url] !== "loaded" &&
      imageStatuses[url] !== "error",
  );
  const imageBlocksAnswer =
    loadingCriticalImage ||
    (Boolean(unavailableCriticalImage) && !continueWithoutImages);

  useEffect(() => {
    if (!isConfirmed || isCorrect || reduceMotion) {
      feedbackOffset.value = 0;
      return;
    }

    feedbackOffset.value = withSequence(
      withTiming(-7, { duration: 40 }),
      withTiming(7, { duration: 40 }),
      withTiming(-5, { duration: 40 }),
      withTiming(5, { duration: 40 }),
      withTiming(0, { duration: 40 }),
    );
  }, [feedbackOffset, isConfirmed, isCorrect, reduceMotion]);

  useEffect(() => {
    if (!rewardResult?.newlyUnlockedAchievements.length) {
      return;
    }

    const timeoutId = setTimeout(
      () => setIsAchievementNoticeDismissed(true),
      5000,
    );
    return () => clearTimeout(timeoutId);
  }, [rewardResult]);

  const feedbackAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: feedbackOffset.value }],
  }));

  const handleImageStatusChange = useCallback(
    (uri: string, status: "loading" | "loaded" | "error") => {
      setImageStatuses((current) =>
        current[uri] === status
          ? current
          : { ...current, [uri]: status },
      );
    },
    [],
  );

  function createAttempt(
    answer: EnemAlternativeLetter,
  ): AnswerAttempt {
    const attemptLanguage = question.language ?? language ?? null;
    return {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      questionId: getQuestionIdentity(question, language),
      year: question.year,
      questionNumber: question.index,
      language: attemptLanguage,
      mode,
      discipline: question.discipline,
      selectedAlternative: answer,
      correctAlternative: question.correctAlternative,
      isCorrect,
      answeredAt: new Date().toISOString(),
    };
  }

  async function persistAttempt(currentAttempt: AnswerAttempt) {
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const result = await recordAnswer(currentAttempt);
      setSaveStatus("saved");
      if (savedAttemptIdRef.current !== currentAttempt.id) {
        savedAttemptIdRef.current = currentAttempt.id;
        setRewardResult(result);
        onSaved?.(result);
      }
    } catch (error) {
      setSaveStatus("error");
      setSaveError(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao salvar sua resposta.",
      );
    }
  }

  function handleConfirm() {
    if (
      !selectedAnswer ||
      isConfirmed ||
      imageBlocksAnswer ||
      confirmationStarted.current
    ) {
      return;
    }

    confirmationStarted.current = true;
    const newAttempt = createAttempt(selectedAnswer);
    attemptRef.current = newAttempt;
    setAttempt(newAttempt);
    setIsConfirmed(true);
    void persistAttempt(newAttempt);
  }

  function handleRetrySave() {
    if (attemptRef.current) {
      void persistAttempt(attemptRef.current);
    }
  }

  function handleNext() {
    if (saveStatus === "saved" && onNext) {
      confirmationStarted.current = false;
      onNext(isCorrect);
    }
  }

  if (!validation.isValid) {
    return (
      <View style={styles.unavailablePanel}>
        <Text style={styles.feedbackTitle}>Questão temporariamente indisponível</Text>
        <Text style={styles.feedbackText}>
          Esta questão veio com dados incompletos e não pode ser respondida.
        </Text>
        {onSkipUnavailable ? (
          <ActionButton
            label="Ignorar questão e continuar"
            onPress={onSkipUnavailable}
          />
        ) : null}
      </View>
    );
  }

  return (
    <Animated.ScrollView
      entering={reduceMotion ? undefined : FadeInRight.duration(160)}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.questionHeader}>
        <View>
          <Text style={styles.eyebrow}>
            {mode === "debug" ? "DEBUG MODE" : "TREINO ENEM.DEV"}
          </Text>
          <Text style={styles.questionCount}>Questão {question.index}</Text>
        </View>
        <View style={styles.yearBadge}>
          <Text style={styles.yearText}>ENEM {question.year}</Text>
        </View>
      </View>

      <View style={styles.areaBadge}>
        <View style={styles.areaDot} />
        <Text style={styles.areaText}>{areaLabel}</Text>
        {question.language || language ? (
          <Text style={styles.languageText}>
            {(question.language ?? language)?.toUpperCase()}
          </Text>
        ) : null}
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionLabel}>ENUNCIADO</Text>
        {question.context?.trim() ||
        (Array.isArray(question.files) && question.files.length > 0) ? (
          <EnemRichText
            content={question.context}
            imageUrls={question.files}
            onImageStatusChange={handleImageStatusChange}
          />
        ) : null}
        {question.alternativesIntroduction ? (
          <Text style={styles.introduction}>
            {question.alternativesIntroduction}
          </Text>
        ) : null}
      </View>

      <View style={styles.alternativesSection}>
        <Text style={styles.sectionLabel}>ALTERNATIVAS</Text>
        <View style={styles.alternativesList}>
          {question.alternatives.map((alternative) => (
            <AlternativeOption
              key={alternative.letter}
              alternative={alternative}
              selectedAnswer={selectedAnswer}
              correctAnswer={question.correctAlternative}
              isConfirmed={isConfirmed}
              isAnswerBlocked={imageBlocksAnswer}
              onSelect={setSelectedAnswer}
              onImageStatusChange={handleImageStatusChange}
            />
          ))}
        </View>
      </View>

      {unavailableCriticalImage ? (
        <View style={styles.imageUnavailableNotice}>
          <Text style={styles.imageUnavailableTitle}>
            Questão temporariamente indisponível
          </Text>
          <Text style={styles.feedbackText}>
            Uma imagem necessária para entender o enunciado não foi
            disponibilizada. Tente carregar a imagem novamente antes de
            responder. Se o restante do enunciado e das alternativas for
            suficiente, você também pode continuar sem as imagens.
          </Text>
          {validation.canContinueWithoutImages ? (
            <ActionButton
              label="Continuar sem imagens"
              onPress={() => setContinueWithoutImages(true)}
            />
          ) : null}
          {onSkipUnavailable ? (
            <ActionButton
              label="Ignorar questão e continuar"
              onPress={onSkipUnavailable}
            />
          ) : null}
        </View>
      ) : loadingCriticalImage ? (
        <Text style={styles.imageLoadingText}>
          Carregando imagem necessária para responder...
        </Text>
      ) : null}

      {isConfirmed ? (
        <Animated.View
          accessibilityRole="summary"
          accessibilityLiveRegion="polite"
          style={[
            styles.feedback,
            isCorrect ? styles.correctFeedback : styles.incorrectFeedback,
            feedbackAnimatedStyle,
          ]}
        >
          <View style={styles.feedbackHeading}>
            <Animated.View
              entering={reduceMotion ? undefined : ZoomIn.duration(180)}
            >
              {isCorrect ? (
                <CircleCheck color={colors.green} size={19} />
              ) : (
                <CircleX color={colors.red} size={19} />
              )}
            </Animated.View>
            <Text
              style={[
                styles.feedbackTitle,
                { color: isCorrect ? colors.green : colors.red },
              ]}
            >
              {isCorrect ? "Resposta correta!" : "Resposta incorreta"}
            </Text>
          </View>
          {!isCorrect ? (
            <Text style={styles.feedbackText}>
              A alternativa correta é {question.correctAlternative}.
            </Text>
          ) : null}
        </Animated.View>
      ) : null}

      {isConfirmed && selectedAnswer ? (
        <QuestionExplanationPanel
          questionId={getQuestionIdentity(question, language)}
          selectedAnswer={selectedAnswer}
          correctAnswer={question.correctAlternative}
        />
      ) : null}

      {rewardResult && !rewardResult.duplicate ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(200)}
          style={[
            styles.rewardFeedback,
            rewardResult.dailyCommit.isComplete && styles.rewardFeedbackComplete,
          ]}
        >
          <Text style={styles.rewardTitle}>
            {rewardResult.gainedXp > 0
              ? `+${rewardResult.gainedXp} XP`
              : "Tentativa registrada"}
          </Text>
          {rewardResult.levelAfter > rewardResult.levelBefore ? (
            <Text style={styles.rewardText}>
              ✨ Subiu do nível {rewardResult.levelBefore} ao nível{" "}
              {rewardResult.levelAfter}. Parabéns pela evolução!
            </Text>
          ) : null}
          {!isAchievementNoticeDismissed &&
          rewardResult.newlyUnlockedAchievements.length > 0 ? (
            <Animated.View
              entering={reduceMotion ? undefined : FadeInDown.duration(180)}
              exiting={reduceMotion ? undefined : FadeOutUp.duration(180)}
              style={styles.achievementNotice}
            >
              <Sparkles color={colors.green} size={17} />
              <View style={styles.achievementNoticeCopy}>
                {rewardResult.newlyUnlockedAchievements.map((achievementId) => {
          const achievement = ACHIEVEMENTS.find(
            (item) => item.id === achievementId,
          );
          return achievement ? (
                    <View key={achievement.id} style={styles.achievementItem}>
                      <Text style={styles.achievementTitle}>
                        Conquista desbloqueada: {achievement.name}
                      </Text>
                      <Text style={styles.rewardText}>
                        {achievement.description}
                      </Text>
                    </View>
          ) : null;
                })}
              </View>
            </Animated.View>
          ) : null}
          <Text style={styles.rewardText}>
          Daily Commit: {rewardResult.dailyCommit.completed}/
          {rewardResult.dailyCommit.goal}
          {rewardResult.dailyCommit.isComplete ? " — meta concluída!" : ""}
          </Text>
        </Animated.View>
      ) : null}

      {attempt ? (
        <View
          accessibilityRole="summary"
          style={[
            styles.saveStatus,
            saveStatus === "error" && styles.saveError,
          ]}
        >
          <Text style={styles.saveStatusText}>
            {saveStatus === "saving"
              ? "Salvando tentativa e progresso..."
              : saveStatus === "saved"
                ? "Tentativa e progresso salvos."
                : `Não foi possível salvar: ${saveError ?? "erro desconhecido"}`}
          </Text>
          {saveStatus === "error" ? (
            <ActionButton
              label="Tentar salvar novamente"
              onPress={handleRetrySave}
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        {!isConfirmed ? (
          <ActionButton
            label="Confirmar resposta"
            onPress={handleConfirm}
            disabled={
              !selectedAnswer ||
              imageBlocksAnswer
            }
          />
        ) : onNext ? (
          <ActionButton
            label={
              mode === "debug"
                ? "Próxima pendente"
                : isLastInBatch
                  ? "Carregar próximas questões"
                  : "Próxima questão"
            }
            onPress={handleNext}
            disabled={saveStatus !== "saved"}
          />
        ) : saveStatus === "saved" ? (
          <Text style={styles.endMessage}>
            Você concluiu as questões novas disponíveis para estes filtros.
          </Text>
        ) : null}
      </View>
    </Animated.ScrollView>
  );
}

function AlternativeOption({
  alternative,
  selectedAnswer,
  correctAnswer,
  isConfirmed,
  isAnswerBlocked,
  onSelect,
  onImageStatusChange,
}: {
  alternative: EnemAlternative;
  selectedAnswer: EnemAlternativeLetter | null;
  correctAnswer: EnemAlternativeLetter;
  isConfirmed: boolean;
  isAnswerBlocked: boolean;
  onSelect: (letter: EnemAlternativeLetter) => void;
  onImageStatusChange: (
    uri: string,
    status: "loading" | "loaded" | "error",
  ) => void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const reduceMotion = useReducedMotion();
  const colorProgress = useSharedValue(0);
  const isSelected = selectedAnswer === alternative.letter;
  const isCorrectAnswer = alternative.letter === correctAnswer;
  const showCorrect = isConfirmed && isCorrectAnswer;
  const showIncorrect = isConfirmed && isSelected && !isCorrectAnswer;
  const targetColor = showCorrect ? 1 : showIncorrect ? -1 : 0;

  useEffect(() => {
    colorProgress.value = withTiming(targetColor, {
      duration: reduceMotion ? 0 : 240,
    });
  }, [colorProgress, reduceMotion, targetColor]);

  const animatedOptionStyle = useAnimatedStyle(() => {
    if (!isConfirmed) {
      return {};
    }

    return {
      backgroundColor: interpolateColor(
        colorProgress.value,
        [-1, 0, 1],
        ["#F8514912", colors.surface, "#39D35312"],
      ),
      borderColor: interpolateColor(
        colorProgress.value,
        [-1, 0, 1],
        [colors.red, colors.border, colors.green],
      ),
    };
  });

  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{
        checked: isSelected,
        disabled: isConfirmed || isAnswerBlocked,
      }}
      disabled={isConfirmed || isAnswerBlocked}
      onPress={() => onSelect(alternative.letter)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={({ pressed }: { pressed: boolean }) => [
        styles.alternative,
        isSelected && !isConfirmed && styles.selectedAlternative,
        showCorrect && styles.correctAlternative,
        showIncorrect && styles.incorrectAlternative,
        isFocused && styles.focusedAlternative,
        isHovered && !isConfirmed && styles.hoveredAlternative,
        pressed && !isConfirmed && !reduceMotion && styles.pressedAlternative,
        animatedOptionStyle,
      ]}
    >
      <View
        style={[
          styles.letterBadge,
          isSelected && !isConfirmed && styles.selectedLetterBadge,
          showCorrect && styles.correctLetterBadge,
          showIncorrect && styles.incorrectLetterBadge,
        ]}
      >
        <Text
          style={[
            styles.letterText,
            (isSelected || showCorrect || showIncorrect) &&
              styles.activeLetterText,
          ]}
        >
          {alternative.letter}
        </Text>
      </View>
      <View style={styles.alternativeContent}>
        <EnemRichText
          content={alternative.text}
          imageUrls={alternative.file ? [alternative.file] : []}
          onImageStatusChange={onImageStatusChange}
        />
      </View>
    </AnimatedPressable>
  );
}

function ActionButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={({ pressed }) => [
        styles.actionButton,
        disabled && styles.disabledButton,
        isFocused && !disabled && styles.focusedButton,
        pressed && !disabled && styles.pressedButton,
        pressed && !disabled && !reduceMotion && styles.pressedButtonScale,
      ]}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 44,
    gap: 18,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    color: colors.green,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "700",
  },
  questionCount: {
    marginTop: 5,
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  yearBadge: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  yearText: {
    color: colors.blue,
    fontSize: 10,
    fontWeight: "700",
  },
  areaBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: "#58A6FF18",
  },
  areaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.blue,
  },
  areaText: {
    color: colors.blue,
    fontSize: 10,
    fontWeight: "600",
  },
  languageText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "700",
  },
  panel: {
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    gap: 14,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 0.9,
    fontWeight: "700",
  },
  introduction: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
  },
  alternativesSection: {
    gap: 11,
  },
  alternativesList: {
    gap: 9,
  },
  alternative: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  selectedAlternative: {
    borderColor: colors.blue,
    backgroundColor: "#58A6FF12",
  },
  correctAlternative: {
    borderColor: colors.green,
    backgroundColor: "#39D35312",
  },
  incorrectAlternative: {
    borderColor: colors.red,
    backgroundColor: "#F8514912",
  },
  letterBadge: {
    width: 27,
    height: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 7,
    backgroundColor: colors.background,
  },
  selectedLetterBadge: {
    borderColor: colors.blue,
    backgroundColor: colors.blue,
  },
  correctLetterBadge: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  incorrectLetterBadge: {
    borderColor: colors.red,
    backgroundColor: colors.red,
  },
  letterText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  activeLetterText: {
    color: colors.background,
  },
  alternativeContent: {
    flex: 1,
    paddingTop: 3,
  },
  feedback: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 9,
    gap: 5,
  },
  correctFeedback: {
    borderColor: "#39D35366",
    backgroundColor: "#39D35312",
  },
  incorrectFeedback: {
    borderColor: "#F8514966",
    backgroundColor: "#F8514912",
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  feedbackText: {
    color: colors.text,
    fontSize: 12,
  },
  feedbackHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rewardFeedback: {
    padding: 13,
    borderWidth: 1,
    borderColor: "#39D35366",
    borderRadius: 9,
    backgroundColor: "#39D35312",
    gap: 5,
  },
  rewardFeedbackComplete: {
    borderColor: "#39D353",
    backgroundColor: "#39D35320",
  },
  achievementNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: 10,
    borderWidth: 1,
    borderColor: "#39D35366",
    borderRadius: 8,
    backgroundColor: "#39D35312",
  },
  achievementNoticeCopy: {
    flex: 1,
    gap: 6,
  },
  achievementItem: {
    gap: 2,
  },
  achievementTitle: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "700",
  },
  rewardTitle: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "700",
  },
  rewardText: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 16,
  },
  saveStatus: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    gap: 10,
  },
  saveError: {
    borderColor: colors.red,
  },
  saveStatusText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  actions: {
    gap: 10,
  },
  actionButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 9,
    backgroundColor: colors.green,
  },
  disabledButton: {
    opacity: 0.4,
  },
  pressedButton: {
    opacity: 0.78,
  },
  pressedButtonScale: {
    transform: [{ scale: 0.98 }],
  },
  focusedButton: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  focusedAlternative: {
    borderWidth: 2,
  },
  hoveredAlternative: {
    borderColor: colors.blue,
  },
  pressedAlternative: {
    transform: [{ scale: 0.995 }],
  },
  actionButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "700",
  },
  endMessage: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  unavailablePanel: {
    margin: 24,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  imageUnavailableNotice: {
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: 8,
    backgroundColor: "#F8514912",
  },
  imageUnavailableTitle: {
    color: colors.red,
    fontSize: 13,
    fontWeight: "700",
  },
  imageLoadingText: {
    color: colors.muted,
    fontSize: 12,
  },
});
