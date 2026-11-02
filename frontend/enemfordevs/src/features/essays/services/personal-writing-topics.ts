import {
  getDeletedAccountRecords,
  markAccountRecordDeleted,
  markAccountRecordRestored,
  notifyAccountDataChanged,
} from "@/services/account-data-events";
import {
  getAccountStorageScope,
  type AccountStorageScope,
} from "@/services/account-storage";
import {
  getWritingEssays,
  saveWritingEssay,
} from "@/features/essays/services/writing-storage";
import { isWritingPromptImage } from "@/features/essays/services/writing-prompt-images";
import type { WritingSupportingText, WritingTopic } from "@/features/essays/types/writing";

const STORAGE_KEY = "enemfordevs:personal-writing-topics:v1";
const MAX_IMPORT_BYTES = 100_000;
const MAX_TOPICS = 100;
let operationQueue: Promise<void> = Promise.resolve();

export interface WritingTopicImportResult {
  imported: number;
  duplicates: number;
}

function queueOperation<T>(
  operation: (scope: AccountStorageScope) => Promise<T>,
  scope = getAccountStorageScope(),
): Promise<T> {
  const result = operationQueue.then(() => operation(scope));
  operationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function isText(value: unknown, maximumLength: number): value is string {
  return typeof value === "string" && value.length <= maximumLength;
}

function isSupportingText(value: unknown): value is WritingSupportingText {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    isText(item.title, 160) &&
    item.title.trim().length > 0 &&
    isText(item.text, 3000) &&
    item.text.trim().length > 0 &&
    (item.source === undefined || isText(item.source, 500)) &&
    (item.images === undefined ||
      (Array.isArray(item.images) &&
        item.images.length <= 3 &&
        item.images.every(isWritingPromptImage)))
  );
}

export function isPersonalWritingTopic(
  value: unknown,
): value is WritingTopic {
  if (!value || typeof value !== "object") {
    return false;
  }

  const topic = value as Record<string, unknown>;
  return (
    typeof topic.id === "string" &&
    topic.id.length > 0 &&
    isText(topic.title, 160) &&
    topic.title.trim().length > 0 &&
    isText(topic.category, 80) &&
    topic.category.trim().length > 0 &&
    topic.type === "personal" &&
    isText(topic.description, 5000) &&
    topic.description.trim().length > 0 &&
    (topic.source === undefined || isText(topic.source, 500)) &&
    (topic.createdAt === undefined || isText(topic.createdAt, 40)) &&
    (topic.updatedAt === undefined || isText(topic.updatedAt, 40)) &&
    (topic.references === undefined ||
      (Array.isArray(topic.references) &&
        topic.references.length <= 20 &&
        topic.references.every((reference) => isText(reference, 500)))) &&
    (topic.supportingTexts === undefined ||
      (Array.isArray(topic.supportingTexts) &&
        topic.supportingTexts.length <= 10 &&
        topic.supportingTexts.every(isSupportingText))) &&
    (topic.supportingTexts === undefined ||
      (topic.supportingTexts as WritingSupportingText[]).reduce(
        (total, item) => total + (Array.isArray(item.images) ? item.images.length : 0),
        0,
      ) <= 10)
  );
}

async function readTopics(scope: AccountStorageScope): Promise<WritingTopic[]> {
  const stored = await scope.getItem(STORAGE_KEY);
  if (stored === null) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error("Os temas personalizados salvos não contêm JSON válido.");
  }

  if (
    !Array.isArray(parsed) ||
    parsed.length > MAX_TOPICS ||
    !parsed.every(isPersonalWritingTopic)
  ) {
    throw new Error("Os temas personalizados salvos têm formato inválido.");
  }
  return parsed;
}

function createTopicId(): string {
  return `personal-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function createPersonalWritingTopic(
  fields: Omit<WritingTopic, "id" | "type" | "createdAt">,
): WritingTopic {
  return {
    ...fields,
    id: createTopicId(),
    type: "personal",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function getUtf8ByteLength(value: string): number {
  let byteLength = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index);
    if (codePoint === undefined) {
      continue;
    }
    if (codePoint > 0xffff) {
      index += 1;
      byteLength += 4;
    } else if (codePoint > 0x7ff) {
      byteLength += 3;
    } else if (codePoint > 0x7f) {
      byteLength += 2;
    } else {
      byteLength += 1;
    }
  }
  return byteLength;
}

export function getPersonalWritingTopics(
  scope = getAccountStorageScope(),
): Promise<WritingTopic[]> {
  return queueOperation(readTopics, scope);
}

export function replacePersonalWritingTopicsFromAccount(
  topics: WritingTopic[],
  scope = getAccountStorageScope(),
): Promise<void> {
  if (!Array.isArray(topics) || !topics.every(isPersonalWritingTopic)) {
    return Promise.reject(new Error("Os temas remotos têm formato inválido."));
  }
  return queueOperation(async (storage) => {
    const [current, deleted] = await Promise.all([
      readTopics(storage),
      getDeletedAccountRecords(storage),
    ]);
    const merged = new Map(topics.map((topic) => [topic.id, topic]));
    for (const topic of current) {
      const remote = merged.get(topic.id);
      if (
        !remote ||
        (topic.updatedAt ?? topic.createdAt ?? "").localeCompare(
          remote.updatedAt ?? remote.createdAt ?? "",
        ) >= 0
      ) {
        merged.set(topic.id, topic);
      }
    }

    const active: WritingTopic[] = [];
    for (const topic of merged.values()) {
      const deletedAt = deleted.topics[topic.id];
      if (!deletedAt) {
        active.push(topic);
      } else if (
        (topic.updatedAt ?? topic.createdAt ?? "").localeCompare(deletedAt) > 0
      ) {
        await markAccountRecordRestored("topics", topic.id, storage);
        active.push(topic);
      }
    }
    await storage.setItem(STORAGE_KEY, JSON.stringify(active));
  }, scope);
}

export function savePersonalWritingTopic(
  topic: WritingTopic,
  scope = getAccountStorageScope(),
): Promise<void> {
  if (!isPersonalWritingTopic(topic)) {
    return Promise.reject(new Error("Os dados do tema personalizado são inválidos."));
  }

  return queueOperation(async (storage) => {
    const topics = await readTopics(storage);
    const savedTopic = { ...topic, updatedAt: new Date().toISOString() };
    const updated = topics.some((item) => item.id === topic.id)
      ? topics.map((item) => (item.id === topic.id ? savedTopic : item))
      : [savedTopic, ...topics];
    if (updated.length > MAX_TOPICS) {
      throw new Error(`É possível salvar até ${MAX_TOPICS} temas personalizados.`);
    }
    await storage.setItem(STORAGE_KEY, JSON.stringify(updated));
    await markAccountRecordRestored("topics", topic.id, storage);
  }).then(() => {
    notifyAccountDataChanged(scope);
  });
}

export function duplicatePersonalWritingTopic(
  topic: WritingTopic,
): WritingTopic {
  return {
    ...topic,
    id: createTopicId(),
    title: `${topic.title} (cópia)`.slice(0, 160),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function deletePersonalWritingTopic(
  topicId: string,
  scope = getAccountStorageScope(),
): Promise<void> {
  return queueOperation(async (storage) => {
    const topics = await readTopics(storage);
    const topic = topics.find((item) => item.id === topicId);
    if (!topic) {
      return;
    }
    const essays = await getWritingEssays(storage);
    for (const essay of essays) {
      if (essay.topicId === topicId && !essay.topicSnapshot) {
        await saveWritingEssay({ ...essay, topicSnapshot: topic }, storage);
      }
    }
    await storage.setItem(
      STORAGE_KEY,
      JSON.stringify(topics.filter((topic) => topic.id !== topicId)),
    );
    await markAccountRecordDeleted("topics", topicId, storage);
  }).then(() => {
    notifyAccountDataChanged(scope);
  });
}

export function exportPersonalWritingTopics(
  topics: WritingTopic[],
): string {
  const portableTopics = topics.map((topic) => ({
    ...topic,
    supportingTexts: topic.supportingTexts?.map((text) => {
      const portableText = { ...text };
      delete portableText.images;
      return portableText;
    }),
  }));
  const json = JSON.stringify(
    { format: "enem.dev-writing-topics", version: 1, topics: portableTopics },
    null,
    2,
  );
  if (getUtf8ByteLength(json) > MAX_IMPORT_BYTES) {
    throw new Error("A exportação excederia o limite de 100 KB por arquivo.");
  }
  return json;
}

export function importPersonalWritingTopics(
  json: string,
  distributedTopics: WritingTopic[],
  scope = getAccountStorageScope(),
): Promise<WritingTopicImportResult> {
  if (getUtf8ByteLength(json) > MAX_IMPORT_BYTES) {
    return Promise.reject(new Error("O arquivo de temas excede o limite de 100 KB."));
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return Promise.reject(new Error("O conteúdo importado não contém JSON válido."));
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as Record<string, unknown>).format !== "enem.dev-writing-topics" ||
    (parsed as Record<string, unknown>).version !== 1 ||
    !Array.isArray((parsed as Record<string, unknown>).topics) ||
    !((parsed as Record<string, unknown>).topics as unknown[]).every(
      isPersonalWritingTopic,
    )
  ) {
    return Promise.reject(new Error("O JSON não corresponde ao formato de temas ENEM.DEV."));
  }

  const imported = (parsed as { topics: WritingTopic[] }).topics;
  if (imported.length > MAX_TOPICS) {
    return Promise.reject(new Error(`O arquivo pode conter até ${MAX_TOPICS} temas.`));
  }

  return queueOperation(async (storage) => {
    const current = await readTopics(storage);
    const protectedIds = new Set(distributedTopics.map((topic) => topic.id));
    const usedIds = new Set([...current, ...distributedTopics].map((topic) => topic.id));
    const importedIds = new Set<string>();
    const titleKeys = new Set(
      [...current, ...distributedTopics].map(
        (topic) => `${topic.title.trim().toLocaleLowerCase("pt-BR")}:${topic.category.trim().toLocaleLowerCase("pt-BR")}`,
      ),
    );
    const next = [...current];
    let importedCount = 0;
    let duplicates = 0;

    for (const source of imported) {
      const titleKey = `${source.title.trim().toLocaleLowerCase("pt-BR")}:${source.category.trim().toLocaleLowerCase("pt-BR")}`;
      const hasRepeatedImportId = importedIds.has(source.id);
      importedIds.add(source.id);
      if (
        hasRepeatedImportId ||
        usedIds.has(source.id) ||
        protectedIds.has(source.id) ||
        titleKeys.has(titleKey)
      ) {
        duplicates += 1;
        continue;
      }

      const now = new Date().toISOString();
      const topic = { ...source, id: createTopicId(), updatedAt: now };
      next.unshift(topic);
      usedIds.add(topic.id);
      titleKeys.add(titleKey);
      importedCount += 1;
    }

    if (next.length > MAX_TOPICS) {
      throw new Error(`A importação excederia o limite de ${MAX_TOPICS} temas pessoais.`);
    }
    await storage.setItem(STORAGE_KEY, JSON.stringify(next));
    for (const topic of next) {
      await markAccountRecordRestored("topics", topic.id, storage);
    }
    return { imported: importedCount, duplicates };
  }).then((result) => {
    if (result.imported > 0) notifyAccountDataChanged(scope);
    return result;
  });
}
