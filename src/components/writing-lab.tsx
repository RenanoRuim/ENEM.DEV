import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  Download,
  FilePenLine,
  ListChecks,
  NotebookPen,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  type LucideIcon,
} from "lucide-react-native";
import * as Linking from "expo-linking";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { WritingTopicManager } from "@/components/writing-topic-manager";
import { WritingPromptImageView } from "@/components/writing-prompt-image";
import { useIsWideLayout } from "@/hooks/use-is-wide-layout";
import {
  exportWritingJson,
  exportWritingPdf,
  exportWritingText,
} from "@/services/export-writing";
import {
  createPersonalWritingTopic,
  deletePersonalWritingTopic,
  duplicatePersonalWritingTopic,
  exportPersonalWritingTopics,
  getPersonalWritingTopics,
  importPersonalWritingTopics,
  savePersonalWritingTopic,
} from "@/services/personal-writing-topics";
import {
  createWritingEssay,
  deleteWritingEssay,
  duplicateWritingEssay,
  getElapsedWritingSeconds,
  getWritingEssays,
  saveWritingEssay,
  setWritingStatus,
} from "@/services/writing-storage";
import { removeUnusedWritingPromptImages } from "@/services/writing-prompt-images";
import { writingTopics } from "@/services/writing-topic-catalog";
import type {
  WritingCompetencyId,
  WritingEssay,
  WritingStatus,
  WritingTopic,
} from "@/types/writing";

const colors = {
  background: "#0D1117",
  surface: "#161B22",
  border: "#30363D",
  text: "#E6EDF3",
  muted: "#8B949E",
  green: "#39D353",
  blue: "#58A6FF",
  red: "#F85149",
  orange: "#F0883E",
};

type LabView = "catalog" | "topic" | "mine" | "editor";
type EssayFilter = "all" | WritingStatus;
type SaveState = "saved" | "unsaved" | "saving" | "error";
type TopicManagerMode = "create" | "edit" | "import";

const competencies: {
  id: WritingCompetencyId;
  title: string;
  description: string;
  observe: string;
}[] = [
  {
    id: "I",
    title: "Competência I",
    description:
      "Domínio da modalidade escrita formal da língua portuguesa.",
    observe:
      "Revise ortografia, acentuação, pontuação, concordância, regência, construção sintática e adequação ao registro formal.",
  },
  {
    id: "II",
    title: "Competência II",
    description:
      "Compreensão da proposta e aplicação de conhecimentos de diferentes áreas.",
    observe:
      "Mantenha-se no tema, desenvolva o texto dissertativo-argumentativo e use repertório pertinente e produtivo.",
  },
  {
    id: "III",
    title: "Competência III",
    description: "Seleção e organização de informações e argumentos.",
    observe:
      "Verifique se a tese está clara e se informações e argumentos são selecionados, relacionados e organizados para defendê-la.",
  },
  {
    id: "IV",
    title: "Competência IV",
    description:
      "Uso de mecanismos linguísticos para construção da argumentação.",
    observe:
      "Observe a articulação entre frases e parágrafos, a progressão das ideias e o uso adequado de conectivos e referências.",
  },
  {
    id: "V",
    title: "Competência V",
    description:
      "Elaboração de proposta de intervenção respeitando os direitos humanos.",
    observe:
      "Confira se a proposta responde ao problema e apresenta ação, agente, meio de execução, efeito esperado e detalhamento, respeitando os direitos humanos.",
  },
];

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data indisponível"
    : date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function getTopic(topicId: string): WritingTopic | undefined {
  return writingTopics.find((topic) => topic.id === topicId);
}

function makeEssayTitle(essay: WritingEssay): string {
  const topic = getTopic(essay.topicId) ?? essay.topicSnapshot;
  return essay.title.trim() || topic?.title || "Redação sem título";
}

export function WritingLabScreen() {
  const isWide = useIsWideLayout();
  const [view, setView] = useState<LabView>("catalog");
  const [returnView, setReturnView] = useState<LabView>("catalog");
  const [activeTopic, setActiveTopic] = useState<WritingTopic | null>(null);
  const [activeEssay, setActiveEssay] = useState<WritingEssay | null>(null);
  const [essays, setEssays] = useState<WritingEssay[]>([]);
  const [personalTopics, setPersonalTopics] = useState<WritingTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "official" | "authorial" | "personal"
  >(
    "all",
  );
  const [essayFilter, setEssayFilter] = useState<EssayFilter>("all");
  const [pendingDelete, setPendingDelete] = useState<WritingEssay | null>(null);
  const [pendingTopicDelete, setPendingTopicDelete] =
    useState<WritingTopic | null>(null);
  const [topicManagerMode, setTopicManagerMode] =
    useState<TopicManagerMode | null>(null);
  const [editingTopic, setEditingTopic] = useState<WritingTopic | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const refreshEssays = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [savedEssays, savedTopics] = await Promise.all([
        getWritingEssays(),
        getPersonalWritingTopics(),
      ]);
      setEssays(savedEssays);
      setPersonalTopics(savedTopics);
    } catch (error) {
      setLoadError(
        getErrorMessage(error, "Não foi possível carregar suas redações."),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshEssays();
    }, [refreshEssays]),
  );

  const availableTopics = [...personalTopics, ...writingTopics];
  const categories = Array.from(
    new Set(availableTopics.map((topic) => topic.category)),
  );
  const filteredTopics = availableTopics.filter((topic) => {
    const matchesSearch = topic.title
      .toLocaleLowerCase("pt-BR")
      .includes(search.trim().toLocaleLowerCase("pt-BR"));
    return (
      matchesSearch &&
      (categoryFilter === "Todas" || topic.category === categoryFilter) &&
      (typeFilter === "all" || topic.type === typeFilter)
    );
  });
  const filteredEssays = [...essays]
    .filter((essay) => essayFilter === "all" || essay.status === essayFilter)
    .sort((first, second) =>
      second.updatedAt.localeCompare(first.updatedAt),
    );

  async function startEssay(topic: WritingTopic) {
    const essay = createWritingEssay(topic);
    setActionError(null);
    try {
      await saveWritingEssay(essay);
      setEssays((current) => [essay, ...current]);
      setActiveEssay(essay);
      setReturnView("topic");
      setView("editor");
    } catch (error) {
      setActionError(
        getErrorMessage(error, "Não foi possível criar a redação."),
      );
    }
  }

  async function saveTopic(
    fields: Omit<WritingTopic, "id" | "type" | "createdAt">,
  ) {
    const topic = editingTopic
      ? { ...editingTopic, ...fields, type: "personal" as const }
      : createPersonalWritingTopic(fields);
    await savePersonalWritingTopic(topic);
    setPersonalTopics((current) =>
      current.some((item) => item.id === topic.id)
        ? current.map((item) => (item.id === topic.id ? topic : item))
        : [topic, ...current],
    );
    setActiveTopic((current) =>
      current?.id === topic.id ? topic : current,
    );
    setEditingTopic(null);
  }

  async function duplicateTopic(topic: WritingTopic) {
    setActionError(null);
    try {
      const copy = duplicatePersonalWritingTopic(topic);
      await savePersonalWritingTopic(copy);
      setPersonalTopics((current) => [copy, ...current]);
    } catch (error) {
      setActionError(
        getErrorMessage(error, "Não foi possível duplicar o tema."),
      );
    }
  }

  async function confirmDeleteTopic() {
    if (!pendingTopicDelete) {
      return;
    }
    setActionError(null);
    try {
      const removedImageIds =
        pendingTopicDelete.supportingTexts?.flatMap((item) =>
          (item.images ?? []).map((image) => image.id),
        ) ?? [];
      await deletePersonalWritingTopic(pendingTopicDelete.id);
      setPersonalTopics((current) =>
        current.filter((topic) => topic.id !== pendingTopicDelete.id),
      );
      setPendingTopicDelete(null);
      setActiveTopic(null);
      setView("catalog");
      if (removedImageIds.length > 0) {
        try {
          const [topics, savedEssays] = await Promise.all([
            getPersonalWritingTopics(),
            getWritingEssays(),
          ]);
          await removeUnusedWritingPromptImages(
            removedImageIds,
            topics,
            savedEssays,
          );
        } catch (cleanupError) {
          setActionError(
            `Tema excluído; algumas imagens não puderam ser removidas: ${getErrorMessage(cleanupError, "erro de armazenamento")}`,
          );
        }
      }
    } catch (error) {
      setActionError(
        getErrorMessage(error, "Não foi possível excluir o tema personalizado."),
      );
    }
  }

  async function exportTopics() {
    setActionError(null);
    try {
      await exportWritingJson(
        "temas-personalizados-enem-dev",
        exportPersonalWritingTopics(personalTopics),
      );
      setActionMessage(
        "Temas exportados. Imagens não acompanham o JSON e permanecem vinculadas ao tema original neste dispositivo.",
      );
    } catch (error) {
      setActionError(
        getErrorMessage(error, "Não foi possível exportar os temas."),
      );
    }
  }

  async function importTopics(json: string) {
    const result = await importPersonalWritingTopics(json, writingTopics);
    setPersonalTopics(await getPersonalWritingTopics());
    setActionError(null);
    setActionMessage(
      `Importação concluída: ${result.imported} tema(s) adicionado(s), ${result.duplicates} duplicata(s) ignorada(s).`,
    );
  }

  function openEssay(essay: WritingEssay) {
    setActiveEssay(essay);
    setReturnView("mine");
    setView("editor");
    setActionError(null);
  }

  async function duplicateEssay(essay: WritingEssay) {
    const copy = duplicateWritingEssay(essay);
    setActionError(null);
    try {
      await saveWritingEssay(copy);
      setEssays((current) => [copy, ...current]);
    } catch (error) {
      setActionError(
        getErrorMessage(error, "Não foi possível duplicar a redação."),
      );
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    setIsDeleting(true);
    setActionError(null);
    try {
      const removedImageIds =
        pendingDelete.topicSnapshot?.supportingTexts?.flatMap((item) =>
          (item.images ?? []).map((image) => image.id),
        ) ?? [];
      await deleteWritingEssay(pendingDelete.id);
      setEssays((current) =>
        current.filter((essay) => essay.id !== pendingDelete.id),
      );
      setPendingDelete(null);
      if (removedImageIds.length > 0) {
        try {
          const [topics, remainingEssays] = await Promise.all([
            getPersonalWritingTopics(),
            getWritingEssays(),
          ]);
          await removeUnusedWritingPromptImages(
            removedImageIds,
            topics,
            remainingEssays,
          );
        } catch (cleanupError) {
          setActionError(
            `Redação excluída, mas não foi possível limpar algumas imagens: ${getErrorMessage(cleanupError, "erro de armazenamento")}`,
          );
        }
      }
    } catch (error) {
      setActionError(
        getErrorMessage(error, "Não foi possível excluir a redação."),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function exportEssay(essay: WritingEssay, format: "txt" | "pdf") {
    setIsExporting(essay.id);
    setActionError(null);
    try {
      const topic = getTopic(essay.topicId) ?? essay.topicSnapshot;
      const title = makeEssayTitle(essay);
      const topicTitle = topic?.title ?? "Tema não disponível no registro";
      if (format === "pdf") {
        await exportWritingPdf(title, topicTitle, essay.text);
      } else {
        await exportWritingText(title, topicTitle, essay.text);
      }
    } catch (error) {
      setActionError(
        getErrorMessage(error, "Não foi possível exportar a redação."),
      );
    } finally {
      setIsExporting(null);
    }
  }

  function handleEssayChange(nextEssay: WritingEssay) {
    setActiveEssay(nextEssay);
    setEssays((current) => {
      const exists = current.some((essay) => essay.id === nextEssay.id);
      return exists
        ? current.map((essay) =>
            essay.id === nextEssay.id ? nextEssay : essay,
          )
        : [nextEssay, ...current];
    });
  }

  function backFromEditor() {
    setView(returnView);
    if (returnView === "catalog" && activeTopic) {
      setView("topic");
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Redação Lab" />
      <View style={[styles.page, isWide && styles.pageWide]}>
        {view !== "editor" ? (
          <View style={styles.internalNavigation}>
            <InternalNavButton
              label="Catálogo de temas"
              active={view === "catalog" || view === "topic"}
              icon={BookOpen}
              onPress={() => {
                setView("catalog");
                setActiveTopic(null);
                setActionError(null);
              }}
            />
            <InternalNavButton
              label="Minhas redações"
              active={view === "mine"}
              icon={FilePenLine}
              onPress={() => {
                setView("mine");
                setActionError(null);
              }}
            />
          </View>
        ) : null}

        {actionMessage ? (
          <Text accessibilityRole="status" style={styles.successBanner}>
            {actionMessage}
          </Text>
        ) : null}
        {actionError ? (
          <Text accessibilityRole="alert" style={styles.errorBanner}>
            {actionError}
          </Text>
        ) : null}

        {view === "catalog" ? (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.intro}>
              <Text style={styles.eyebrow}>ENEM.DEV · PRÁTICA DE ESCRITA</Text>
              <Text style={styles.title}>Escolha um tema e comece a escrever.</Text>
              <Text style={styles.description}>
                Explore propostas, desenvolva seus argumentos e revise seus
                textos no seu ritmo.
              </Text>
              <View style={styles.topicTools}>
                <PrimaryButton
                  label="Criar tema"
                  icon={Plus}
                  onPress={() => {
                    setEditingTopic(null);
                    setTopicManagerMode("create");
                  }}
                />
                <SecondaryButton
                  label="Importar JSON"
                  onPress={() => setTopicManagerMode("import")}
                />
                <SecondaryButton
                  label="Exportar temas"
                  onPress={() => void exportTopics()}
                />
              </View>
            </View>

            <View style={styles.filterPanel}>
              <View style={styles.searchBox}>
                <Search color={colors.muted} size={17} />
                <TextInput
                  accessibilityLabel="Pesquisar tema pelo título"
                  placeholder="Pesquisar título..."
                  placeholderTextColor={colors.muted}
                  value={search}
                  onChangeText={setSearch}
                  style={styles.searchInput}
                  returnKeyType="search"
                />
              </View>
              <Text style={styles.filterLabel}>CATEGORIA</Text>
              <View style={styles.chipRow}>
                {["Todas", ...categories].map((category) => (
                  <ChoiceChip
                    key={category}
                    label={category}
                    selected={categoryFilter === category}
                    onPress={() => setCategoryFilter(category)}
                  />
                ))}
              </View>
              <Text style={styles.filterLabel}>TIPO DE TEMA</Text>
              <View style={styles.chipRow}>
                <ChoiceChip
                  label="Todos"
                  selected={typeFilter === "all"}
                  onPress={() => setTypeFilter("all")}
                />
                <ChoiceChip
                  label="Oficiais"
                  selected={typeFilter === "official"}
                  onPress={() => setTypeFilter("official")}
                />
                <ChoiceChip
                  label="Autorais"
                  selected={typeFilter === "authorial"}
                  onPress={() => setTypeFilter("authorial")}
                />
                <ChoiceChip
                  label="Personalizados"
                  selected={typeFilter === "personal"}
                  onPress={() => setTypeFilter("personal")}
                />
              </View>
            </View>

            {filteredTopics.length > 0 ? (
              <View style={styles.topicGrid}>
                {filteredTopics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    onPress={() => {
                      setActiveTopic(topic);
                      setView("topic");
                    }}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                title="Nenhum tema encontrado"
                description="Revise a busca e os filtros selecionados."
              />
            )}
          </ScrollView>
        ) : null}

        {view === "topic" && activeTopic ? (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <BackButton label="Voltar ao catálogo" onPress={() => setView("catalog")} />
            <View style={styles.detailCard}>
              <TopicBadges topic={activeTopic} />
              <Text style={styles.detailTitle}>{activeTopic.title}</Text>
              <Text style={styles.sectionHeading}>Proposta de redação</Text>
              <Text style={styles.bodyCopy}>{activeTopic.description}</Text>
              {activeTopic.supportingTexts?.length ? (
                <View style={styles.motivatorSection}>
                  <Text style={styles.sectionHeading}>Textos motivadores</Text>
                  {activeTopic.supportingTexts.map((text, index) => (
                    <View key={`${activeTopic.id}-text-${index}`} style={styles.motivatorCard}>
                      <Text style={styles.motivatorTitle}>{text.title}</Text>
                      <Text style={styles.bodyCopy}>{text.text}</Text>
                      {text.images?.length ? (
                        <View style={styles.promptImages}>
                          {text.images.map((image) => (
                            <View key={image.id} style={styles.promptImage}>
                              <WritingPromptImageView image={image} />
                            </View>
                          ))}
                        </View>
                      ) : null}
                      {text.source ? (
                        <Text style={styles.sourceText}>{text.source}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
              {activeTopic.source ? (
                <Text style={styles.sourceText}>{activeTopic.source}</Text>
              ) : null}
              {activeTopic.references?.length ? (
                <View style={styles.references}>
                  <Text style={styles.sectionHeading}>Referências</Text>
                  {activeTopic.references.map((reference, index) => (
                    <Text key={`${activeTopic.id}-reference-${index}`} style={styles.sourceText}>
                      · {reference}
                    </Text>
                  ))}
                </View>
              ) : null}
              <PrimaryButton
                label="Começar redação"
                icon={NotebookPen}
                onPress={() => void startEssay(activeTopic)}
              />
              {activeTopic.type === "personal" ? (
                <View style={styles.topicTools}>
                  <SecondaryButton
                    label="Editar tema"
                    onPress={() => {
                      setEditingTopic(activeTopic);
                      setTopicManagerMode("edit");
                    }}
                  />
                  <SecondaryButton
                    label="Duplicar tema"
                    onPress={() => void duplicateTopic(activeTopic)}
                  />
                  <SecondaryButton
                    label="Excluir tema"
                    destructive
                    onPress={() => setPendingTopicDelete(activeTopic)}
                  />
                </View>
              ) : null}
            </View>
          </ScrollView>
        ) : null}

        {view === "mine" ? (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionIntro}>
              <View>
                <Text style={styles.title}>Minhas redações</Text>
                <Text style={styles.description}>
                  Seus textos ficam salvos neste dispositivo.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setView("catalog");
                  setActiveTopic(null);
                }}
                style={styles.newEssayButton}
              >
                <Plus color={colors.green} size={17} />
                <Text style={styles.newEssayText}>Novo tema</Text>
              </Pressable>
            </View>
            <View style={styles.chipRow}>
              {(
                [
                  ["all", "Todas"],
                  ["draft", "Rascunhos"],
                  ["completed", "Concluídas"],
                ] as const
              ).map(([value, label]) => (
                <ChoiceChip
                  key={value}
                  label={label}
                  selected={essayFilter === value}
                  onPress={() => setEssayFilter(value)}
                />
              ))}
            </View>

            {isLoading ? (
              <ActivityIndicator color={colors.green} style={styles.loader} />
            ) : loadError ? (
              <EmptyState
                title="Não foi possível carregar"
                description={loadError}
                actionLabel="Tentar novamente"
                onAction={() => void refreshEssays()}
              />
            ) : filteredEssays.length ? (
              <View style={styles.essayList}>
                {filteredEssays.map((essay) => (
                  <EssayCard
                    key={essay.id}
                    essay={essay}
                    onOpen={() => openEssay(essay)}
                    onDuplicate={() => void duplicateEssay(essay)}
                    onExport={(format) => void exportEssay(essay, format)}
                    onDelete={() => setPendingDelete(essay)}
                    isExporting={isExporting === essay.id}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                title="Ainda não há redações"
                description="Escolha um tema no catálogo para criar seu primeiro rascunho."
                actionLabel="Explorar temas"
                onAction={() => setView("catalog")}
              />
            )}
          </ScrollView>
        ) : null}

        {view === "editor" && activeEssay ? (
          <EssayEditor
            key={activeEssay.id}
            essay={activeEssay}
            isWide={isWide}
            onBack={backFromEditor}
            onChange={handleEssayChange}
            onSaveError={setActionError}
          />
        ) : null}
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={pendingDelete !== null}
        onRequestClose={() => {
          if (!isDeleting) {
            setPendingDelete(null);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmation}>
            <Text style={styles.confirmationTitle}>Excluir redação?</Text>
            <Text style={styles.confirmationText}>
              Esta ação removerá o texto salvo deste dispositivo e não poderá
              ser desfeita.
            </Text>
            <View style={styles.confirmationActions}>
              <SecondaryButton
                label="Cancelar"
                disabled={isDeleting}
                onPress={() => setPendingDelete(null)}
              />
              <PrimaryButton
                label={isDeleting ? "Excluindo..." : "Excluir"}
                icon={Trash2}
                destructive
                disabled={isDeleting}
                onPress={() => void confirmDelete()}
              />
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        transparent
        animationType="fade"
        visible={pendingTopicDelete !== null}
        onRequestClose={() => setPendingTopicDelete(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmation}>
            <Text style={styles.confirmationTitle}>Excluir tema?</Text>
            <Text style={styles.confirmationText}>
              Redações já vinculadas serão preservadas com uma cópia das
              informações deste tema.
            </Text>
            <View style={styles.confirmationActions}>
              <SecondaryButton
                label="Cancelar"
                onPress={() => setPendingTopicDelete(null)}
              />
              <PrimaryButton
                label="Excluir tema"
                icon={Trash2}
                destructive
                onPress={() => void confirmDeleteTopic()}
              />
            </View>
          </View>
        </View>
      </Modal>
      {topicManagerMode ? (
        <WritingTopicManager
          key={`${topicManagerMode}:${editingTopic?.id ?? "new"}`}
          mode={topicManagerMode}
          topic={editingTopic}
          onClose={() => {
            setTopicManagerMode(null);
            setEditingTopic(null);
          }}
          onSave={saveTopic}
          onImport={importTopics}
        />
      ) : null}
    </View>
  );
}

function EssayEditor({
  essay: initialEssay,
  isWide,
  onBack,
  onChange,
  onSaveError,
}: {
  essay: WritingEssay;
  isWide: boolean;
  onBack: () => void;
  onChange: (essay: WritingEssay) => void;
  onSaveError: (message: string) => void;
}) {
  const topic = getTopic(initialEssay.topicId) ?? initialEssay.topicSnapshot;
  const insets = useSafeAreaInsets();
  const [essay, setEssay] = useState(initialEssay);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [clockNow, setClockNow] = useState(Date.now);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideLinkError, setGuideLinkError] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestEssay = useRef(essay);
  const dirty = useRef(false);
  const isMounted = useRef(true);
  const saveCallback = useRef<(value: WritingEssay) => Promise<void>>(
    async () => {},
  );
  const inFlightSave = useRef<{
    snapshot: string;
    promise: Promise<void>;
  } | null>(null);
  const onSaveErrorRef = useRef(onSaveError);

  useEffect(() => {
    latestEssay.current = essay;
    onSaveErrorRef.current = onSaveError;
  }, [essay, onSaveError]);

  useEffect(() => {
    saveCallback.current = async (value) => {
      if (!dirty.current && value === latestEssay.current) {
        if (isMounted.current) {
          setSaveState("saved");
        }
        return;
      }
      const snapshot = JSON.stringify(value);
      if (inFlightSave.current?.snapshot === snapshot) {
        return inFlightSave.current.promise;
      }

      const promise = (async () => {
        if (isMounted.current) {
          setSaveState("saving");
          setSaveError(null);
        }
        try {
          await saveWritingEssay(value);
          if (latestEssay.current === value) {
            dirty.current = false;
            if (isMounted.current) {
              setSaveState("saved");
            }
          }
        } catch (error) {
          const message = getErrorMessage(
            error,
            "Não foi possível salvar sua redação.",
          );
          if (isMounted.current) {
            setSaveError(message);
            setSaveState("error");
          } else {
            onSaveErrorRef.current(message);
          }
        }
      })();
      inFlightSave.current = { snapshot, promise };
      try {
        await promise;
      } finally {
        if (inFlightSave.current?.promise === promise) {
          inFlightSave.current = null;
        }
      }
    };
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
      if (dirty.current) {
        void saveCallback.current(latestEssay.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!essay.timerStartedAt) {
      return;
    }
    const interval = setInterval(() => setClockNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [essay.timerStartedAt]);

  function scheduleSave(nextEssay: WritingEssay) {
    dirty.current = true;
    setSaveState("unsaved");
    onChange(nextEssay);
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }
    saveTimeout.current = setTimeout(() => {
      saveTimeout.current = null;
      void saveCallback.current(nextEssay);
    }, 700);
  }

  function updateEssay(
    update: (current: WritingEssay) => WritingEssay,
  ) {
    const nextEssay = {
      ...update(latestEssay.current),
      updatedAt: new Date().toISOString(),
    };
    latestEssay.current = nextEssay;
    setEssay(nextEssay);
    scheduleSave(nextEssay);
  }

  function handleSaveNow() {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
    if (!dirty.current) {
      setSaveState("saved");
      return;
    }
    void saveCallback.current(latestEssay.current);
  }

  function toggleTimer() {
    const current = latestEssay.current;
    if (current.timerStartedAt) {
      const nextEssay = {
        ...current,
        elapsedSeconds: getElapsedWritingSeconds(current),
        timerStartedAt: null,
        updatedAt: new Date().toISOString(),
      };
      latestEssay.current = nextEssay;
      setEssay(nextEssay);
      scheduleSave(nextEssay);
      return;
    }
    updateEssay((value) => ({
      ...value,
      timerStartedAt: new Date().toISOString(),
    }));
  }

  function toggleCompetency(id: WritingCompetencyId) {
    updateEssay((current) => ({
      ...current,
      reviewedCompetencies: current.reviewedCompetencies.includes(id)
        ? current.reviewedCompetencies.filter((item) => item !== id)
        : [...current.reviewedCompetencies, id],
    }));
  }

  async function completeEssay() {
    const currentEssay = latestEssay.current;
    const completed = setWritingStatus(
      {
        ...currentEssay,
        elapsedSeconds: getElapsedWritingSeconds(currentEssay),
        timerStartedAt: null,
      },
      "completed",
    );
    latestEssay.current = completed;
    setEssay(completed);
    dirty.current = true;
    onChange(completed);
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
    await saveCallback.current(completed);
  }

  const statusLabel: Record<SaveState, string> = {
    saved: "Salvo neste dispositivo",
    unsaved: "Alterações pendentes de salvamento",
    saving: "Salvando...",
    error: `Falha ao salvar: ${saveError ?? "erro desconhecido"}`,
  };
  const wordCount = countWords(essay.text);
  const editorWidthStyle = isWide ? styles.editorColumnWide : null;

  return (
    <KeyboardAvoidingView
      style={styles.editorFlex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          styles.editorContent,
          editorWidthStyle,
          { paddingBottom: Math.max(24, insets.bottom + 24) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackButton label="Voltar" onPress={onBack} />
        {topic ? (
          <View style={styles.editorTopic}>
            <Text style={styles.filterLabel}>TEMA SELECIONADO</Text>
            <Text style={styles.editorTopicTitle}>{topic.title}</Text>
            <Text style={styles.bodyCopy}>{topic.description}</Text>
          </View>
        ) : null}

        <View style={styles.editorHeading}>
          <View style={styles.editorTitleCopy}>
            <Text style={styles.title}>Editor de redação</Text>
            <Text style={styles.description}>
              Escreva com calma. Seu progresso é salvo apenas neste dispositivo.
            </Text>
          </View>
          <View style={styles.saveIndicator}>
            {saveState === "saving" ? (
              <ActivityIndicator color={colors.blue} size="small" />
            ) : saveState === "saved" ? (
              <CheckCircle2 color={colors.green} size={15} />
            ) : (
              <Clock3
                color={saveState === "error" ? colors.red : colors.orange}
                size={15}
              />
            )}
            <Text
              style={[
                styles.saveIndicatorText,
                saveState === "error" && styles.errorText,
              ]}
            >
              {statusLabel[saveState]}
            </Text>
          </View>
        </View>

        <Text style={styles.filterLabel}>TÍTULO DA REDAÇÃO</Text>
        <TextInput
          accessibilityLabel="Título da redação"
          value={essay.title}
          onChangeText={(title) =>
            updateEssay((current) => ({ ...current, title }))
          }
          placeholder="Dê um título ao seu texto"
          placeholderTextColor={colors.muted}
          style={styles.titleInput}
          maxLength={120}
          returnKeyType="next"
        />

        <View style={styles.timerAndCount}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              essay.timerStartedAt ? "Pausar cronômetro" : "Iniciar cronômetro"
            }
            onPress={toggleTimer}
            style={styles.timerButton}
          >
            {essay.timerStartedAt ? (
              <Pause color={colors.blue} size={16} />
            ) : (
              <Play color={colors.blue} size={16} />
            )}
            <Text style={styles.timerText}>
              {formatDuration(getElapsedWritingSeconds(essay, clockNow))}
            </Text>
            <Text style={styles.timerAction}>
              {essay.timerStartedAt ? "Pausar" : "Cronometrar"}
            </Text>
          </Pressable>
          <View style={styles.wordCount}>
            <Text style={styles.wordCountValue}>{wordCount}</Text>
            <Text style={styles.wordCountLabel}>palavras</Text>
          </View>
        </View>
        <Text style={styles.wordCountNote}>
          Contagem de palavras para acompanhamento pessoal; não equivale ao
          limite de linhas da folha oficial do ENEM.
        </Text>

        <TextInput
          accessibilityLabel="Texto da redação"
          value={essay.text}
          onChangeText={(text) =>
            updateEssay((current) => ({ ...current, text }))
          }
          placeholder="Comece a desenvolver sua redação aqui..."
          placeholderTextColor={colors.muted}
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
          style={styles.essayInput}
        />

        <View style={styles.guideCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isGuideOpen }}
            onPress={() => setIsGuideOpen((open) => !open)}
            style={styles.guideToggle}
          >
            <View style={styles.guideTitleCopy}>
              <Text style={styles.sectionHeading}>Guia de Competências</Text>
              <Text style={styles.guideSubtitle}>
                Referência didática da Cartilha do Participante do ENEM 2026
              </Text>
            </View>
            {isGuideOpen ? (
              <ChevronUp color={colors.text} size={19} />
            ) : (
              <ChevronDown color={colors.text} size={19} />
            )}
          </Pressable>
          {isGuideOpen ? (
            <View style={styles.guideContent}>
              <Text style={styles.guideDisclaimer}>
                Cada competência recebe de 0 a 200 pontos. A escala oficial
                utiliza os níveis 0, 40, 80, 120, 160 e 200. Este guia é
                informativo e não atribui nota.
              </Text>
              {competencies.map((competency) => (
                <View key={competency.id} style={styles.guideCompetency}>
                  <Text style={styles.competencyTitle}>
                    {competency.title}
                  </Text>
                  <Text style={styles.competencyDescription}>
                    {competency.description}
                  </Text>
                  <Text style={styles.guideObserve}>
                    <Text style={styles.guideObserveLabel}>Para observar: </Text>
                    {competency.observe}
                  </Text>
                </View>
              ))}
              <Pressable
                accessibilityRole="link"
                onPress={() => {
                  setGuideLinkError(null);
                  void Linking.openURL(
                    "https://www.gov.br/inep/pt-br/centrais-de-conteudo/acervo-linha-editorial/publicacoes-institucionais/avaliacoes-e-exames-da-educacao-basica/a-redacao-do-enem-2026-cartilha-do-a-participante",
                  ).catch((error: unknown) => {
                    setGuideLinkError(
                      error instanceof Error
                        ? error.message
                        : "Não foi possível abrir a Cartilha do INEP.",
                    );
                  });
                }}
                style={styles.guideSourceLink}
              >
                <Text style={styles.guideLinkText}>
                  Abrir Cartilha do Participante (INEP)
                </Text>
                <ExternalLink color={colors.blue} size={15} />
              </Pressable>
              {guideLinkError ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {guideLinkError}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.checklistCard}>
          <View style={styles.checklistHeading}>
            <ListChecks color={colors.blue} size={18} />
            <View style={styles.checklistTitleCopy}>
              <Text style={styles.sectionHeading}>Checklist de revisão</Text>
              <Text style={styles.checklistDisclaimer}>
                Autoavaliação pessoal; não equivale à correção oficial nem gera
                nota.
              </Text>
            </View>
          </View>
          {competencies.map((competency) => {
            const checked = essay.reviewedCompetencies.includes(competency.id);
            return (
              <Pressable
                key={competency.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => toggleCompetency(competency.id)}
                style={styles.competencyRow}
              >
                <View
                  style={[
                    styles.checkbox,
                    checked && styles.checkboxChecked,
                  ]}
                >
                  {checked ? <Check color={colors.background} size={13} /> : null}
                </View>
                <View style={styles.competencyCopy}>
                  <Text style={styles.competencyTitle}>{competency.title}</Text>
                  <Text style={styles.competencyDescription}>
                    {competency.description}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.editorActions}>
          <SecondaryButton
            label="Salvar agora"
            onPress={handleSaveNow}
            disabled={saveState === "saving"}
          />
          <PrimaryButton
            label={
              essay.status === "completed"
                ? "Salvar alterações"
                : "Concluir redação"
            }
            icon={CheckCircle2}
            onPress={() => {
              if (essay.status === "completed") {
                handleSaveNow();
              } else {
                void completeEssay();
              }
            }}
            disabled={saveState === "saving"}
          />
        </View>
        {saveState === "error" ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {saveError} O texto permanece no editor; tente salvar novamente.
          </Text>
        ) : null}
        <Text style={styles.editorFooter}>
          Status: {essay.status === "draft" ? "Rascunho" : "Concluída"}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InternalNavButton({
  label,
  active,
  icon: Icon,
  onPress,
}: {
  label: string;
  active: boolean;
  icon: LucideIcon;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.internalNavButton, active && styles.internalNavButtonActive]}
    >
      <Icon color={active ? colors.green : colors.muted} size={16} />
      <Text style={[styles.internalNavText, active && styles.internalNavTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function TopicBadges({ topic }: { topic: WritingTopic }) {
  const label =
    topic.type === "personal"
      ? "PERSONALIZADO"
      : topic.type === "authorial"
        ? "AUTORAL · ENEM.DEV"
        : "OFICIAL · ENEM";
  return (
    <View style={styles.topicBadges}>
      <Text
        style={[
          styles.typeBadge,
          topic.type === "authorial"
            ? styles.authorialBadge
            : topic.type === "personal"
              ? styles.personalBadge
              : styles.officialBadge,
        ]}
      >
        {label}
      </Text>
      <Text style={styles.categoryBadge}>
        {topic.year ? `${topic.year} · ` : ""}
        {topic.category}
      </Text>
    </View>
  );
}

function TopicCard({
  topic,
  onPress,
}: {
  topic: WritingTopic;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.topicCard, pressed && styles.pressed]}
    >
      <TopicBadges topic={topic} />
      <Text style={styles.topicTitle}>{topic.title}</Text>
      <Text numberOfLines={3} style={styles.topicDescription}>
        {topic.description}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardLink}>Ver proposta</Text>
        <BookOpen color={colors.blue} size={15} />
      </View>
    </Pressable>
  );
}

function EssayCard({
  essay,
  onOpen,
  onDuplicate,
  onExport,
  onDelete,
  isExporting,
}: {
  essay: WritingEssay;
  onOpen: () => void;
  onDuplicate: () => void;
  onExport: (format: "txt" | "pdf") => void;
  onDelete: () => void;
  isExporting: boolean;
}) {
  const topic = getTopic(essay.topicId) ?? essay.topicSnapshot;
  return (
    <View style={styles.essayCard}>
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.essayMain, pressed && styles.pressed]}
      >
        <View style={styles.essayHeading}>
          <Text style={styles.essayTitle}>{makeEssayTitle(essay)}</Text>
          <Text
            style={[
              styles.statusBadge,
              essay.status === "completed"
                ? styles.completedBadge
                : styles.draftBadge,
            ]}
          >
            {essay.status === "completed" ? "Concluída" : "Rascunho"}
          </Text>
        </View>
        <Text style={styles.essayTopic}>
          Tema: {topic?.title ?? "Tema removido do catálogo"}
        </Text>
        <Text style={styles.essayMeta}>
          Editada {formatDate(essay.updatedAt)} · {countWords(essay.text)}{" "}
          {countWords(essay.text) === 1 ? "palavra" : "palavras"}
        </Text>
      </Pressable>
      <View style={styles.essayActions}>
        <SmallAction
          label="Abrir e editar"
          icon={FilePenLine}
          onPress={onOpen}
        />
        <SmallAction label="Duplicar" icon={Copy} onPress={onDuplicate} />
        <SmallAction
          label={isExporting ? "Exportando..." : "Exportar TXT"}
          icon={Download}
          onPress={() => onExport("txt")}
          disabled={isExporting}
        />
        <SmallAction
          label={isExporting ? "Exportando..." : "Exportar PDF"}
          icon={Download}
          onPress={() => onExport("pdf")}
          disabled={isExporting}
        />
        <SmallAction
          label="Excluir"
          icon={Trash2}
          onPress={onDelete}
          destructive
        />
      </View>
    </View>
  );
}

function SmallAction({
  label,
  icon: Icon,
  onPress,
  disabled = false,
  destructive = false,
}: {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={styles.smallAction}
    >
      <Icon color={destructive ? colors.red : colors.muted} size={15} />
      <Text
        style={[
          styles.smallActionText,
          destructive && styles.errorText,
          disabled && styles.disabledText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function BackButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.backButton}
    >
      <ArrowLeft color={colors.blue} size={16} />
      <Text style={styles.backButtonText}>{label}</Text>
    </Pressable>
  );
}

function PrimaryButton({
  label,
  icon: Icon,
  onPress,
  disabled = false,
  destructive = false,
}: {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.primaryButton,
        destructive && styles.destructiveButton,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Icon color={colors.background} size={16} />
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
  disabled = false,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.secondaryButton, disabled && styles.buttonDisabled]}
    >
      <Text
        style={[
          styles.secondaryButtonText,
          destructive && styles.errorText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <NotebookPen color={colors.muted} size={24} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {actionLabel && onAction ? (
        <SecondaryButton label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
  },
  pageWide: {
    maxWidth: 1200,
  },
  internalNavigation: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  internalNavButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  internalNavButtonActive: {
    borderColor: colors.green,
    backgroundColor: `${colors.green}12`,
  },
  internalNavText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  internalNavTextActive: {
    color: colors.green,
  },
  content: {
    width: "100%",
    maxWidth: 1000,
    alignSelf: "center",
    padding: 16,
    paddingBottom: 28,
    gap: 16,
  },
  intro: {
    gap: 8,
    paddingVertical: 8,
  },
  eyebrow: {
    color: colors.green,
    fontSize: 9,
    letterSpacing: 1.1,
    fontWeight: "800",
  },
  title: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "700",
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  topicTools: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  filterPanel: {
    gap: 11,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  searchBox: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    paddingVertical: 9,
  },
  filterLabel: {
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  chip: {
    minHeight: 31,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  chipSelected: {
    borderColor: colors.blue,
    backgroundColor: `${colors.blue}18`,
  },
  chipText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: colors.blue,
  },
  topicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  topicCard: {
    width: "100%",
    maxWidth: 480,
    flexGrow: 1,
    gap: 11,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.8,
  },
  topicBadges: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },
  typeBadge: {
    overflow: "hidden",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 8,
    letterSpacing: 0.5,
    fontWeight: "800",
  },
  authorialBadge: {
    color: colors.orange,
    backgroundColor: `${colors.orange}20`,
  },
  personalBadge: {
    color: colors.blue,
    backgroundColor: `${colors.blue}20`,
  },
  officialBadge: {
    color: colors.green,
    backgroundColor: `${colors.green}20`,
  },
  categoryBadge: {
    color: colors.muted,
    fontSize: 10,
  },
  topicTitle: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
  topicDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 3,
  },
  cardLink: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "700",
  },
  detailCard: {
    gap: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  detailTitle: {
    color: colors.text,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "700",
  },
  sectionHeading: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  bodyCopy: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
  },
  motivatorSection: {
    gap: 10,
  },
  motivatorCard: {
    gap: 8,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    backgroundColor: colors.background,
  },
  promptImages: { gap: 12 },
  promptImage: { gap: 6 },
  motivatorTitle: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "700",
  },
  sourceText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  references: {
    gap: 5,
  },
  primaryButton: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: colors.green,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "800",
  },
  destructiveButton: {
    backgroundColor: colors.red,
  },
  secondaryButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  sectionIntro: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
  },
  newEssayButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  newEssayText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "700",
  },
  essayList: {
    gap: 10,
  },
  essayCard: {
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  essayMain: {
    gap: 7,
  },
  essayHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  essayTitle: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  statusBadge: {
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 9,
    fontWeight: "700",
  },
  completedBadge: {
    color: colors.green,
    backgroundColor: `${colors.green}18`,
  },
  draftBadge: {
    color: colors.blue,
    backgroundColor: `${colors.blue}18`,
  },
  essayTopic: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  essayMeta: {
    color: colors.muted,
    fontSize: 10,
  },
  essayActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  smallAction: {
    minHeight: 33,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 7,
  },
  smallActionText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "600",
  },
  disabledText: {
    opacity: 0.55,
  },
  loader: {
    marginTop: 32,
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 35,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyDescription: {
    color: colors.muted,
    maxWidth: 420,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  backButton: {
    alignSelf: "flex-start",
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  backButtonText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "700",
  },
  editorFlex: {
    flex: 1,
  },
  editorContent: {
    gap: 13,
  },
  editorColumnWide: {
    maxWidth: 850,
    paddingHorizontal: 28,
  },
  editorTopic: {
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    backgroundColor: colors.surface,
  },
  editorTopicTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
  },
  editorHeading: {
    gap: 10,
  },
  editorTitleCopy: {
    gap: 4,
  },
  saveIndicator: {
    minHeight: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  saveIndicatorText: {
    color: colors.muted,
    fontSize: 11,
  },
  errorText: {
    color: colors.red,
  },
  titleInput: {
    minHeight: 43,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 14,
  },
  timerAndCount: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timerButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  timerText: {
    color: colors.text,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  timerAction: {
    color: colors.blue,
    fontSize: 10,
  },
  wordCount: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
  },
  wordCountValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  wordCountLabel: {
    color: colors.muted,
    fontSize: 11,
  },
  wordCountNote: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
  },
  guideCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  guideToggle: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  guideTitleCopy: {
    flex: 1,
    gap: 4,
  },
  guideSubtitle: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
  },
  guideContent: {
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  guideDisclaimer: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  guideCompetency: {
    gap: 4,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  guideObserve: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 17,
  },
  guideObserveLabel: {
    color: colors.blue,
    fontWeight: "700",
  },
  guideSourceLink: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
  },
  guideLinkText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "700",
  },
  essayInput: {
    minHeight: 360,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 15,
    lineHeight: 25,
  },
  checklistCard: {
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  checklistHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  checklistTitleCopy: {
    flex: 1,
    gap: 4,
  },
  checklistDisclaimer: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
  },
  competencyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 6,
  },
  checkbox: {
    width: 19,
    height: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 5,
    backgroundColor: colors.background,
  },
  checkboxChecked: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  competencyCopy: {
    flex: 1,
    gap: 3,
  },
  competencyTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  competencyDescription: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  editorActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  editorFooter: {
    color: colors.muted,
    fontSize: 10,
    textAlign: "right",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#000000A8",
  },
  confirmation: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    gap: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  confirmationTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  confirmationText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  confirmationActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 5,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: `${colors.red}70`,
    borderRadius: 8,
    backgroundColor: `${colors.red}12`,
    color: colors.red,
    fontSize: 12,
    lineHeight: 18,
  },
  successBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    color: colors.green,
    fontSize: 12,
    lineHeight: 18,
  },
});
