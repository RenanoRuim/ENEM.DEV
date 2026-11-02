import AsyncStorage from "@react-native-async-storage/async-storage";

import { getAccountStorageKey } from "@/services/account-storage-key";
import {
  isActivePrivateAccountScope,
  isPersistentAccountScope,
} from "@/services/account-storage-policy";

export interface AccountStorageScope {
  readonly userId: string | null;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

let activeUserId: string | null = null;
const visitorStorage = new Map<string, string>();

export function setActiveAccountStorageUser(userId: string | null): void {
  if (activeUserId !== userId) visitorStorage.clear();
  activeUserId = userId;
}

export function getAccountStorageScope(
  userId: string | null = activeUserId,
): AccountStorageScope {
  const keyFor = (key: string) => getAccountStorageKey(key, userId);
  const assertActive = () => {
    if (
      isPersistentAccountScope(userId) &&
      !isActivePrivateAccountScope(userId, activeUserId)
    ) {
      throw new Error("A conta mudou; os dados locais não foram acessados.");
    }
  };

  return {
    userId,
    getItem: async (key) => {
      if (!isPersistentAccountScope(userId)) {
        return visitorStorage.get(key) ?? null;
      }
      assertActive();
      return AsyncStorage.getItem(keyFor(key));
    },
    setItem: async (key, value) => {
      if (!isPersistentAccountScope(userId)) {
        visitorStorage.set(key, value);
        return;
      }
      assertActive();
      await AsyncStorage.setItem(keyFor(key), value);
    },
    removeItem: async (key) => {
      if (userId === null) {
        visitorStorage.delete(key);
        return;
      }
      await AsyncStorage.removeItem(keyFor(key));
    },
  };
}

export function isActiveAccountStorageScope(
  scope: AccountStorageScope,
): boolean {
  return scope.userId === null
    ? activeUserId === null
    : isActivePrivateAccountScope(scope.userId, activeUserId);
}

export async function clearAccountStorage(userId: string): Promise<void> {
  const prefix = `enemfordevs:account:${encodeURIComponent(userId)}:`;
  const keys = await AsyncStorage.getAllKeys();
  const accountKeys = keys.filter((key) => key.startsWith(prefix));
  if (accountKeys.length > 0) {
    await AsyncStorage.multiRemove(accountKeys);
  }
}

export function clearVisitorStorage(): void {
  visitorStorage.clear();
}

export async function moveLegacyVisitorStorageToMemory(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const legacyKeys = keys.filter(
    (key) =>
      key.startsWith("enemfordevs:") &&
      !key.startsWith("enemfordevs:account:"),
  );
  if (legacyKeys.length === 0) return;

  const entries = await AsyncStorage.multiGet(legacyKeys);
  for (const [key, value] of entries) {
    if (value !== null) visitorStorage.set(key, value);
  }
  await AsyncStorage.multiRemove(legacyKeys);
}
