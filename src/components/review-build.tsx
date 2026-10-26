import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Shuffle,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { EnemRichText } from "@/components/enem-rich-text";
import { getPersonalQuestionRecords } from "@/services/personal-question-notes";
import { getQuestionExplanation } from "@/services/question-explanations";
import { loadQuestionsByIdentifiers } from "@/services/question-loader";
import { getStudentState } from "@/services/student-state-storage";
import type {
  EnemAlternativeLetter,
  EnemQuestion,
} from "@/types/enem";
import type { PersonalQuestionRecord } from "@/types/personal-question-note";
import type { QuestionExplanation } from "@/types/question-explanation";
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

type ReviewSource = "incorrect" | "favorite" | "personal";
type ReviewPhase = "setup" | "session" | "results";

const sourceLabels: Record<ReviewSource, string> = {
  incorrect: "Respondidas incorretamente",
  favorite: "Favoritas",
  personal: "Com explicações pessoais",
};

function shuffleItems<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

export function ReviewBuildModal({
  visible,
  reloadToken,
  onClose,
}: {
  visible: boolean;
  reloadToken: number;
  onClose: () => void;
}) {
  const [incorrectIds, setIncorrectIds] = useState<string[]>([]);
  const [personalRecords, setPersonalRecords] = useState<
    PersonalQuestionRecord[]
  >([]);
  const [loadedRequestKey, setLoadedRequestKey] = useState<number | null>(null);
  const [sourceLoadErrorKey, setSourceLoadErrorKey] = useState<number | null>(
    null,
  );
  const [selectedSources, setSelectedSources] = useState<
    Record<ReviewSource, boolean>
  >({ incorrect: true, favorite: false, personal: false });
  const [quantityText, setQuantityText] = useState("10");
  const [shouldShuffle, setShouldShuffle] = useState(true);
  const [phase, setPhase] = useState<ReviewPhase>("setup");
  const [questions, setQuestions] = useState<EnemQuestion[]>([]);
  const [answers, setAnswers] = useState<
    Record<string, EnemAlternativeLetter>
  >({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailableCount, setUnavailableCount] = useState(0);
  const isSourcesLoading =
    visible && loadedRequestKey !== reloadToken;

  useEffect(() => {
    if (!visible) {
      return;
    }
    let isActive = true;
    void Promise.all([getStudentState(), getPersonalQuestionRecords()])
      .then(([studentState, records]) => {
        if (isActive) {
          setError(null);
          setIncorrectIds(
            Array.from(
              new Set(
                studentState.attempts
                  .filter((attempt) => !attempt.isCorrect)
                  .map((attempt) => attempt.questionId),
              ),
            ),
          );
          setPersonalRecords(records);
          setSourceLoadErrorKey(null);
          setLoadedRequestKey(reloadToken);
        }
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar suas questões para revisão.",
          );
          setSourceLoadErrorKey(reloadToken);
          setLoadedRequestKey(reloadToken);
        }
      });
    return () => {
      isActive = false;
    };
  }, [reloadToken, visible]);

  const idsBySource = useMemo<Record<ReviewSource, Set<string>>>(() => {
    const favorites = new Set<string>();
    const personal = new Set<string>();
    for (const record of personalRecords) {
      if (record.isFavorite) {
        favorites.add(record.questionId);
      }
      if (record.explanation) {
        personal.add(record.questionId);
      }
    }
    return {
      incorrect: new Set(incorrectIds),
      favorite: favorites,
      personal,
    };
  }, [incorrectIds, personalRecords]);

  const candidateIds = useMemo(() => {
    const selected = new Set<string>();
    for (const source of Object.keys(selectedSources) as ReviewSource[]) {
      if (selectedSources[source]) {
        for (const id of idsBySource[source]) {
          selected.add(id);
        }
      }
    }
    return Array.from(selected);
  }, [idsBySource, selectedSources]);

  const quantity = Number(quantityText);
  const currentQuestion = questions[currentIndex];
  const personalRecordById = new Map(
    personalRecords.map((record) => [record.questionId, record]),
  );

  function toggleSource(source: ReviewSource) {
    setSelectedSources((current) => ({
      ...current,
      [source]: !current[source],
    }));
    setError(null);
  }

  async function startReview() {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      setError("Informe uma quantidade inteira entre 1 e 50.");
      return;
    }
    if (candidateIds.length < quantity) {
      setError(
        `As origens selecionadas têm ${candidateIds.length} questão(ões) identificada(s); selecione uma quantidade menor ou outras origens.`,
      );
      return;
    }

    setIsBuilding(true);
    setError(null);
    try {
      const identifiers = shouldShuffle
        ? shuffleItems(candidateIds)
        : candidateIds;
      const loaded = await loadQuestionsByIdentifiers(identifiers);
      setUnavailableCount(loaded.unavailableIds.length);
      if (loaded.questions.length < quantity) {
        setError(
          `Não foi possível iniciar: apenas ${loaded.questions.length} questão(ões) válida(s) foram recuperadas para a quantidade solicitada (${quantity}). ${loaded.unavailableIds.length} questão(ões) estavam indisponíveis ou incompletas.`,
        );
        return;
      }
      const validQuestions = shouldShuffle
        ? shuffleItems(loaded.questions)
        : loaded.questions;
      setQuestions(validQuestions.slice(0, quantity));
      setAnswers({});
      setCurrentIndex(0);
      setPhase("session");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? `Falha ao recuperar questões da API: ${loadError.message}`
          : "Falha ao recuperar questões da API.",
      );
    } finally {
      setIsBuilding(false);
    }
  }

  function finishReview() {
    setPhase("results");
  }

  function startAnotherReview() {
    setPhase("setup");
    setQuestions([]);
    setAnswers({});
    setCurrentIndex(0);
    setError(null);
    setUnavailableCount(0);
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>REVISÃO · SEM XP ADICIONAL</Text>
            <Text style={styles.title}>Review Build</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar Review Build"
            onPress={onClose}
            style={styles.closeButton}
          >
            <X color={colors.text} size={20} />
          </Pressable>
        </View>

        {phase === "setup" ? (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.description}>
              Monte uma sessão privada usando questões já registradas. As
              respostas desta sessão não entram no histórico nem alteram o
              Debug Mode ou seus XP.
            </Text>
            {isSourcesLoading ? (
              <Text style={styles.message}>Carregando origens...</Text>
            ) : (
              <>
                <Text style={styles.sectionTitle}>ORIGENS</Text>
                {(Object.keys(sourceLabels) as ReviewSource[]).map((source) => (
                  <SourceOption
                    key={source}
                    label={sourceLabels[source]}
                    count={idsBySource[source].size}
                    selected={selectedSources[source]}
                    onPress={() => toggleSource(source)}
                  />
                ))}
                <Text style={styles.sourceSummary}>
                  {candidateIds.length} questão(ões) únicas nas origens
                  selecionadas. Questões repetidas entre origens são unificadas.
                </Text>
                <Text style={styles.sectionTitle}>QUANTIDADE (1–50)</Text>
                <TextInput
                  accessibilityLabel="Quantidade de questões para revisão"
                  keyboardType="number-pad"
                  maxLength={2}
                  onChangeText={setQuantityText}
                  style={styles.quantityInput}
                  value={quantityText}
                />
                <SourceOption
                  label="Embaralhar ordem"
                  count={null}
                  selected={shouldShuffle}
                  onPress={() => setShouldShuffle((current) => !current)}
                />
                {error ? (
                  <Text accessibilityRole="alert" style={styles.error}>
                    {error}
                  </Text>
                ) : null}
                <ActionButton
                  label={isBuilding ? "Montando sessão..." : "Iniciar Review Build"}
                  onPress={() => void startReview()}
                  disabled={
                    isBuilding ||
                    isSourcesLoading ||
                    sourceLoadErrorKey === reloadToken
                  }
                />
              </>
            )}
          </ScrollView>
        ) : phase === "session" && currentQuestion ? (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.sessionProgress}>
              <Text style={styles.sectionTitle}>
                QUESTÃO {currentIndex + 1} DE {questions.length}
              </Text>
              <Text style={styles.sourceSummary}>
                {currentQuestion.year} · Questão {currentQuestion.index}
              </Text>
            </View>
            {unavailableCount > 0 ? (
              <Text style={styles.sourceSummary}>
                {unavailableCount} questão(ões) indisponível(is) foram
                ignoradas; há questões válidas suficientes nesta sessão.
              </Text>
            ) : null}
            <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
            <EnemRichText content={currentQuestion.context} imageUrls={currentQuestion.files} />
            {currentQuestion.alternativesIntroduction ? (
              <EnemRichText content={currentQuestion.alternativesIntroduction} />
            ) : null}
            <View style={styles.alternatives}>
              {currentQuestion.alternatives.map((alternative) => {
                const selected =
                  answers[getQuestionIdentity(currentQuestion)] ===
                  alternative.letter;
                return (
                  <Pressable
                    key={alternative.letter}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() =>
                      setAnswers((current) => ({
                        ...current,
                        [getQuestionIdentity(currentQuestion)]:
                          alternative.letter,
                      }))
                    }
                    style={[
                      styles.alternative,
                      selected && styles.alternativeSelected,
                    ]}
                  >
                    <Text style={styles.alternativeLetter}>
                      {alternative.letter}
                    </Text>
                    <View style={styles.alternativeBody}>
                      <EnemRichText
                        content={alternative.text}
                        imageUrls={alternative.file ? [alternative.file] : []}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.navigation}>
              <ActionButton
                label="Anterior"
                icon={ChevronLeft}
                secondary
                disabled={currentIndex === 0}
                onPress={() => setCurrentIndex((index) => Math.max(0, index - 1))}
              />
              {currentIndex < questions.length - 1 ? (
                <ActionButton
                  label="Próxima"
                  icon={ChevronRight}
                  onPress={() =>
                    setCurrentIndex((index) =>
                      Math.min(questions.length - 1, index + 1),
                    )
                  }
                />
              ) : (
                <ActionButton
                  label="Finalizar sessão"
                  icon={Check}
                  onPress={finishReview}
                />
              )}
            </View>
            <Text style={styles.sessionHint}>
              Gabarito e explicações ficam ocultos até finalizar a sessão.
            </Text>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Resultado da sessão</Text>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreText}>
                {questions.filter(
                  (question) =>
                    answers[getQuestionIdentity(question)] ===
                    question.correctAlternative,
                ).length}{" "}
                acerto(s) ·{" "}
                {questions.length -
                  questions.filter(
                    (question) =>
                      answers[getQuestionIdentity(question)] ===
                      question.correctAlternative,
                  ).length}{" "}
                erro(s)
              </Text>
              <Text style={styles.sourceSummary}>
                Sem registro no histórico principal e sem XP adicional.
              </Text>
            </View>
            {questions.map((question, index) => {
              const questionId = getQuestionIdentity(question);
              const chosen = answers[questionId];
              const correct = chosen === question.correctAlternative;
              return (
                <ReviewResult
                  key={questionId}
                  question={question}
                  index={index}
                  chosen={chosen}
                  correct={correct}
                  personalRecord={personalRecordById.get(questionId) ?? null}
                />
              );
            })}
            <ActionButton
              label="Montar outra sessão"
              onPress={startAnotherReview}
            />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function SourceOption({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;
  count: number | null;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.sourceOption, selected && styles.sourceOptionSelected]}
    >
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected ? <Check color={colors.background} size={13} /> : null}
      </View>
      <Text style={styles.sourceOptionLabel}>{label}</Text>
      {count !== null ? (
        <Text style={styles.sourceCount}>{count}</Text>
      ) : (
        <Shuffle color={selected ? colors.blue : colors.muted} size={16} />
      )}
    </Pressable>
  );
}

function ActionButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
  icon: Icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  icon?: typeof ChevronRight;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        secondary && styles.secondaryButton,
        disabled && styles.disabledButton,
      ]}
    >
      {Icon ? <Icon color={secondary ? colors.text : colors.background} size={16} /> : null}
      <Text style={[styles.actionText, secondary && styles.secondaryText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ReviewResult({
  question,
  index,
  chosen,
  correct,
  personalRecord,
}: {
  question: EnemQuestion;
  index: number;
  chosen: EnemAlternativeLetter | undefined;
  correct: boolean;
  personalRecord: PersonalQuestionRecord | null;
}) {
  const questionId = getQuestionIdentity(question);
  const [manualExplanation, setManualExplanation] =
    useState<QuestionExplanation | null>(null);
  const [explanationError, setExplanationError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    void getQuestionExplanation(questionId)
      .then((result) => {
        if (isActive && result.available) {
          setManualExplanation(result.explanation);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setExplanationError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar a explicação do catálogo.",
          );
        }
      });
    return () => {
      isActive = false;
    };
  }, [questionId]);

  return (
    <View style={styles.resultCard}>
      <View style={styles.resultHeading}>
        {correct ? (
          <CircleCheck color={colors.green} size={17} />
        ) : (
          <CircleX color={colors.red} size={17} />
        )}
        <Text style={styles.resultTitle}>
          Questão {index + 1} · {correct ? "Acerto" : "Erro"}
        </Text>
      </View>
      <Text style={styles.resultAnswer}>
        Sua resposta: {chosen ?? "Não respondida"} · Gabarito:{" "}
        {question.correctAlternative}
      </Text>
      {manualExplanation ? (
        <View style={styles.explanationBlock}>
          <Text style={styles.explanationLabel}>
            Explicação do catálogo ENEM.DEV
          </Text>
          {manualExplanation.general?.trim() ? (
            <Text style={styles.explanationText}>
              {manualExplanation.general}
            </Text>
          ) : null}
          {Object.entries(manualExplanation.alternatives ?? {}).map(
            ([letter, explanation]) =>
              explanation?.trim() ? (
                <Text key={letter} style={styles.explanationText}>
                  Alternativa {letter}: {explanation}
                </Text>
              ) : null,
          )}
          {manualExplanation.source?.trim() ? (
            <Text style={styles.sourceSummary}>
              Fonte: {manualExplanation.source}
            </Text>
          ) : null}
        </View>
      ) : null}
      {personalRecord?.explanation ? (
        <View style={styles.explanationBlock}>
          <Text style={styles.personalLabel}>
            Sua explicação pessoal
          </Text>
          {personalRecord.explanation.general ? (
            <Text style={styles.explanationText}>
              {personalRecord.explanation.general}
            </Text>
          ) : null}
          {Object.entries(personalRecord.explanation.alternatives).map(
            ([letter, note]) =>
              note ? (
                <Text key={letter} style={styles.explanationText}>
                  Alternativa {letter}: {note}
                </Text>
              ) : null,
          )}
          {personalRecord.explanation.sources.map((source, sourceIndex) => (
            <Text key={`personal-source-${sourceIndex}`} style={styles.sourceSummary}>
              Fonte pessoal: {source}
            </Text>
          ))}
        </View>
      ) : null}
      {explanationError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {explanationError}
        </Text>
      ) : null}
      {!manualExplanation && !personalRecord?.explanation ? (
        <Text style={styles.sourceSummary}>
          Nenhuma explicação disponível para esta questão.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCopy: { gap: 3 },
  eyebrow: { color: colors.green, fontSize: 9, letterSpacing: 1, fontWeight: "800" },
  title: { color: colors.text, fontSize: 21, fontWeight: "800" },
  closeButton: { minWidth: 40, minHeight: 40, alignItems: "center", justifyContent: "center" },
  content: {
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
    padding: 16,
    paddingBottom: 36,
    gap: 12,
  },
  description: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  sectionTitle: {
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: "800",
    marginTop: 8,
  },
  sourceOption: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  sourceOptionSelected: { borderColor: `${colors.blue}90` },
  checkbox: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 4,
  },
  checkboxSelected: { borderColor: colors.green, backgroundColor: colors.green },
  sourceOptionLabel: { flex: 1, color: colors.text, fontSize: 12, fontWeight: "600" },
  sourceCount: { color: colors.muted, fontSize: 11 },
  sourceSummary: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  quantityInput: {
    width: 100,
    minHeight: 42,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 14,
  },
  actionButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.green,
  },
  actionText: { color: colors.background, fontSize: 12, fontWeight: "800" },
  secondaryButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  secondaryText: { color: colors.text },
  disabledButton: { opacity: 0.55 },
  error: { color: colors.red, fontSize: 12, lineHeight: 18 },
  message: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  sessionProgress: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  questionTitle: { color: colors.text, fontSize: 17, lineHeight: 24, fontWeight: "700" },
  alternatives: { gap: 8 },
  alternative: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  alternativeSelected: { borderColor: colors.blue, backgroundColor: `${colors.blue}12` },
  alternativeLetter: { color: colors.blue, fontSize: 13, fontWeight: "800" },
  alternativeBody: { flex: 1 },
  navigation: { flexDirection: "row", justifyContent: "space-between", gap: 9, marginTop: 8 },
  sessionHint: { color: colors.muted, fontSize: 10, textAlign: "center" },
  scoreCard: { gap: 7, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: colors.surface },
  scoreText: { color: colors.green, fontSize: 18, fontWeight: "800" },
  resultCard: { gap: 7, padding: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: colors.surface },
  resultHeading: { flexDirection: "row", alignItems: "center", gap: 7 },
  resultTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  resultAnswer: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  explanationBlock: { gap: 5, paddingTop: 6 },
  explanationLabel: { color: colors.blue, fontSize: 10, fontWeight: "800" },
  personalLabel: { color: colors.green, fontSize: 10, fontWeight: "800" },
  explanationText: { color: colors.text, fontSize: 12, lineHeight: 18 },
});
