import { Platform } from "react-native";

import type {
  WritingEssay,
  WritingPromptImage,
  WritingTopic,
} from "@/types/writing";

export const MAX_PROMPT_IMAGE_SIZE = 3 * 1024 * 1024;
export const MAX_PROMPT_IMAGES_PER_TEXT = 3;
export const MAX_PROMPT_IMAGES_PER_TOPIC = 10;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const DATABASE_NAME = "enemfordevs-writing-images";
const STORE_NAME = "prompt-images";
const DATABASE_VERSION = 1;
const objectUrls = new Map<string, string>();

type ImageAsset = {
  uri: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
};

export function isWritingPromptImage(value: unknown): value is WritingPromptImage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const image = value as Record<string, unknown>;
  return (
    typeof image.id === "string" &&
    /^prompt-[a-z0-9]+-[a-z0-9]+$/u.test(image.id) &&
    typeof image.fileName === "string" &&
    image.fileName.length <= 255 &&
    IMAGE_TYPES.includes(image.mimeType as (typeof IMAGE_TYPES)[number]) &&
    typeof image.sizeBytes === "number" &&
    Number.isInteger(image.sizeBytes) &&
    image.sizeBytes > 0 &&
    image.sizeBytes <= MAX_PROMPT_IMAGE_SIZE &&
    (image.description === undefined ||
      (typeof image.description === "string" && image.description.length <= 200)) &&
    (image.source === undefined ||
      (typeof image.source === "string" && image.source.length <= 500))
  );
}

function createImageId(): string {
  return `prompt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      throw new Error("Use uma imagem JPEG, PNG ou WebP.");
  }
}

function openImageDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("O armazenamento local de imagens não está disponível neste navegador."),
    );
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Não foi possível abrir o armazenamento de imagens."));
  });
}

async function storeWebImage(id: string, asset: ImageAsset): Promise<number> {
  const response = await fetch(asset.uri);
  if (!response.ok) {
    throw new Error("Não foi possível ler a imagem selecionada.");
  }
  const blob = await response.blob();
  if (blob.size === 0 || blob.size > MAX_PROMPT_IMAGE_SIZE) {
    throw new Error("Cada imagem deve ter no máximo 3 MB.");
  }
  if (!IMAGE_TYPES.includes(blob.type as (typeof IMAGE_TYPES)[number])) {
    throw new Error("Use uma imagem JPEG, PNG ou WebP.");
  }

  const database = await openImageDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(blob, id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Não foi possível salvar a imagem no navegador."));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("O armazenamento da imagem foi cancelado."));
    });
  } finally {
    database.close();
  }
  return blob.size;
}

export async function storeWritingPromptImage(
  asset: ImageAsset,
): Promise<WritingPromptImage> {
  const mimeType = asset.mimeType?.toLowerCase();
  if (!mimeType || !IMAGE_TYPES.includes(mimeType as (typeof IMAGE_TYPES)[number])) {
    throw new Error("Use uma imagem JPEG, PNG ou WebP.");
  }
  if (asset.fileSize !== null && asset.fileSize > MAX_PROMPT_IMAGE_SIZE) {
    throw new Error("Cada imagem deve ter no máximo 3 MB.");
  }

  const id = createImageId();
  const fileName = (asset.fileName || `${id}.${getExtension(mimeType)}`).slice(0, 255);
  const image: WritingPromptImage = {
    id,
    fileName,
    mimeType: mimeType as WritingPromptImage["mimeType"],
    sizeBytes: asset.fileSize ?? 0,
  };

  if (Platform.OS === "web") {
    const sizeBytes = await storeWebImage(id, asset);
    return { ...image, sizeBytes };
  }

  const FileSystem = await import("expo-file-system/legacy");
  const sourceInfo = await FileSystem.getInfoAsync(asset.uri);
  if (!sourceInfo.exists || sourceInfo.isDirectory) {
    throw new Error("A imagem selecionada não está mais disponível.");
  }
  if (sourceInfo.size === undefined || sourceInfo.size <= 0) {
    throw new Error("Não foi possível verificar o tamanho da imagem.");
  }
  if (sourceInfo.size > MAX_PROMPT_IMAGE_SIZE) {
    throw new Error("Cada imagem deve ter no máximo 3 MB.");
  }

  const directory = FileSystem.documentDirectory
    ? `${FileSystem.documentDirectory}enemdev-prompt-images/`
    : null;
  if (!directory) {
    throw new Error("O armazenamento permanente de imagens não está disponível.");
  }
  const uri = `${directory}${id}.${getExtension(mimeType)}`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  await FileSystem.copyAsync({ from: asset.uri, to: uri });
  return { ...image, sizeBytes: sourceInfo.size };
}

export async function getWritingPromptImageUri(
  imageId: string,
  mimeType: WritingPromptImage["mimeType"],
): Promise<string> {
  if (Platform.OS !== "web") {
    const FileSystem = await import("expo-file-system/legacy");
    const directory = FileSystem.documentDirectory
      ? `${FileSystem.documentDirectory}enemdev-prompt-images/`
      : null;
    if (!directory) {
      throw new Error("O armazenamento permanente de imagens não está disponível.");
    }
    const uri = `${directory}${imageId}.${getExtension(mimeType)}`;
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      throw new Error("O arquivo desta imagem não está disponível neste dispositivo.");
    }
    return uri;
  }

  const existingUrl = objectUrls.get(imageId);
  if (existingUrl) {
    return existingUrl;
  }
  const database = await openImageDatabase();
  try {
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(imageId);
      request.onsuccess = () => resolve(request.result as Blob | undefined);
      request.onerror = () =>
        reject(request.error ?? new Error("Não foi possível carregar a imagem salva."));
    });
    if (!blob) {
      throw new Error("O arquivo desta imagem não está disponível neste navegador.");
    }
    const uri = URL.createObjectURL(blob);
    objectUrls.set(imageId, uri);
    return uri;
  } finally {
    database.close();
  }
}

async function deleteWritingPromptImage(id: string): Promise<void> {
  const objectUrl = objectUrls.get(id);
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrls.delete(id);
  }

  if (Platform.OS === "web") {
    const database = await openImageDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
          reject(transaction.error ?? new Error("Não foi possível remover a imagem."));
      });
    } finally {
      database.close();
    }
    return;
  }

  const FileSystem = await import("expo-file-system/legacy");
  const directory = FileSystem.documentDirectory
    ? `${FileSystem.documentDirectory}enemdev-prompt-images/`
    : null;
  if (!directory) {
    throw new Error("O armazenamento permanente de imagens não está disponível.");
  }
  for (const extension of ["jpg", "png", "webp"]) {
    const uri = `${directory}${id}.${extension}`;
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri);
      return;
    }
  }
}

function getImageIds(topic: WritingTopic | undefined): Set<string> {
  return new Set(
    (topic?.supportingTexts ?? []).flatMap((text) =>
      (text.images ?? []).map((image) => image.id),
    ),
  );
}

export async function removeUnusedWritingPromptImages(
  candidates: Iterable<string>,
  topics: WritingTopic[],
  essays: WritingEssay[],
): Promise<void> {
  const referenced = new Set<string>();
  for (const topic of topics) {
    for (const id of getImageIds(topic)) {
      referenced.add(id);
    }
  }
  for (const essay of essays) {
    for (const id of getImageIds(essay.topicSnapshot)) {
      referenced.add(id);
    }
  }

  for (const id of new Set(candidates)) {
    if (!referenced.has(id)) {
      await deleteWritingPromptImage(id);
    }
  }
}
