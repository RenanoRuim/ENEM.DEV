import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getAccountStorageScope,
  type AccountStorageScope,
} from "@/services/account-storage";
import { notifyAccountDataChanged } from "@/services/account-data-events";
import {
  DEFAULT_VISUAL_PREFERENCES,
  isVisualPreferences,
  type VisualPreferences,
} from "@/types/visual-preferences";

const VISUAL_PREFERENCES_KEY = "enemfordevs:visual-preferences:v1";
const VISITOR_VISUAL_PREFERENCES_KEY =
  "enem.dev:visitor-visual-preferences:v1";

function getStoredPreferences(scope: AccountStorageScope): Promise<string | null> {
  return scope.userId === null
    ? AsyncStorage.getItem(VISITOR_VISUAL_PREFERENCES_KEY)
    : scope.getItem(VISUAL_PREFERENCES_KEY);
}

function storePreferences(
  preferences: VisualPreferences,
  scope: AccountStorageScope,
): Promise<void> {
  const value = JSON.stringify(preferences);
  return scope.userId === null
    ? AsyncStorage.setItem(VISITOR_VISUAL_PREFERENCES_KEY, value)
    : scope.setItem(VISUAL_PREFERENCES_KEY, value);
}

export async function getVisualPreferences(
  scope: AccountStorageScope = getAccountStorageScope(),
): Promise<VisualPreferences> {
  const stored = await getStoredPreferences(scope);
  if (stored === null) return DEFAULT_VISUAL_PREFERENCES;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error("As preferências visuais salvas contêm JSON inválido.");
  }
  if (!isVisualPreferences(parsed)) {
    throw new Error("As preferências visuais salvas têm formato inválido.");
  }
  return parsed;
}

export async function saveVisualPreferences(
  preferences: Omit<VisualPreferences, "updatedAt">,
  scope: AccountStorageScope = getAccountStorageScope(),
): Promise<VisualPreferences> {
  const updated: VisualPreferences = {
    ...preferences,
    updatedAt: new Date().toISOString(),
  };
  await storePreferences(updated, scope);
  notifyAccountDataChanged(scope);
  return updated;
}

export async function replaceVisualPreferencesFromAccount(
  preferences: VisualPreferences,
  scope: AccountStorageScope,
): Promise<void> {
  if (!isVisualPreferences(preferences)) {
    throw new Error("As preferências visuais remotas têm formato inválido.");
  }
  if (!scope.userId) {
    throw new Error("Preferências sincronizadas exigem uma conta autenticada.");
  }
  await scope.setItem(VISUAL_PREFERENCES_KEY, JSON.stringify(preferences));
}
