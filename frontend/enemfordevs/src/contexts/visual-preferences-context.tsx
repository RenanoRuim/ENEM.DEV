import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { AccessibilityInfo, Platform, useColorScheme } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { useAuth } from "@/contexts/auth-context";
import { Colors } from "@/constants/theme";
import {
  getAccountStorageScope,
  isActiveAccountStorageScope,
} from "@/services/account-storage";
import {
  getVisualPreferences,
  saveVisualPreferences,
} from "@/services/visual-preferences-storage";
import {
  DEFAULT_VISUAL_PREFERENCES,
  type AppearanceMode,
  type VisualPreferences,
  type VisualStyle,
} from "@/types/visual-preferences";

type VisualPreferencesContextValue = {
  preferences: VisualPreferences;
  colorScheme: "dark" | "light";
  isLoading: boolean;
  preferenceError: string | null;
  shouldReduceMotion: boolean;
  setAppearance: (appearance: AppearanceMode) => Promise<void>;
  setStyle: (style: VisualStyle) => Promise<void>;
  setReduceAnimations: (reduceAnimations: boolean) => Promise<void>;
};

const VisualPreferencesContext =
  createContext<VisualPreferencesContextValue | null>(null);

export function VisualPreferencesProvider({ children }: PropsWithChildren) {
  const { session, isLoading: isAuthLoading, syncStatus } = useAuth();
  const systemScheme = useColorScheme();
  const systemReducedMotion = useReducedMotion();
  const [preferences, setPreferences] = useState(DEFAULT_VISUAL_PREFERENCES);
  const [loadedUserId, setLoadedUserId] = useState<string | null | undefined>(
    undefined,
  );
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [platformReducedMotion, setPlatformReducedMotion] =
    useState(systemReducedMotion);
  const userId = session?.user.id ?? null;
  const resolvedScheme =
    preferences.appearance === "system"
      ? systemScheme === "light"
        ? "light"
        : "dark"
      : preferences.appearance;

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const colors = Colors[resolvedScheme];
    document.documentElement.style.setProperty(
      "--app-background",
      colors.background,
    );
    document.documentElement.style.setProperty("--app-text", colors.text);
    document.documentElement.style.colorScheme = resolvedScheme;
  }, [resolvedScheme]);

  useEffect(() => {
    let active = true;
    const scope = getAccountStorageScope(userId);
    void getVisualPreferences(scope)
      .then((stored) => {
        if (active && isActiveAccountStorageScope(scope)) {
          setPreferences(stored);
          setPreferenceError(null);
          setLoadedUserId(userId);
        }
      })
      .catch((error: unknown) => {
        console.error("Could not load visual preferences:", error);
        if (active && isActiveAccountStorageScope(scope)) {
          setPreferences(DEFAULT_VISUAL_PREFERENCES);
          setPreferenceError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as preferências visuais.",
          );
          setLoadedUserId(userId);
        }
      })
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || syncStatus !== "synced") return;
    let active = true;
    const scope = getAccountStorageScope(userId);
    void getVisualPreferences(scope)
      .then((stored) => {
        if (active && isActiveAccountStorageScope(scope)) {
          setPreferences(stored);
          setPreferenceError(null);
        }
      })
      .catch((error: unknown) => {
        console.error("Could not refresh synchronized visual preferences:", error);
      });
    return () => {
      active = false;
    };
  }, [syncStatus, userId]);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setPlatformReducedMotion(enabled);
    }).catch((error: unknown) => {
      console.error("Could not read the system motion preference:", error);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setPlatformReducedMotion,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const update = useCallback(
    async (next: Omit<VisualPreferences, "updatedAt">) => {
      const scope = getAccountStorageScope(userId);
      const updated = await saveVisualPreferences(next, scope);
      if (isActiveAccountStorageScope(scope)) {
        setPreferences(updated);
        setPreferenceError(null);
      }
    },
    [userId],
  );

  const value = useMemo<VisualPreferencesContextValue>(() => {
    const shouldReduceMotion =
      preferences.reduceAnimations || platformReducedMotion || systemReducedMotion;
    return {
      preferences,
      colorScheme: resolvedScheme,
      isLoading: loadedUserId !== userId || isAuthLoading,
      preferenceError,
      shouldReduceMotion,
      setAppearance: (appearance) =>
        update({ ...preferences, appearance }),
      setStyle: (style) => update({ ...preferences, style }),
      setReduceAnimations: (reduceAnimations) =>
        update({ ...preferences, reduceAnimations }),
    };
  }, [
    isAuthLoading,
    loadedUserId,
    platformReducedMotion,
    preferences,
    preferenceError,
    resolvedScheme,
    systemReducedMotion,
    update,
    userId,
  ]);

  return (
    <VisualPreferencesContext.Provider value={value}>
      {children}
    </VisualPreferencesContext.Provider>
  );
}

export function useVisualPreferences(): VisualPreferencesContextValue {
  const context = useContext(VisualPreferencesContext);
  if (!context) {
    throw new Error(
      "useVisualPreferences precisa ser usado dentro de VisualPreferencesProvider.",
    );
  }
  return context;
}
