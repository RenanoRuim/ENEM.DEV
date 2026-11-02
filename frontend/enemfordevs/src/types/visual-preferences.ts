export type AppearanceMode = "dark" | "light" | "system";
export type VisualStyle = "classic" | "dynamic";

export interface VisualPreferences {
  appearance: AppearanceMode;
  style: VisualStyle;
  reduceAnimations: boolean;
  updatedAt: string;
}

export const DEFAULT_VISUAL_PREFERENCES: VisualPreferences = {
  appearance: "dark",
  style: "classic",
  reduceAnimations: false,
  updatedAt: "1970-01-01T00:00:00.000Z",
};

export function isVisualPreferences(
  value: unknown,
): value is VisualPreferences {
  if (!value || typeof value !== "object") return false;
  const preferences = value as Record<string, unknown>;
  return (
    (preferences.appearance === "dark" ||
      preferences.appearance === "light" ||
      preferences.appearance === "system") &&
    (preferences.style === "classic" || preferences.style === "dynamic") &&
    typeof preferences.reduceAnimations === "boolean" &&
    typeof preferences.updatedAt === "string" &&
    Number.isFinite(Date.parse(preferences.updatedAt))
  );
}
