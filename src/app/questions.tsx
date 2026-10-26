import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ListChecks, SlidersHorizontal, X } from "lucide-react-native";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnswerQuestion } from "@/components/answer-question";
import { FilterOptionGroup } from "@/components/filter-option-group";
import { ReviewBuildModal } from "@/components/review-build";
import { useViewportWidth } from "@/hooks/use-is-wide-layout";
import {
  clearQuestionPageCache,
  fetchExams,
} from "@/services/enem-api";
import { loadUnseenQuestions } from "@/services/question-loader";
import { getQuestionProgress } from "@/services/question-progress-storage";
import type { EnemExam, EnemQuestion } from "@/types/enem";
import { getQuestionIdentity } from "@/utils/question-identity";

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

const disciplineShortLabels: Record<string, string> = {
  "ciencias-humanas": "Ciências Humanas",
  "ciencias-natureza": "Ciências da Natureza",
  linguagens: "Linguagens",
  matematica: "Matemática",
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível carregar as questões. Tente novamente.";
}

function getDisciplineOptions(exam: EnemExam | undefined) {
  return (
    exam?.disciplines.map((discipline) => ({
      label:
        disciplineShortLabels[discipline.value] ??
        discipline.label
          .replace(/\u00a0/g, " ")
          .replace(" e suas Tecnologias", "")
          .replace(" e suas", "")
          .replace(", Códigos", ""),
      value: discipline.value,
    })) ?? []
  );
}

export default function QuestionsScreen() {
  const reduceMotion = useReducedMotion();
  const width = useViewportWidth();
  const isWide = width >= 900;
  const safeAreaInsets = useSafeAreaInsets();
  const [exams, setExams] = useState<EnemExam[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [draftYear, setDraftYear] = useState<number | null>(null);
  const [draftDiscipline, setDraftDiscipline] = useState("");
  const [draftLanguage, setDraftLanguage] = useState("");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isReviewBuildOpen, setIsReviewBuildOpen] = useState(false);
  const [reviewReloadToken, setReviewReloadToken] = useState(0);
  const [questions, setQuestions] = useState<EnemQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCompleted, setFilterCompleted] = useState(false);
  const [unavailableCount, setUnavailableCount] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [focusRefreshCount, setFocusRefreshCount] = useState(0);
  const [catalogRetryCount, setCatalogRetryCount] = useState(0);
  const requestId = useRef(0);
  const hasBeenFocused = useRef(false);
  const temporarilyUnavailableIds = useRef(new Set<string>());

  useFocusEffect(
    useCallback(() => {
      if (hasBeenFocused.current) {
        setFocusRefreshCount((count) => count + 1);
      }
      hasBeenFocused.current = true;
    }, []),
  );

  const selectedExam = exams.find((exam) => exam.year === selectedYear);
  const languageOptions = selectedExam?.languages ?? [];
  const showLanguageFilter =
    selectedDiscipline === "linguagens" && languageOptions.length > 0;
  const draftExam = exams.find((exam) => exam.year === draftYear);
  const draftLanguageOptions = draftExam?.languages ?? [];
  const showDraftLanguageFilter =
    draftDiscipline === "linguagens" && draftLanguageOptions.length > 0;

  useEffect(() => {
    let isActive = true;

    async function loadExams() {
      setIsLoading(true);
      setError(null);

      try {
        const availableExams = await fetchExams();

        if (isActive) {
          setExams(availableExams);
          const initialExam =
            availableExams.find((exam) => exam.year === 2023) ??
            availableExams[0];

          if (!initialExam) {
            setError("A API não retornou provas disponíveis.");
            setIsLoading(false);
            return;
          }

          setSelectedYear(initialExam.year);
          setSelectedDiscipline(
            initialExam.disciplines.find(
              (discipline) => discipline.value === "linguagens",
            )?.value ??
              initialExam.disciplines[0]?.value ??
              "",
          );
          setSelectedLanguage(initialExam.languages[0]?.value ?? "");
        }
      } catch (loadError: unknown) {
        if (isActive) {
          setError(getErrorMessage(loadError));
          setIsLoading(false);
        }
      }
    }

    void loadExams();

    return () => {
      isActive = false;
    };
  }, [catalogRetryCount]);

  useEffect(() => {
    if (!selectedExam || !selectedDiscipline) {
      return;
    }

    const examYear = selectedExam.year;
    const examLanguages = selectedExam.languages;
    const activeRequestId = requestId.current + 1;
    requestId.current = activeRequestId;
    let isActive = true;

    async function loadFilteredQuestions() {
      setQuestions([]);
      setCurrentIndex(0);
      setFilterCompleted(false);
      setUnavailableCount(0);
      setIsLoading(true);
      setError(null);
      const language =
        selectedDiscipline === "linguagens"
          ? selectedLanguage || examLanguages[0]?.value
          : undefined;

      try {
        const progress = await getQuestionProgress();
        const result = await loadUnseenQuestions(
          examYear,
          selectedDiscipline,
          language,
          progress,
          temporarilyUnavailableIds.current,
        );

        if (isActive && requestId.current === activeRequestId) {
          setQuestions(result.questions);
          setUnavailableCount(result.unavailableCount);
          setFilterCompleted(
            result.scannedEntireSet &&
              result.totalMatching > 0 &&
              result.questions.length === 0 &&
              result.unavailableCount === 0,
          );
        }
      } catch (loadError: unknown) {
        if (isActive && requestId.current === activeRequestId) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (isActive && requestId.current === activeRequestId) {
          setIsLoading(false);
        }
      }
    }

    void Promise.resolve().then(loadFilteredQuestions);

    return () => {
      isActive = false;
    };
  }, [
    retryCount,
    focusRefreshCount,
    selectedDiscipline,
    selectedExam,
    selectedLanguage,
  ]);

  const currentQuestion = questions[currentIndex];
  function handleNextQuestion() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    setRetryCount((count) => count + 1);
  }

  function handleSkipUnavailableQuestion() {
    if (!currentQuestion) {
      return;
    }

    const id = getQuestionIdentity(
      currentQuestion,
      currentQuestion.language ??
        (currentQuestion.discipline === "linguagens"
          ? selectedLanguage
          : undefined),
    );
    if (temporarilyUnavailableIds.current.has(id)) {
      return;
    }
    temporarilyUnavailableIds.current.add(id);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    setQuestions([]);
    setCurrentIndex(0);
    setRetryCount((count) => count + 1);
  }

  function handleRetry() {
    if (exams.length === 0) {
      setCatalogRetryCount((count) => count + 1);
      return;
    }

    if (selectedYear !== null) {
      clearQuestionPageCache(selectedYear);
    }
    setRetryCount((count) => count + 1);
  }

  function resetQuestionsForFilterChange() {
    requestId.current += 1;
    setQuestions([]);
    setCurrentIndex(0);
    setFilterCompleted(false);
    setUnavailableCount(0);
    setIsLoading(true);
    setError(null);
  }

  const disciplineOptions = getDisciplineOptions(selectedExam);
  const draftDisciplineOptions = getDisciplineOptions(draftExam);

  function handleYearSelect(value: string) {
    const year = Number(value);
    const exam = exams.find((item) => item.year === year);

    if (!exam || year === selectedYear) {
      return;
    }

    resetQuestionsForFilterChange();
    setSelectedYear(year);
    setSelectedDiscipline(
      exam.disciplines.find((discipline) => discipline.value === "linguagens")
        ?.value ??
        exam.disciplines[0]?.value ??
        "",
    );
    setSelectedLanguage(exam.languages[0]?.value ?? "");
  }

  function handleDisciplineSelect(value: string) {
    if (value === selectedDiscipline) {
      return;
    }

    resetQuestionsForFilterChange();
    setSelectedDiscipline(value);
    if (value === "linguagens" && !selectedLanguage) {
      setSelectedLanguage(languageOptions[0]?.value ?? "");
    }
  }

  function handleLanguageSelect(value: string) {
    if (value === selectedLanguage) {
      return;
    }

    resetQuestionsForFilterChange();
    setSelectedLanguage(value);
  }

  function openFilterSheet() {
    setDraftYear(selectedYear);
    setDraftDiscipline(selectedDiscipline);
    setDraftLanguage(selectedLanguage);
    setIsFilterSheetOpen(true);
  }

  function handleDraftYearSelect(value: string) {
    const year = Number(value);
    const exam = exams.find((item) => item.year === year);

    if (!exam || year === draftYear) {
      return;
    }

    setDraftYear(year);
    setDraftDiscipline(
      exam.disciplines.find((discipline) => discipline.value === "linguagens")
        ?.value ??
        exam.disciplines[0]?.value ??
        "",
    );
    setDraftLanguage(exam.languages[0]?.value ?? "");
  }

  function handleDraftDisciplineSelect(value: string) {
    if (value === draftDiscipline) {
      return;
    }

    setDraftDiscipline(value);
    if (value === "linguagens" && !draftLanguage) {
      setDraftLanguage(draftLanguageOptions[0]?.value ?? "");
    }
  }

  function applyDraftFilters() {
    if (draftYear === null || !draftDiscipline) {
      return;
    }

    if (
      draftYear !== selectedYear ||
      draftDiscipline !== selectedDiscipline ||
      draftLanguage !== selectedLanguage
    ) {
      resetQuestionsForFilterChange();
      setSelectedYear(draftYear);
      setSelectedDiscipline(draftDiscipline);
      setSelectedLanguage(draftLanguage);
    }

    setIsFilterSheetOpen(false);
  }

  const selectedDisciplineLabel =
    disciplineOptions.find((option) => option.value === selectedDiscipline)
      ?.label ?? "Área";
  const selectedLanguageLabel = showLanguageFilter
    ? languageOptions.find((option) => option.value === selectedLanguage)
        ?.label
    : undefined;

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Questões</Text>
        <View style={styles.topBarActions}>
          <Text style={styles.topBarLabel}>BANCO ENEM.DEV</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setReviewReloadToken((value) => value + 1);
              setIsReviewBuildOpen(true);
            }}
            style={styles.reviewLaunch}
          >
            <ListChecks color={colors.green} size={15} />
            <Text style={styles.reviewLaunchText}>Review Build</Text>
          </Pressable>
        </View>
      </View>
      {selectedExam ? (
        <View style={styles.filterContainer}>
          {isWide ? (
            <View style={styles.filtersPanel}>
              <FilterOptionGroup
                label="ANO DA PROVA"
                options={exams.map((exam) => ({
                  label: String(exam.year),
                  value: String(exam.year),
                }))}
                selectedValue={String(selectedYear)}
                onSelect={handleYearSelect}
              />
              <FilterOptionGroup
                label="ÁREA DE CONHECIMENTO"
                options={disciplineOptions}
                selectedValue={selectedDiscipline}
                onSelect={handleDisciplineSelect}
              />
              {showLanguageFilter ? (
                <FilterOptionGroup
                  label="IDIOMA"
                  options={languageOptions}
                  selectedValue={selectedLanguage}
                  onSelect={handleLanguageSelect}
                />
              ) : null}
            </View>
          ) : (
            <View style={styles.mobileFilterBar}>
              <View style={styles.filterSummary}>
                <Text style={styles.filterSummaryLabel}>FILTROS</Text>
                <Text numberOfLines={1} style={styles.filterSummaryText}>
                  {selectedYear} · {selectedDisciplineLabel}
                  {selectedLanguageLabel ? ` · ${selectedLanguageLabel}` : ""}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir filtros"
                accessibilityState={{ expanded: isFilterSheetOpen }}
                onPress={openFilterSheet}
                style={({ pressed }) => [
                  styles.openFiltersButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <SlidersHorizontal color={colors.text} size={16} />
                <Text style={styles.openFiltersButtonText}>Filtros</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
      {!isLoading && !error && unavailableCount > 0 ? (
        <Text style={styles.unavailableNotice}>
          {unavailableCount}{" "}
          {unavailableCount === 1
            ? "questão com dados incompletos foi ignorada"
            : "questões com dados incompletos foram ignoradas"}{" "}
          nesta busca. Nenhuma tentativa ou progresso foi alterado.
        </Text>
      ) : null}
      {isLoading ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(140)}
          style={styles.centerState}
        >
          <ActivityIndicator color={colors.green} size="large" />
          <Text style={styles.stateText}>Carregando questões do ENEM...</Text>
        </Animated.View>
      ) : error ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(140)}
          style={styles.centerState}
        >
          <Text style={styles.stateTitle}>Não foi possível carregar</Text>
          <Text style={styles.stateText}>{error}</Text>
          <ActionButton label="Tentar novamente" onPress={handleRetry} />
        </Animated.View>
      ) : !currentQuestion ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(140)}
          style={styles.centerState}
        >
          <Text style={styles.stateTitle}>
            {unavailableCount > 0
              ? "Questões indisponíveis"
              : filterCompleted
              ? "Conjunto concluído"
              : "Nenhuma questão encontrada"}
          </Text>
          <Text style={styles.stateText}>
            {unavailableCount > 0
              ? "A API retornou questões com dados incompletos. Elas foram temporariamente ignoradas; tente novamente mais tarde."
              : filterCompleted
              ? "Todas as questões deste filtro já foram respondidas. As que precisam de revisão estão no Debug Mode."
              : "Não há questões disponíveis para esta seleção."}
          </Text>
          {unavailableCount > 0 ? (
            <ActionButton label="Tentar novamente" onPress={handleRetry} />
          ) : null}
        </Animated.View>
      ) : (
        <AnswerQuestion
          key={`${currentQuestion.year}:${currentQuestion.index}:${currentQuestion.language ?? (currentQuestion.discipline === "linguagens" ? selectedLanguage : "")}`}
          question={currentQuestion}
          language={
            currentQuestion.discipline === "linguagens"
              ? selectedLanguage || undefined
              : undefined
          }
          areaLabel={
            selectedExam?.disciplines.find(
              (discipline) => discipline.value === currentQuestion.discipline,
            )?.label ?? currentQuestion.discipline ?? "Área não identificada"
          }
          mode="study"
          isLastInBatch={currentIndex === questions.length - 1}
          onNext={handleNextQuestion}
          onSkipUnavailable={handleSkipUnavailableQuestion}
        />
      )}
      <Modal
        animationType={reduceMotion ? "none" : "slide"}
        onRequestClose={() => setIsFilterSheetOpen(false)}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={isFilterSheetOpen && !isWide && Boolean(selectedExam)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar filtros sem aplicar"
            onPress={() => setIsFilterSheetOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityViewIsModal
            style={[
              styles.filterSheet,
              {
                paddingTop: Math.max(safeAreaInsets.top, 16),
                paddingBottom: Math.max(safeAreaInsets.bottom, 16),
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Filtros</Text>
                <Text style={styles.sheetSubtitle}>
                  Escolha como deseja estudar
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar filtros sem aplicar"
                onPress={() => setIsFilterSheetOpen(false)}
                style={({ pressed }) => [
                  styles.closeSheetButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <X color={colors.text} size={18} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.sheetFiltersContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              style={styles.sheetFiltersScroll}
            >
              <FilterOptionGroup
                label="ANO DA PROVA"
                options={exams.map((exam) => ({
                  label: String(exam.year),
                  value: String(exam.year),
                }))}
                selectedValue={String(draftYear)}
                onSelect={handleDraftYearSelect}
              />
              <FilterOptionGroup
                label="ÁREA DE CONHECIMENTO"
                options={draftDisciplineOptions}
                selectedValue={draftDiscipline}
                onSelect={handleDraftDisciplineSelect}
              />
              {showDraftLanguageFilter ? (
                <FilterOptionGroup
                  label="IDIOMA"
                  options={draftLanguageOptions}
                  selectedValue={draftLanguage}
                  onSelect={setDraftLanguage}
                />
              ) : null}
            </ScrollView>
            <View style={styles.sheetFooter}>
              <ActionButton
                label="Aplicar filtros"
                onPress={applyDraftFilters}
                disabled={draftYear === null || !draftDiscipline}
              />
            </View>
          </View>
        </View>
      </Modal>
      <ReviewBuildModal
        visible={isReviewBuildOpen}
        reloadToken={reviewReloadToken}
        onClose={() => setIsReviewBuildOpen(false)}
      />
    </View>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressedButton,
      ]}
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
  topBar: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  screenTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  topBarLabel: {
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reviewLaunch: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  reviewLaunchText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "700",
  },
  filtersPanel: {
    gap: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.surface,
  },
  filterContainer: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  mobileFilterBar: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.surface,
  },
  filterSummary: {
    flex: 1,
    gap: 4,
  },
  filterSummaryLabel: {
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  filterSummaryText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  openFiltersButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  openFiltersButtonText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#00000088",
  },
  filterSheet: {
    width: "100%",
    height: "90%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: colors.surface,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 18,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  sheetSubtitle: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 11,
  },
  closeSheetButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    backgroundColor: colors.background,
  },
  sheetFiltersScroll: {
    flexShrink: 1,
  },
  sheetFiltersContent: {
    gap: 20,
    paddingVertical: 4,
  },
  sheetFooter: {
    paddingTop: 16,
  },
  scrollContent: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 44,
    gap: 18,
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
    alignSelf: "center",
    maxWidth: 850,
    paddingHorizontal: 18,
    paddingTop: 12,
    color: colors.red,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
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
  historyStatus: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    gap: 10,
  },
  historyError: {
    borderColor: colors.red,
  },
  historyStatusText: {
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
    opacity: 0.75,
  },
  actionButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "700",
  },
  endMessage: {
    paddingVertical: 10,
    color: colors.muted,
    fontSize: 12,
    textAlign: "center",
  },
});
