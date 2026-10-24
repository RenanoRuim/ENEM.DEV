import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AnswerQuestion } from "@/components/answer-question";
import { FilterOptionGroup } from "@/components/filter-option-group";
import { clearQuestionPageCache } from "@/services/enem-api";
import { loadQuestionsForReview } from "@/services/question-loader";
import { getQuestionProgress } from "@/services/question-progress-storage";
import type { EnemQuestion } from "@/types/enem";
import type { QuestionProgress } from "@/types/question-progress";
import type { ProcessAnswerResult } from "@/types/student-state";
import { getQuestionIdentity } from "@/utils/question-identity";
import { matchesQuestionDiscipline } from "@/utils/question-validation";

const colors = {
  background: "#0D1117",
  border: "#30363D",
  text: "#E6EDF3",
  muted: "#8B949E",
  green: "#39D353",
  blue: "#58A6FF",
  red: "#F85149",
};

const areaLabels: Record<string, string> = {
  "ciencias-humanas": "Ciências Humanas",
  "ciencias-natureza": "Ciências da Natureza",
  linguagens: "Linguagens",
  matematica: "Matemática",
};

const areaOptions = [
  { label: "Todas", value: "*" },
  ...Object.entries(areaLabels).map(([value, label]) => ({ value, label })),
];

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível carregar as questões pendentes.";
}

export default function DebugScreen() {
  const [reviewQuestions, setReviewQuestions] = useState<EnemQuestion[]>([]);
  const [unavailableQuestions, setUnavailableQuestions] = useState<
    QuestionProgress[]
  >([]);
  const [activeQuestion, setActiveQuestion] = useState<EnemQuestion | null>(
    null,
  );
  const [selectedArea, setSelectedArea] = useState("*");
  const selectedAreaRef = useRef("*");
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(
    null,
  );
  const [visitKey, setVisitKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [skippedQuestionIds, setSkippedQuestionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const skippedQuestionIdsRef = useRef(new Set<string>());
  const requestId = useRef(0);

  useFocusEffect(
    useCallback(() => {
    const activeRequestId = ++requestId.current;
    const activeRetryCount = retryCount;
    let isActive = true;

    async function loadReviewQueue() {
      setIsLoading(true);
      setError(null);

      try {
        const progress: QuestionProgress[] = await getQuestionProgress();
        const result = await loadQuestionsForReview(progress);
        if (
          isActive &&
          requestId.current === activeRequestId &&
          activeRetryCount === retryCount
        ) {
          setReviewQuestions(result.questions);
          setUnavailableQuestions(result.unavailableQuestions);
          const availableQuestions = result.questions.filter(
            (question) =>
              !skippedQuestionIdsRef.current.has(
                getQuestionIdentity(
                  question,
                  question.language ?? undefined,
                ),
              ),
          );
          const firstQuestion =
            selectedAreaRef.current === "*"
              ? availableQuestions[0]
              : availableQuestions.find((question) =>
                  matchesQuestionDiscipline(
                    question,
                    selectedAreaRef.current,
                  ),
                );
          setActiveQuestion(firstQuestion ?? null);
          setLastAnswerCorrect(null);
        }
      } catch (loadError) {
        if (
          isActive &&
          requestId.current === activeRequestId &&
          activeRetryCount === retryCount
        ) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (
          isActive &&
          requestId.current === activeRequestId &&
          activeRetryCount === retryCount
        ) {
          setIsLoading(false);
        }
      }
    }

    void loadReviewQueue();
    return () => {
      isActive = false;
    };
    }, [retryCount]),
  );

  const availableReviewQuestions = useMemo(
    () =>
      reviewQuestions.filter(
        (question) =>
          !skippedQuestionIds.has(
            getQuestionIdentity(
              question,
              question.language ?? undefined,
            ),
          ),
      ),
    [reviewQuestions, skippedQuestionIds],
  );
  const filteredQuestions = useMemo(
    () =>
      selectedArea === "*"
        ? availableReviewQuestions
        : availableReviewQuestions.filter((question) =>
            matchesQuestionDiscipline(question, selectedArea),
          ),
    [availableReviewQuestions, selectedArea],
  );

  function handleAreaSelect(value: string) {
    if (value === selectedArea) {
      return;
    }

    setSelectedArea(value);
    selectedAreaRef.current = value;
    const firstQuestion =
      value === "*"
        ? availableReviewQuestions[0]
        : availableReviewQuestions.find((question) =>
            matchesQuestionDiscipline(question, value),
          );
    setActiveQuestion(firstQuestion ?? null);
    setLastAnswerCorrect(null);
    setVisitKey((current) => current + 1);
  }

  function handleRetry() {
    clearQuestionPageCache();
    setRetryCount((count) => count + 1);
  }

  function handleAnswerSaved(result: ProcessAnswerResult) {
    const wasCorrect = result.isCorrect;
    setLastAnswerCorrect(wasCorrect);

    if (wasCorrect && activeQuestion) {
      const currentId = getQuestionIdentity(
        activeQuestion,
        activeQuestion.language ?? undefined,
      );
      setReviewQuestions((current) =>
        current.filter(
          (question) =>
            getQuestionIdentity(question, question.language ?? undefined) !==
            currentId,
        ),
      );
    }
  }

  function handleNextQuestion() {
    if (!activeQuestion || lastAnswerCorrect === null) {
      return;
    }

    const currentId = getQuestionIdentity(
      activeQuestion,
      activeQuestion.language ?? undefined,
    );
    const queue = filteredQuestions;
    let nextQuestion: EnemQuestion | undefined;

    if (lastAnswerCorrect) {
      nextQuestion = queue[0];
    } else {
      const currentIndex = queue.findIndex(
        (question) =>
          getQuestionIdentity(question, question.language ?? undefined) ===
          currentId,
      );
      nextQuestion =
        queue.length > 1
          ? queue[(currentIndex + 1) % queue.length]
          : queue[0];
    }

    setActiveQuestion(nextQuestion ?? null);
    setLastAnswerCorrect(null);
    setVisitKey((current) => current + 1);
  }

  function handleSkipUnavailableQuestion() {
    if (!activeQuestion || lastAnswerCorrect !== null) {
      return;
    }

    const currentId = getQuestionIdentity(
      activeQuestion,
      activeQuestion.language ?? undefined,
    );
    const currentIndex = filteredQuestions.findIndex(
      (question) =>
        getQuestionIdentity(question, question.language ?? undefined) ===
        currentId,
    );
    const nextQuestion = [
      ...filteredQuestions.slice(currentIndex + 1),
      ...filteredQuestions.slice(0, currentIndex),
    ].find(
      (question) =>
        getQuestionIdentity(question, question.language ?? undefined) !==
        currentId,
    );

    const nextSkippedIds = new Set(skippedQuestionIds);
    nextSkippedIds.add(currentId);
    skippedQuestionIdsRef.current = nextSkippedIds;
    setSkippedQuestionIds(nextSkippedIds);
    setActiveQuestion(nextQuestion ?? null);
    setLastAnswerCorrect(null);
    setVisitKey((current) => current + 1);
  }

  const filteredCount = filteredQuestions.length;
  const skippedPendingCount = reviewQuestions.filter(
    (question) =>
      skippedQuestionIds.has(
        getQuestionIdentity(question, question.language ?? undefined),
      ) &&
      (selectedArea === "*" ||
        matchesQuestionDiscipline(question, selectedArea)),
  ).length;
  const unavailableCount = unavailableQuestions.filter(
    (question) =>
      selectedArea === "*" ||
      question.discipline === selectedArea,
  ).length;
  const hasPendingInOtherAreas =
    selectedArea !== "*" &&
    (reviewQuestions.some(
      (question) => question.discipline !== selectedArea,
    ) ||
      unavailableQuestions.some(
        (question) => question.discipline !== selectedArea,
      )) &&
    filteredCount === 0 &&
    unavailableCount === 0;

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Debug Mode</Text>
          <Text style={styles.topBarLabel}>REVISÃO DE QUESTÕES INCORRETAS</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {isLoading
              ? "..."
              : `${filteredCount + unavailableCount + skippedPendingCount} pendentes`}
          </Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.filtersPanel}>
          <FilterOptionGroup
            label="ÁREA DE CONHECIMENTO"
            options={areaOptions}
            selectedValue={selectedArea}
            onSelect={handleAreaSelect}
          />
        </View>
      </View>
      {!isLoading && unavailableCount > 0 ? (
        <Text style={styles.unavailableNotice}>
          {unavailableCount}{" "}
          {unavailableCount === 1
            ? "questão pendente tem dados incompletos e não pode ser exibida"
            : "questões pendentes têm dados incompletos e não podem ser exibidas"}
          . O progresso permanece salvo; tente novamente mais tarde.
        </Text>
      ) : null}

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.green} size="large" />
          <Text style={styles.stateText}>
            Carregando questões para revisar...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>Não foi possível carregar</Text>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={handleRetry}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : !activeQuestion ? (
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>
            {unavailableCount > 0
              ? "Questões indisponíveis nesta área"
              : skippedPendingCount > 0
                ? "Questões ignoradas nesta sessão"
              : hasPendingInOtherAreas
              ? "Nenhuma pendência nesta área"
              : reviewQuestions.length === 0
                ? "Tudo revisado!"
                : "Fila concluída"}
          </Text>
          <Text style={styles.stateText}>
            {unavailableCount > 0
              ? "A API retornou conteúdo incompleto para estas questões. Elas continuam pendentes e não foram removidas do seu progresso."
              : skippedPendingCount > 0
                ? "Algumas questões não puderam ser exibidas por conteúdo ou imagem indisponível. Elas continuam pendentes; nenhuma tentativa ou recompensa foi registrada."
              : hasPendingInOtherAreas
              ? "Escolha outra área para ver as questões que ainda precisam de revisão."
              : reviewQuestions.length === 0
                ? "Quando você errar uma questão nos estudos, ela aparecerá aqui."
                : "Não há outras questões pendentes neste filtro."}
          </Text>
          {unavailableCount > 0 ? (
            <Pressable
                accessibilityRole="button"
                onPress={handleRetry}
                style={styles.retryButton}
            >
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <AnswerQuestion
          key={`${getQuestionIdentity(activeQuestion, activeQuestion.language ?? undefined)}:${visitKey}`}
          question={activeQuestion}
          language={activeQuestion.language ?? undefined}
          areaLabel={
            areaLabels[activeQuestion.discipline ?? ""] ??
            activeQuestion.discipline ??
            "Área não identificada"
          }
          mode="debug"
          onSaved={handleAnswerSaved}
          onNext={handleNextQuestion}
          onSkipUnavailable={handleSkipUnavailableQuestion}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  screenTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  topBarLabel: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 8,
    letterSpacing: 0.7,
    fontWeight: "700",
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: "#F8514918",
  },
  countText: {
    color: colors.red,
    fontSize: 10,
    fontWeight: "700",
  },
  filterContainer: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  filtersPanel: {
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: "#161B22",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  stateText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  unavailableNotice: {
    width: "100%",
    maxWidth: 850,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 10,
    color: colors.red,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.green,
  },
  retryButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "700",
  },
});
