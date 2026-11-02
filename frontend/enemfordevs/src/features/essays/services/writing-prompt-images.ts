import { Platform } from "react-native";

import {
  getAccountStorageScope,
  isActiveAccountStorageScope,
  type AccountStorageScope,
} from "@/services/account-storage";
import type {
  WritingEssay,
  WritingPromptImage,
  WritingTopic,
} from "@/features/essays/types/writing";

export const MAX_PROMPT_IMAGE_SIZE = 3 * 1024 * 1024;
export const MAX_PROMPT_IMAGES_PER_TEXT = 3;
export const MAX_PROMPT_IMAGES_PER_TOPIC = 10;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const DATABASE_NAME = "enemfordevs-writing-images";
const STORE_NAME = "prompt-images";
const DATABASE_VERSION = 1;
const objectUrls = new Map<string, string>();
const visitorImages = new Map<string, Blob | string>();

function assertActiveAccount(scope: AccountStorageScope): void {
  if (scope.userId && !isActiveAccountStorageScope(scope)) {
    throw new Error("A conta mudou; a imagem não foi acessada.");
  }
}

function getStoredImageKey(
  imageId: string,
  scope: AccountStorageScope,
): string {
  return `${encodeURIComponent(scope.userId ?? "visitor")}:${imageId}`;
}

function getImageDirectory(
  documentDirectory: string | null,
  scope: AccountStorageScope,
): string | null {
  if (!documentDirectory) return null;
  const accountDirectory = scope.userId
    ? `accounts/${encodeURIComponent(scope.userId)}/`
    : "";
  return `${documentDirectory}enemdev-prompt-images/${accountDirectory}`;
}

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

async function storeWebImage(
  id: string,
  asset: ImageAsset,
  scope: AccountStorageScope,
): Promise<number> {
  assertActiveAccount(scope);
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

  if (!scope.userId) {
    visitorImages.set(getStoredImageKey(id, scope), blob);
    return blob.size;
  }
  assertActiveAccount(scope);
  const database = await openImageDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(blob, getStoredImageKey(id, scope));
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
  scope = getAccountStorageScope(),
): Promise<WritingPromptImage> {
  assertActiveAccount(scope);
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
    const sizeBytes = await storeWebImage(id, asset, scope);
    return { ...image, sizeBytes };
  }

  if (!scope.userId) {
    visitorImages.set(getStoredImageKey(id, scope), asset.uri);
    return { ...image, sizeBytes: asset.fileSize ?? 0 };
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

  assertActiveAccount(scope);
  const directory = getImageDirectory(FileSystem.documentDirectory, scope);
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
  scope = getAccountStorageScope(),
): Promise<string> {
  assertActiveAccount(scope);
  if (Platform.OS !== "web") {
    if (!scope.userId) {
      const visitorImage = visitorImages.get(getStoredImageKey(imageId, scope));
      if (typeof visitorImage === "string") return visitorImage;
      throw new Error("A imagem temporária não está mais disponível nesta sessão.");
    }
    const FileSystem = await import("expo-file-system/legacy");
    const directory = getImageDirectory(FileSystem.documentDirectory, scope);
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

  const storedImageKey = getStoredImageKey(imageId, scope);
  const existingUrl = objectUrls.get(storedImageKey);
  if (existingUrl) {
    return existingUrl;
  }
  if (!scope.userId) {
    const visitorImage = visitorImages.get(storedImageKey);
    if (!(visitorImage instanceof Blob)) {
      throw new Error("A imagem temporária não está mais disponível nesta sessão.");
    }
    const url = URL.createObjectURL(visitorImage);
    objectUrls.set(storedImageKey, url);
    return url;
  }
  const database = await openImageDatabase();
  try {
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(storedImageKey);
      request.onsuccess = () => resolve(request.result as Blob | undefined);
      request.onerror = () =>
        reject(request.error ?? new Error("Não foi possível carregar a imagem salva."));
    });
    if (!blob) {
      throw new Error("O arquivo desta imagem não está disponível neste navegador.");
    }
    const uri = URL.createObjectURL(blob);
    objectUrls.set(storedImageKey, uri);
    return uri;
  } finally {
    database.close();
  }
}

export async function readWritingPromptImageBase64(
  imageId: string,
  mimeType: WritingPromptImage["mimeType"],
  scope = getAccountStorageScope(),
): Promise<string> {
  assertActiveAccount(scope);
  if (!/^prompt-[a-z0-9]+-[a-z0-9]+$/u.test(imageId)) {
    throw new Error("O identificador da imagem é inválido.");
  }

  if (Platform.OS === "web") {
    if (!scope.userId) {
      const blob = visitorImages.get(getStoredImageKey(imageId, scope));
      if (!(blob instanceof Blob)) {
        throw new Error("A imagem temporária não está mais disponível nesta sessão.");
      }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      }
      return btoa(binary);
    }
    const database = await openImageDatabase();
    try {
      const blob = await new Promise<Blob | undefined>((resolve, reject) => {
        const request = database
          .transaction(STORE_NAME, "readonly")
          .objectStore(STORE_NAME)
          .get(getStoredImageKey(imageId, scope));
        request.onsuccess = () => resolve(request.result as Blob | undefined);
        request.onerror = () =>
          reject(request.error ?? new Error("Não foi possível carregar a imagem salva."));
      });
      if (!blob) {
        throw new Error("O arquivo desta imagem não está disponível neste dispositivo.");
      }
      if (blob.type !== mimeType || blob.size > MAX_PROMPT_IMAGE_SIZE) {
        throw new Error("O arquivo da imagem tem formato ou tamanho inválido.");
      }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      }
      return btoa(binary);
    } finally {
      database.close();
    }
  }

  if (!scope.userId) {
    const uri = visitorImages.get(getStoredImageKey(imageId, scope));
    if (typeof uri !== "string") {
      throw new Error("A imagem temporária não está mais disponível nesta sessão.");
    }
    const dataUrlMatch = /^data:[^;]+;base64,(.+)$/u.exec(uri);
    if (dataUrlMatch) return dataUrlMatch[1];
    const FileSystem = await import("expo-file-system/legacy");
    return FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  const FileSystem = await import("expo-file-system/legacy");
  const directory = getImageDirectory(FileSystem.documentDirectory, scope);
  if (!directory) {
    throw new Error("O armazenamento permanente de imagens não está disponível.");
  }
  const uri = `${directory}${imageId}.${getExtension(mimeType)}`;
  const info = await FileSystem.getInfoAsync(uri);
  if (
    !info.exists ||
    info.isDirectory ||
    !info.size ||
    info.size > MAX_PROMPT_IMAGE_SIZE
  ) {
    throw new Error("O arquivo desta imagem não está disponível neste dispositivo.");
  }
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function saveWritingPromptImageBase64(
  imageId: string,
  mimeType: WritingPromptImage["mimeType"],
  base64: string,
  scope = getAccountStorageScope(),
): Promise<void> {
  assertActiveAccount(scope);
  if (!/^prompt-[a-z0-9]+-[a-z0-9]+$/u.test(imageId)) {
    throw new Error("O identificador da imagem é inválido.");
  }
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(base64) ||
    base64.length === 0 ||
    Math.floor((base64.length * 3) / 4) > MAX_PROMPT_IMAGE_SIZE
  ) {
    throw new Error("O arquivo remoto da imagem tem formato ou tamanho inválido.");
  }

  if (Platform.OS === "web") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    if (bytes.length === 0 || bytes.length > MAX_PROMPT_IMAGE_SIZE) {
      throw new Error("Cada imagem deve ter no máximo 3 MB.");
    }

    if (!scope.userId) {
      visitorImages.set(
        getStoredImageKey(imageId, scope),
        new Blob([bytes], { type: mimeType }),
      );
      return;
    }
    const database = await openImageDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).put(
          new Blob([bytes], { type: mimeType }),
          getStoredImageKey(imageId, scope),
        );
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
          reject(transaction.error ?? new Error("Não foi possível salvar a imagem no navegador."));
        transaction.onabort = () =>
          reject(transaction.error ?? new Error("O armazenamento da imagem foi cancelado."));
      });
    } finally {
      database.close();
    }
    return;
  }

  if (!scope.userId) {
    visitorImages.set(
      getStoredImageKey(imageId, scope),
      `data:${mimeType};base64,${base64}`,
    );
    return;
  }

  assertActiveAccount(scope);
  const FileSystem = await import("expo-file-system/legacy");
  const directory = getImageDirectory(FileSystem.documentDirectory, scope);
  if (!directory) {
    throw new Error("O armazenamento permanente de imagens não está disponível.");
  }
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  await FileSystem.writeAsStringAsync(
    `${directory}${imageId}.${getExtension(mimeType)}`,
    base64,
    { encoding: FileSystem.EncodingType.Base64 },
  );
}

async function deleteWritingPromptImage(
  id: string,
  scope: AccountStorageScope,
): Promise<void> {
  assertActiveAccount(scope);
  const storedImageKey = getStoredImageKey(id, scope);
  const objectUrl = objectUrls.get(storedImageKey);
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrls.delete(storedImageKey);
  }

  if (!scope.userId) {
    visitorImages.delete(storedImageKey);
    return;
  }

  if (Platform.OS === "web") {
    const database = await openImageDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).delete(storedImageKey);
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
  const directory = getImageDirectory(FileSystem.documentDirectory, scope);
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

export function clearVisitorWritingPromptImages(): void {
  const prefix = `${encodeURIComponent("visitor")}:`;
  for (const [key, objectUrl] of objectUrls) {
    if (key.startsWith(prefix)) {
      URL.revokeObjectURL(objectUrl);
      objectUrls.delete(key);
    }
  }
  visitorImages.clear();
}

export async function clearLegacyVisitorWritingPromptImages(): Promise<void> {
  if (Platform.OS === "web") {
    const database = await openImageDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.openKeyCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          if (typeof cursor.key === "string" && !cursor.key.includes(":")) {
            store.delete(cursor.key);
          }
          cursor.continue();
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
          reject(
            transaction.error ??
              new Error("Não foi possível limpar as imagens antigas do visitante."),
          );
        transaction.onabort = () =>
          reject(
            transaction.error ??
              new Error("A limpeza das imagens antigas do visitante foi cancelada."),
          );
      });
    } finally {
      database.close();
    }
    return;
  }

  const FileSystem = await import("expo-file-system/legacy");
  if (!FileSystem.documentDirectory) return;
  const directory = `${FileSystem.documentDirectory}enemdev-prompt-images/`;
  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists || !info.isDirectory) return;
  const names = await FileSystem.readDirectoryAsync(directory);
  await Promise.all(
    names
      .filter((name) => name !== "accounts")
      .map((name) =>
        FileSystem.deleteAsync(`${directory}${name}`, { idempotent: true }),
      ),
  );
}

export async function clearWritingPromptImages(
  scope: AccountStorageScope,
): Promise<void> {
  if (!scope.userId) return;
  const prefix = `${encodeURIComponent(scope.userId)}:`;
  for (const [key, objectUrl] of objectUrls) {
    if (key.startsWith(prefix)) {
      URL.revokeObjectURL(objectUrl);
      objectUrls.delete(key);
    }
  }

  if (Platform.OS === "web") {
    const database = await openImageDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.openKeyCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          if (
            typeof cursor.key === "string" &&
            cursor.key.startsWith(prefix)
          ) {
            store.delete(cursor.key);
          }
          cursor.continue();
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
          reject(
            transaction.error ??
              new Error("Não foi possível limpar as imagens da conta."),
          );
        transaction.onabort = () =>
          reject(
            transaction.error ??
              new Error("A limpeza das imagens da conta foi cancelada."),
          );
      });
    } finally {
      database.close();
    }
    return;
  }

  const FileSystem = await import("expo-file-system/legacy");
  const directory = getImageDirectory(FileSystem.documentDirectory, scope);
  if (!directory) {
    throw new Error("O armazenamento permanente de imagens não está disponível.");
  }
  const info = await FileSystem.getInfoAsync(directory);
  if (info.exists) await FileSystem.deleteAsync(directory, { idempotent: true });
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
  scope = getAccountStorageScope(),
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
      await deleteWritingPromptImage(id, scope);
    }
  }
}
