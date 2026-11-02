/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useMemo } from "react";

import { Colors } from "@/constants/theme";
import { useVisualPreferences } from "@/contexts/visual-preferences-context";

type ThemeColors = (typeof Colors)[keyof typeof Colors];

export function useTheme() {
  const { colorScheme } = useVisualPreferences();
  return Colors[colorScheme];
}

function colorForTheme(value: string, colors: ThemeColors): string {
  const alphaMatch = value.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/iu);
  if (!alphaMatch) return value;
  const hex = alphaMatch[1].toUpperCase();
  const colorMap: Record<string, string> = {
    "0D1117": colors.background,
    "161B22": colors.surface,
    "1C232D": colors.elevated,
    "212225": colors.surface,
    "21262D": colors.backgroundSelected,
    "2E3135": colors.backgroundSelected,
    "30363D": colors.border,
    E6EDF3: colors.text,
    FFFFFF: colors.text,
    "8B949E": colors.muted,
    B0B4BA: colors.muted,
    "39D353": colors.green,
    "58A6FF": colors.blue,
    F0883E: colors.orange,
    F85149: colors.red,
  };
  const mapped = colorMap[hex];
  if (!mapped) return value;
  if (!alphaMatch[2]) return mapped;
  const alpha = Number.parseInt(alphaMatch[2], 16) / 255;
  const rgb = mapped.match(/^#([0-9a-f]{6})$/iu)?.[1];
  if (!rgb) return value;
  const channels = [0, 2, 4].map((offset) =>
    Number.parseInt(rgb.slice(offset, offset + 2), 16),
  );
  return `rgba(${channels.join(", ")}, ${alpha.toFixed(3)})`;
}

function mapStyleColors(
  value: unknown,
  colors: ThemeColors,
): unknown {
  if (typeof value === "string") return colorForTheme(value, colors);
  if (Array.isArray(value)) {
    return value.map((item) => mapStyleColors(item, colors));
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      mapStyleColors(item, colors),
    ]),
  );
}

export function useThemedStyles<T extends Record<string, object>>(styles: T): T {
  const theme = useTheme();
  return useMemo(
    () => mapStyleColors(styles, theme) as T,
    [styles, theme],
  );
}

export function useShouldReduceMotion(): boolean {
  return useVisualPreferences().shouldReduceMotion;
}

export function useMotionEnabled(): boolean {
  const { preferences, shouldReduceMotion } = useVisualPreferences();
  return preferences.style === "dynamic" && !shouldReduceMotion;
}

export function useDynamicMotion(): boolean {
  return !useMotionEnabled();
}
