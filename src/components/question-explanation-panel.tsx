import {
  ChevronDown,
  ChevronUp,
  Circle,
  CircleCheck,
  CircleX,
  Bookmark,
  BookmarkCheck,
  Pencil,
  Save,
  Trash2,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { getQuestionExplanation } from "@/services/question-explanations";
import {
  deletePersonalQuestionExplanation,
  getPersonalQuestionRecord,
  savePersonalQuestionExplanation,
  setPersonalQuestionFlag,
} from "@/services/personal-question-notes";
import type { EnemAlternativeLetter } from "@/types/enem";
import type { PersonalQuestionRecord } from "@/types/personal-question-note";
import type { QuestionExplanation } from "@/types/question-explanation";

const colors = {
  background: "#0D1117",
  surface: "#161B22",
  border: "#30363D",
  text: "#E6EDF3",
  muted: "#8B949E",
  green: "#39D353",
  red: "#F85149",
  blue: "#58A6FF",
};

type ExplanationState =
  | { questionId: string; status: "loading" }
  | { questionId: string; status: "error"; message: string }
  | {
      questionId: string;
      status: "loaded";
      explanation: QuestionExplanation | null;
    };

export function QuestionExplanationPanel({
  questionId,
  selectedAnswer,
  correctAnswer,
}: {
  questionId: string;
  selectedAnswer: EnemAlternativeLetter;
  correctAnswer: EnemAlternativeLetter;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [explanationState, setExplanationState] =
    useState<ExplanationState>({ questionId, status: "loading" });
  const isCorrect = selectedAnswer === correctAnswer;

  useEffect(() => {
    let isActive = true;

    void getQuestionExplanation(questionId)
      .then((result) => {
        if (isActive) {
          setExplanationState({
            questionId,
            status: "loaded",
            explanation: result.available ? result.explanation : null,
          });
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setExplanationState({
            questionId,
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Não foi possível carregar a explicação.",
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, [questionId]);

  const currentExplanationState =
    explanationState.questionId === questionId
      ? explanationState
      : { questionId, status: "loading" as const };
  const explanation =
    currentExplanationState.status === "loaded"
      ? currentExplanationState.explanation
      : null;
  const hasAlternativeComments = Object.values(
    explanation?.alternatives ?? {},
  ).some((comment) => typeof comment === "string" && Boolean(comment.trim()));

  return (
    <View style={styles.panel}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen((open) => !open)}
        style={({ pressed }) => [
          styles.toggle,
          pressed && styles.pressed,
        ]}
      >
        <View>
          <Text style={styles.heading}>Gabarito e resolução comentada</Text>
          <Text style={styles.toggleHint}>
            {isOpen ? "Ocultar resolução" : "Ver resolução"}
          </Text>
        </View>
        {isOpen ? (
          <ChevronUp color={colors.text} size={20} />
        ) : (
          <ChevronDown color={colors.text} size={20} />
        )}
      </Pressable>

      {isOpen ? (
        <View style={styles.content}>
          <Text style={styles.catalogLabel}>
            Explicação do catálogo ENEM.DEV
          </Text>
          <View style={styles.result}>
            {isCorrect ? (
              <CircleCheck color={colors.green} size={19} />
            ) : (
              <CircleX color={colors.red} size={19} />
            )}
            <Text
              style={[
                styles.resultText,
                { color: isCorrect ? colors.green : colors.red },
              ]}
            >
              {isCorrect
                ? `Resposta correta — você marcou ${selectedAnswer}.`
                : `Resposta incorreta — você marcou ${selectedAnswer}; o gabarito é ${correctAnswer}.`}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Alternativas</Text>
          {(["A", "B", "C", "D", "E"] as const).map((letter) => {
            const isCorrectAlternative = letter === correctAnswer;
            const isSelectedIncorrect =
              letter === selectedAnswer && !isCorrect;
            const alternativeComment =
              explanation?.alternatives?.[letter]?.trim();
            const stateColor = isCorrectAlternative
              ? colors.green
              : isSelectedIncorrect
                ? colors.red
                : colors.muted;

            return (
              <View
                key={letter}
                style={[
                  styles.alternative,
                  isCorrectAlternative && styles.correctAlternative,
                  isSelectedIncorrect && styles.incorrectAlternative,
                ]}
              >
                <View style={styles.alternativeHeading}>
                  {isCorrectAlternative ? (
                    <CircleCheck color={stateColor} size={16} />
                  ) : isSelectedIncorrect ? (
                    <CircleX color={stateColor} size={16} />
                  ) : (
                    <Circle color={stateColor} size={16} />
                  )}
                  <Text style={[styles.alternativeLabel, { color: stateColor }]}>
                    {letter}
                    {isCorrectAlternative
                      ? letter === selectedAnswer
                        ? " · Sua resposta e gabarito corretos"
                        : " · Gabarito correto"
                      : isSelectedIncorrect
                        ? " · Sua resposta incorreta"
                        : " · Não selecionada"}
                  </Text>
                </View>
                {alternativeComment ? (
                  <Text style={styles.alternativeComment}>
                    {alternativeComment}
                  </Text>
                ) : null}
              </View>
            );
          })}

          {currentExplanationState.status === "loading" ? (
            <Text style={styles.message}>Carregando explicação...</Text>
          ) : currentExplanationState.status === "error" ? (
            <Text accessibilityRole="alert" style={styles.message}>
              {currentExplanationState.message}
            </Text>
          ) : !explanation ? (
            <Text style={styles.message}>
              Ainda não há uma explicação comentada disponível para esta
              questão. O gabarito permanece exibido e você pode continuar.
            </Text>
          ) : (
            <>
              {explanation.general?.trim() ? (
                <View style={styles.generalExplanation}>
                  <Text style={styles.sectionTitle}>Entenda a questão</Text>
                  <Text style={styles.body}>{explanation.general.trim()}</Text>
                </View>
              ) : !hasAlternativeComments ? (
                <Text style={styles.message}>
                  Ainda não há uma explicação comentada disponível para esta
                  questão. O gabarito permanece exibido e você pode continuar.
                </Text>
              ) : null}
              {explanation.source?.trim() ? (
                <Text style={styles.source}>
                  Fonte: {explanation.source.trim()}
                </Text>
              ) : null}
              <Text style={styles.reviewStatus}>
                {explanation.reviewStatus === "validated"
                  ? "Conteúdo validado"
                  : explanation.reviewStatus === "reviewed"
                    ? "Conteúdo revisado"
                    : "Conteúdo não revisado"}
              </Text>
            </>
          )}
          <PersonalQuestionNotes key={questionId} questionId={questionId} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  toggle: {
    minHeight: 62,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pressed: {
    opacity: 0.75,
  },
  heading: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  catalogLabel: {
    color: colors.blue,
    fontSize: 10,
    fontWeight: "800",
    paddingTop: 12,
    letterSpacing: 0.4,
  },
  toggleHint: {
    color: colors.blue,
    fontSize: 12,
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  resultText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  alternative: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 7,
  },
  correctAlternative: {
    borderColor: `${colors.green}80`,
    backgroundColor: `${colors.green}0D`,
  },
  incorrectAlternative: {
    borderColor: `${colors.red}80`,
    backgroundColor: `${colors.red}0D`,
  },
  alternativeHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  alternativeLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  alternativeComment: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    marginLeft: 23,
  },
  generalExplanation: {
    paddingTop: 12,
  },
  body: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  message: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    paddingTop: 12,
  },
  source: {
    color: colors.blue,
    fontSize: 12,
    lineHeight: 17,
    paddingTop: 12,
  },
  reviewStatus: {
    color: colors.muted,
    fontSize: 11,
    paddingTop: 6,
  },
  personalPanel: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  personalHeading: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "800",
  },
  personalDisclaimer: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  personalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  personalButton: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  personalButtonActive: {
    borderColor: colors.blue,
    backgroundColor: `${colors.blue}18`,
  },
  personalButtonText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  personalField: {
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: 12,
  },
  personalMultiline: {
    minHeight: 78,
  },
  personalNote: {
    gap: 7,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  personalLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  personalError: {
    color: colors.red,
    fontSize: 11,
    lineHeight: 16,
  },
});

function PersonalQuestionNotes({ questionId }: { questionId: string }) {
  const [record, setRecord] = useState<PersonalQuestionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [general, setGeneral] = useState("");
  const [alternatives, setAlternatives] = useState<
    Partial<Record<EnemAlternativeLetter, string>>
  >({});
  const [sourcesText, setSourcesText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let isActive = true;
    void getPersonalQuestionRecord(questionId)
      .then((loadedRecord) => {
        if (isActive) {
          setRecord(loadedRecord);
          setIsLoading(false);
        }
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar suas anotações.",
          );
          setIsLoading(false);
        }
      });
    return () => {
      isActive = false;
    };
  }, [questionId]);

  function beginEditing() {
    const explanation = record?.explanation;
    setGeneral(explanation?.general ?? "");
    setAlternatives(explanation?.alternatives ?? {});
    setSourcesText(explanation?.sources.join("\n") ?? "");
    setError(null);
    setConfirmDelete(false);
    setIsEditing(true);
  }

  async function toggleFlag(flag: "isFavorite" | "wantsReview") {
    setError(null);
    try {
      const current = record?.[flag] ?? false;
      setRecord(await setPersonalQuestionFlag(questionId, flag, !current));
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Não foi possível atualizar a marcação.",
      );
    }
  }

  async function saveNote() {
    const cleanedAlternatives = Object.fromEntries(
      Object.entries(alternatives)
        .map(([letter, value]) => [letter, value?.trim()])
        .filter((entry): entry is [string, string] => Boolean(entry[1])),
    ) as Partial<Record<EnemAlternativeLetter, string>>;
    const sources = sourcesText
      .split("\n")
      .map((source) => source.trim())
      .filter(Boolean);
    if (!general.trim() && Object.keys(cleanedAlternatives).length === 0) {
      setError("Escreva uma explicação geral ou pelo menos uma alternativa.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const updated = await savePersonalQuestionExplanation(questionId, {
        general: general.trim(),
        alternatives: cleanedAlternatives,
        sources,
      });
      setRecord(updated);
      setIsEditing(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar sua explicação.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function removeNote() {
    setError(null);
    try {
      setRecord(await deletePersonalQuestionExplanation(questionId));
      setConfirmDelete(false);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Não foi possível excluir sua explicação.",
      );
    }
  }

  const personalExplanation = record?.explanation;
  const personalAlternatives = Object.entries(
    personalExplanation?.alternatives ?? {},
  ).filter(([, value]) => value?.trim());

  return (
    <View style={styles.personalPanel}>
      <Text style={styles.personalHeading}>Suas anotações pessoais</Text>
      <Text style={styles.personalDisclaimer}>
        Privadas neste dispositivo e independentes da explicação do catálogo.
        Não alteram respostas, tentativas ou XP.
      </Text>
      <View style={styles.personalActions}>
        <PersonalFlagButton
          active={record?.isFavorite ?? false}
          label={record?.isFavorite ? "Favorita" : "Favoritar"}
          onPress={() => void toggleFlag("isFavorite")}
        />
        <PersonalFlagButton
          active={record?.wantsReview ?? false}
          label={record?.wantsReview ? "Quero revisar" : "Marcar para revisar"}
          onPress={() => void toggleFlag("wantsReview")}
        />
      </View>
      {isLoading ? (
        <Text style={styles.message}>Carregando suas anotações...</Text>
      ) : isEditing ? (
        <>
          <TextInput
            accessibilityLabel="Explicação pessoal geral"
            maxLength={5000}
            multiline
            onChangeText={setGeneral}
            placeholder="Sua explicação geral"
            placeholderTextColor={colors.muted}
            style={[styles.personalField, styles.personalMultiline]}
            textAlignVertical="top"
            value={general}
          />
          {(["A", "B", "C", "D", "E"] as const).map((letter) => (
            <TextInput
              key={letter}
              accessibilityLabel={`Sua explicação da alternativa ${letter}`}
              maxLength={5000}
              multiline
              onChangeText={(value) =>
                setAlternatives((current) => ({ ...current, [letter]: value }))
              }
              placeholder={`Alternativa ${letter} (opcional)`}
              placeholderTextColor={colors.muted}
              style={[styles.personalField, styles.personalMultiline]}
              textAlignVertical="top"
              value={alternatives[letter] ?? ""}
            />
          ))}
          <TextInput
            accessibilityLabel="Fontes consultadas"
            maxLength={5000}
            multiline
            onChangeText={setSourcesText}
            placeholder="Fontes consultadas (uma por linha)"
            placeholderTextColor={colors.muted}
            style={[styles.personalField, styles.personalMultiline]}
            textAlignVertical="top"
            value={sourcesText}
          />
          <View style={styles.personalActions}>
            <PersonalFlagButton
              active={false}
              label={isSaving ? "Salvando..." : "Salvar explicação"}
              icon={Save}
              disabled={isSaving}
              onPress={() => void saveNote()}
            />
            <PersonalFlagButton
              active={false}
              label="Cancelar"
              disabled={isSaving}
              onPress={() => setIsEditing(false)}
            />
          </View>
        </>
      ) : personalExplanation ? (
        <>
          <View style={styles.personalNote}>
            {personalExplanation.general.trim() ? (
              <>
                <Text style={styles.personalLabel}>Explicação geral</Text>
                <Text style={styles.body}>{personalExplanation.general}</Text>
              </>
            ) : null}
            {personalAlternatives.map(([letter, value]) => (
              <View key={letter}>
                <Text style={styles.personalLabel}>
                  Alternativa {letter} · anotação pessoal
                </Text>
                <Text style={styles.body}>{value}</Text>
              </View>
            ))}
            {personalExplanation.sources.length ? (
              <View>
                <Text style={styles.personalLabel}>Fontes consultadas</Text>
                {personalExplanation.sources.map((source, index) => (
                  <Text key={`source-${index}`} style={styles.source}>
                    {source}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
          {confirmDelete ? (
            <View style={styles.personalActions}>
              <PersonalFlagButton
                active={false}
                label="Confirmar exclusão"
                icon={Trash2}
                onPress={() => void removeNote()}
              />
              <PersonalFlagButton
                active={false}
                label="Cancelar"
                onPress={() => setConfirmDelete(false)}
              />
            </View>
          ) : (
            <View style={styles.personalActions}>
              <PersonalFlagButton
                active={false}
                label="Editar anotação"
                icon={Pencil}
                onPress={beginEditing}
              />
              <PersonalFlagButton
                active={false}
                label="Excluir anotação"
                icon={Trash2}
                onPress={() => setConfirmDelete(true)}
              />
            </View>
          )}
        </>
      ) : (
        <PersonalFlagButton
          active={false}
          label="Criar explicação pessoal"
          icon={Pencil}
          onPress={beginEditing}
        />
      )}
      {error ? (
        <Text accessibilityRole="alert" style={styles.personalError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function PersonalFlagButton({
  label,
  active,
  onPress,
  icon: Icon,
  disabled = false,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: typeof Bookmark;
  disabled?: boolean;
}) {
  const ButtonIcon = active ? BookmarkCheck : Icon ?? Bookmark;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.personalButton,
        active && styles.personalButtonActive,
        disabled && styles.pressed,
      ]}
    >
      <ButtonIcon color={active ? colors.blue : colors.muted} size={15} />
      <Text style={styles.personalButtonText}>{label}</Text>
    </Pressable>
  );
}
