import "@/global.css";

import { Platform } from "react-native";

const shared = {
  green: "#39D353",
  blue: "#58A6FF",
  orange: "#F0883E",
  red: "#F85149",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const Colors = {
  dark: {
    ...shared,
    text: "#E6EDF3",
    background: "#0D1117",
    backgroundElement: "#161B22",
    backgroundSelected: "#21262D",
    surface: "#161B22",
    elevated: "#1C232D",
    border: "#30363D",
    textSecondary: "#8B949E",
    muted: "#8B949E",
  },
  light: {
    ...shared,
    green: "#167A31",
    blue: "#0969DA",
    orange: "#9A4A00",
    red: "#CF222E",
    text: "#18232D",
    background: "#F4F7F9",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#EAF0F4",
    surface: "#FFFFFF",
    elevated: "#F8FAFC",
    border: "#D6DEE5",
    textSecondary: "#536170",
    muted: "#536170",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
