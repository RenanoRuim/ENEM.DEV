import "react-native-url-polyfill/auto";

import * as SecureStore from "expo-secure-store";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

import { getSecureStoreChunkKey } from "@/services/secure-store-key";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey,
);

let client: SupabaseClient<Database> | null = null;
const SECURE_VALUE_LIMIT = 1200;

function splitSecureValue(value: string): string[] {
  const chunks: string[] = [];
  let chunk = "";
  let byteLength = 0;

  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    const characterBytes =
      codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
    if (byteLength + characterBytes > SECURE_VALUE_LIMIT) {
      chunks.push(chunk);
      chunk = "";
      byteLength = 0;
    }
    chunk += character;
    byteLength += characterBytes;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

const secureStorage = {
  getItem: async (key: string) => {
    const countKey = getSecureStoreChunkKey(key, "chunk-count");
    const countValue = await SecureStore.getItemAsync(countKey);
    if (countValue === null) return null;
    const count = Number(countValue);
    if (!Number.isInteger(count) || count < 1) {
      throw new Error("A sessão protegida salva tem formato inválido.");
    }
    const chunks: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const chunkKey = getSecureStoreChunkKey(key, `chunk-${index}`);
      const chunk = await SecureStore.getItemAsync(chunkKey);
      if (chunk === null) {
        throw new Error("A sessão protegida salva está incompleta.");
      }
      chunks.push(chunk);
    }
    return chunks.join("");
  },
  setItem: async (key: string, value: string) => {
    const chunks = splitSecureValue(value);
    const countKey = getSecureStoreChunkKey(key, "chunk-count");
    const previousCount = Number(
      (await SecureStore.getItemAsync(countKey)) ?? 0,
    );
    for (let index = 0; index < chunks.length; index += 1) {
      const chunkKey = getSecureStoreChunkKey(key, `chunk-${index}`);
      await SecureStore.setItemAsync(chunkKey, chunks[index]);
    }
    await SecureStore.setItemAsync(countKey, String(chunks.length));
    for (let index = chunks.length; index < previousCount; index += 1) {
      const chunkKey = getSecureStoreChunkKey(key, `chunk-${index}`);
      await SecureStore.deleteItemAsync(chunkKey);
    }
  },
  removeItem: async (key: string) => {
    const countKey = getSecureStoreChunkKey(key, "chunk-count");
    const count = Number(
      (await SecureStore.getItemAsync(countKey)) ?? 0,
    );
    await SecureStore.deleteItemAsync(countKey);
    for (let index = 0; index < count; index += 1) {
      const chunkKey = getSecureStoreChunkKey(key, `chunk-${index}`);
      await SecureStore.deleteItemAsync(chunkKey);
    }
  },
};

function getAuthStorage() {
  if (Platform.OS === "web") {
    return {
      getItem: async (key: string) => globalThis.localStorage.getItem(key),
      setItem: async (key: string, value: string) =>
        globalThis.localStorage.setItem(key, value),
      removeItem: async (key: string) => globalThis.localStorage.removeItem(key),
    };
  }

  return secureStorage;
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!isSupabaseConfigured || !supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY para habilitar a conta.",
    );
  }

  if (!client) {
    client = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === "web",
        flowType: "pkce",
        persistSession: true,
        storage: getAuthStorage(),
      },
    });
  }

  return client;
}
