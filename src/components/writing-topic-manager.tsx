import { Plus, RefreshCw, Trash2, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { WritingPromptImageView } from "@/components/writing-prompt-image";
import {
  MAX_PROMPT_IMAGE_SIZE,
  MAX_PROMPT_IMAGES_PER_TEXT,
  MAX_PROMPT_IMAGES_PER_TOPIC,
  removeUnusedWritingPromptImages,
  storeWritingPromptImage,
} from "@/services/writing-prompt-images";
import { getPersonalWritingTopics } from "@/services/personal-writing-topics";
import { getWritingEssays } from "@/services/writing-storage";
import type { WritingPromptImage, WritingTopic } from "@/types/writing";

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

type TopicForm = Omit<WritingTopic, "id" | "type" | "createdAt">;

const emptyForm: TopicForm = {
  title: "",
  category: "",
  description: "",
  supportingTexts: [],
  source: "",
  references: [],
};

function getInitialForm(topic: WritingTopic | null): TopicForm {
  return topic
    ? {
        title: topic.title,
        category: topic.category,
        description: topic.description,
        supportingTexts: topic.supportingTexts?.map((item) => ({ ...item })) ?? [],
        source: topic.source ?? "",
        references: topic.references ? [...topic.references] : [],
      }
    : emptyForm;
}

export function WritingTopicManager({
  mode,
  topic,
  onClose,
  onSave,
  onImport,
}: {
  mode: "create" | "edit" | "import";
  topic: WritingTopic | null;
  onClose: () => void;
  onSave: (fields: TopicForm) => Promise<void>;
  onImport: (json: string) => Promise<void>;
}) {
  const [form, setForm] = useState<TopicForm>(() => getInitialForm(topic));
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const stagedImageIds = useRef(new Set<string>());
  const didSave = useRef(false);

  async function closeManager() {
    if (isPickingImage) {
      return;
    }
    if (!didSave.current && stagedImageIds.current.size > 0) {
      try {
        const [topics, essays] = await Promise.all([
          getPersonalWritingTopics(),
          getWritingEssays(),
        ]);
        await removeUnusedWritingPromptImages(stagedImageIds.current, topics, essays);
        stagedImageIds.current.clear();
      } catch (cleanupError) {
        setError(
          cleanupError instanceof Error
            ? `Não foi possível remover imagens não salvas: ${cleanupError.message}`
            : "Não foi possível remover imagens não salvas.",
        );
        return;
      }
    }
    onClose();
  }

  async function submit() {
    setError(null);
    setIsSaving(true);
    try {
      if (mode === "import") {
        await onImport(json);
      } else {
        if (!form.title.trim() || !form.category.trim() || !form.description.trim()) {
          setError("Preencha título, categoria e descrição.");
          return;
        }
        const fields = {
          ...form,
          title: form.title.trim(),
          category: form.category.trim(),
          description: form.description.trim(),
          source: form.source?.trim() || undefined,
          references: form.references?.filter((item) => item.trim()).map((item) => item.trim()),
          supportingTexts: form.supportingTexts?.filter((item) => item.title.trim() || item.text.trim()),
        };
        await onSave(fields);
        didSave.current = true;
        stagedImageIds.current.clear();
        if (topic) {
          const previousImageIds =
            topic.supportingTexts?.flatMap((item) =>
              (item.images ?? []).map((image) => image.id),
            ) ?? [];
          const nextImageIds = new Set(
            fields.supportingTexts?.flatMap((item) =>
              (item.images ?? []).map((image) => image.id),
            ) ?? [],
          );
          const removedImageIds = previousImageIds.filter((id) => !nextImageIds.has(id));
          if (removedImageIds.length > 0) {
            const [topics, essays] = await Promise.all([
              getPersonalWritingTopics(),
              getWritingEssays(),
            ]);
            await removeUnusedWritingPromptImages(removedImageIds, topics, essays);
          }
        }
      }
      await closeManager();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível concluir a operação.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function pickImages(
    index: number,
    replaceIndex?: number,
  ) {
    setError(null);
    const textImages = form.supportingTexts?.[index]?.images ?? [];
    const totalImages = (form.supportingTexts ?? []).reduce(
      (total, item) => total + (item.images?.length ?? 0),
      0,
    );
    const remaining = Math.min(
      MAX_PROMPT_IMAGES_PER_TEXT - textImages.length,
      MAX_PROMPT_IMAGES_PER_TOPIC - totalImages,
    );
    const selectionLimit = replaceIndex === undefined ? remaining : 1;
    if (selectionLimit <= 0) {
      setError("Limite de imagens atingido: até 3 por texto e 10 por tema.");
      return;
    }

    setIsPickingImage(true);
    try {
      if (Platform.OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          throw new Error("Permita o acesso à galeria para adicionar imagens.");
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: replaceIndex === undefined,
        selectionLimit,
        quality: 0.85,
      });
      if (result.canceled) {
        return;
      }
      if (result.assets.length > selectionLimit) {
        throw new Error("A seleção excedeu o limite de imagens permitido.");
      }
      const storedImages: WritingPromptImage[] = [];
      try {
        for (const asset of result.assets) {
          if (asset.fileSize && asset.fileSize > MAX_PROMPT_IMAGE_SIZE) {
            throw new Error("Cada imagem deve ter no máximo 3 MB.");
          }
          const stored = await storeWritingPromptImage({
            uri: asset.uri,
            fileName: asset.fileName ?? null,
            mimeType: asset.mimeType ?? null,
            fileSize: asset.fileSize ?? null,
          });
          stagedImageIds.current.add(stored.id);
          storedImages.push(stored);
        }
      } catch (storeError) {
        if (storedImages.length > 0) {
          await removeUnusedWritingPromptImages(
            storedImages.map((image) => image.id),
            await getPersonalWritingTopics(),
            await getWritingEssays(),
          );
          for (const image of storedImages) {
            stagedImageIds.current.delete(image.id);
          }
        }
        throw storeError;
      }
      updateSupportingText(index, (value) => {
        const images = [...(value.images ?? [])];
        if (replaceIndex === undefined) {
          images.push(...storedImages);
        } else {
          const currentImage = images[replaceIndex];
          images[replaceIndex] = {
            ...storedImages[0],
            description: currentImage?.description,
            source: currentImage?.source,
          };
        }
        return { ...value, images };
      });
    } catch (pickError) {
      setError(
        pickError instanceof Error
          ? pickError.message
          : "Não foi possível adicionar as imagens.",
      );
    } finally {
      setIsPickingImage(false);
    }
  }

  function updateSupportingText(
    index: number,
    update: (value: NonNullable<TopicForm["supportingTexts"]>[number]) => NonNullable<TopicForm["supportingTexts"]>[number],
  ) {
    setForm((current) => ({
      ...current,
      supportingTexts: (current.supportingTexts ?? []).map((item, itemIndex) =>
        itemIndex === index ? update(item) : item,
      ),
    }));
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => void closeManager()}
      transparent
      visible
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Text style={styles.heading}>
              {mode === "import"
                ? "Importar temas JSON"
                : mode === "edit"
                  ? "Editar tema personalizado"
                  : "Criar tema personalizado"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              disabled={isPickingImage}
              onPress={() => void closeManager()}
            >
              <X color={colors.muted} size={20} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
          >
            {mode === "import" ? (
              <>
                <Text style={styles.help}>
                  Cole o JSON exportado pelo ENEM.DEV. Arquivos de até 100 KB
                  são aceitos; temas repetidos serão ignorados.
                </Text>
                <TextInput
                  accessibilityLabel="JSON dos temas"
                  multiline
                  onChangeText={setJson}
                  placeholder='{"format":"enem.dev-writing-topics","version":1,"topics":[]}'
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.jsonInput]}
                  textAlignVertical="top"
                  value={json}
                />
              </>
            ) : (
              <>
                <TextInput
                  accessibilityLabel="Título do tema"
                  maxLength={160}
                  onChangeText={(title) => setForm((current) => ({ ...current, title }))}
                  placeholder="Título"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={form.title}
                />
                <TextInput
                  accessibilityLabel="Categoria do tema"
                  maxLength={80}
                  onChangeText={(category) => setForm((current) => ({ ...current, category }))}
                  placeholder="Categoria"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={form.category}
                />
                <TextInput
                  accessibilityLabel="Descrição da proposta"
                  maxLength={5000}
                  multiline
                  onChangeText={(description) => setForm((current) => ({ ...current, description }))}
                  placeholder="Descrição e comando da proposta"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.multiline]}
                  textAlignVertical="top"
                  value={form.description}
                />
                <Text style={styles.sectionTitle}>Textos motivadores (opcionais)</Text>
                <Text style={styles.help}>
                  Até 3 imagens por texto e 10 por tema; cada imagem pode ter até 3 MB.
                </Text>
                {(form.supportingTexts ?? []).map((item, index) => (
                  <View key={`support-${index}`} style={styles.supportingText}>
                    <View style={styles.sectionRow}>
                      <Text style={styles.help}>Texto {index + 1}</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remover texto motivador ${index + 1}`}
                        onPress={() =>
                          setForm((current) => ({
                            ...current,
                            supportingTexts: current.supportingTexts?.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          }))
                        }
                      >
                        <Trash2 color={colors.red} size={16} />
                      </Pressable>
                    </View>
                    <TextInput
                      accessibilityLabel={`Título do texto motivador ${index + 1}`}
                      maxLength={160}
                      onChangeText={(title) =>
                        updateSupportingText(index, (value) => ({ ...value, title }))
                      }
                      placeholder="Título"
                      placeholderTextColor={colors.muted}
                      style={styles.input}
                      value={item.title}
                    />
                    <TextInput
                      accessibilityLabel={`Conteúdo do texto motivador ${index + 1}`}
                      maxLength={3000}
                      multiline
                      onChangeText={(text) =>
                        updateSupportingText(index, (value) => ({ ...value, text }))
                      }
                      placeholder="Conteúdo"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, styles.multiline]}
                      textAlignVertical="top"
                      value={item.text}
                    />
                    <TextInput
                      accessibilityLabel={`Fonte do texto motivador ${index + 1}`}
                      maxLength={500}
                      onChangeText={(source) =>
                        updateSupportingText(index, (value) => ({ ...value, source }))
                      }
                      placeholder="Fonte (opcional)"
                      placeholderTextColor={colors.muted}
                      style={styles.input}
                      value={item.source ?? ""}
                    />
                    {(item.images ?? []).map((image, imageIndex) => (
                      <View key={image.id} style={styles.imageEditor}>
                        <WritingPromptImageView image={image} thumbnail />
                        <View style={styles.imageFields}>
                          <TextInput
                            accessibilityLabel={`Descrição da imagem ${imageIndex + 1} do texto ${index + 1}`}
                            maxLength={200}
                            onChangeText={(description) =>
                              updateSupportingText(index, (value) => ({
                                ...value,
                                images: value.images?.map((current, currentIndex) =>
                                  currentIndex === imageIndex ? { ...current, description } : current,
                                ),
                              }))
                            }
                            placeholder="Descrição da imagem (opcional)"
                            placeholderTextColor={colors.muted}
                            style={styles.input}
                            value={image.description ?? ""}
                          />
                          <TextInput
                            accessibilityLabel={`Fonte da imagem ${imageIndex + 1} do texto ${index + 1}`}
                            maxLength={500}
                            onChangeText={(source) =>
                              updateSupportingText(index, (value) => ({
                                ...value,
                                images: value.images?.map((current, currentIndex) =>
                                  currentIndex === imageIndex ? { ...current, source } : current,
                                ),
                              }))
                            }
                            placeholder="Fonte da imagem (opcional)"
                            placeholderTextColor={colors.muted}
                            style={styles.input}
                            value={image.source ?? ""}
                          />
                          <View style={styles.imageActions}>
                            <Pressable
                              accessibilityRole="button"
                              disabled={isPickingImage}
                              onPress={() => void pickImages(index, imageIndex)}
                              style={styles.imageAction}
                            >
                              <RefreshCw color={colors.blue} size={14} />
                              <Text style={styles.addButtonText}>Substituir</Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              onPress={() =>
                                updateSupportingText(index, (value) => ({
                                  ...value,
                                  images: value.images?.filter((_, currentIndex) => currentIndex !== imageIndex),
                                }))
                              }
                              style={styles.imageAction}
                            >
                              <Trash2 color={colors.red} size={14} />
                              <Text style={styles.removeButtonText}>Remover imagem</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    ))}
                    <SecondaryButton
                      label={isPickingImage ? "Carregando imagens..." : "Adicionar imagens"}
                      onPress={() => void pickImages(index)}
                      disabled={isPickingImage}
                    />
                  </View>
                ))}
                <SecondaryButton
                  label="Adicionar texto motivador"
                  onPress={() =>
                    setForm((current) => ({
                      ...current,
                      supportingTexts: [
                        ...(current.supportingTexts ?? []),
                        { title: "", text: "" },
                      ],
                    }))
                  }
                />
                <TextInput
                  accessibilityLabel="Fonte e referência principal"
                  maxLength={500}
                  onChangeText={(source) => setForm((current) => ({ ...current, source }))}
                  placeholder="Fonte / referência principal (opcional)"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={form.source}
                />
                <TextInput
                  accessibilityLabel="Referências adicionais"
                  multiline
                  onChangeText={(value) =>
                    setForm((current) => ({
                      ...current,
                      references: value.split("\n").slice(0, 20),
                    }))
                  }
                  placeholder="Referências adicionais (uma por linha)"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.referenceInput]}
                  textAlignVertical="top"
                  value={(form.references ?? []).join("\n")}
                />
              </>
            )}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={isPickingImage}
                onPress={() => void closeManager()}
                style={[styles.secondaryButton, isPickingImage && styles.disabled]}
              >
                <Text style={styles.secondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isSaving || isPickingImage}
                onPress={() => void submit()}
                style={[styles.primaryButton, (isSaving || isPickingImage) && styles.disabled]}
              >
                <Text style={styles.primaryText}>
                  {isSaving ? "Salvando..." : mode === "import" ? "Importar" : "Salvar"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SecondaryButton({
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
      disabled={disabled}
      onPress={onPress}
      style={[styles.addButton, disabled && styles.disabled]}
    >
      <Plus color={colors.blue} size={15} />
      <Text style={styles.addButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#000000B8",
    padding: 16,
  },
  dialog: {
    width: "100%",
    maxWidth: 700,
    maxHeight: "90%",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  header: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heading: { color: colors.text, fontSize: 16, fontWeight: "700" },
  form: { gap: 12, padding: 16 },
  input: {
    minHeight: 42,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 13,
  },
  multiline: { minHeight: 90 },
  jsonInput: { minHeight: 220, fontFamily: "monospace" },
  referenceInput: { minHeight: 76 },
  supportingText: {
    gap: 9,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  imageEditor: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  imageFields: { flex: 1, gap: 8 },
  imageActions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  imageAction: { minHeight: 30, flexDirection: "row", alignItems: "center", gap: 5 },
  removeButtonText: { color: colors.red, fontSize: 12, fontWeight: "700" },
  sectionTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  help: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  addButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  addButtonText: { color: colors.blue, fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  secondaryButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  secondaryText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  primaryButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.green,
  },
  primaryText: { color: colors.background, fontSize: 12, fontWeight: "800" },
  disabled: { opacity: 0.6 },
  error: { color: colors.red, fontSize: 12, lineHeight: 18 },
});
