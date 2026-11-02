import { DefaultTheme, DarkTheme, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import AppTabs from "@/components/app-tabs";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { VisualPreferencesProvider, useVisualPreferences } from "@/contexts/visual-preferences-context";
import { useTheme } from "@/hooks/use-theme";

function AccountScopedTabs() {
  const { isLoading, session } = useAuth();
  const { colorScheme, isLoading: preferencesLoading } = useVisualPreferences();
  const colors = useTheme();
  const navigationTheme = useMemo(() => {
    const base = colorScheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.surface,
        primary: colors.green,
        text: colors.text,
        border: colors.border,
        notification: colors.orange,
      },
    };
  }, [colorScheme, colors]);

  if (isLoading || preferencesLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <AppTabs key={session?.user.id ?? "guest"} />
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <AuthProvider>
      <VisualPreferencesProvider>
        <AccountScopedTabs />
      </VisualPreferencesProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
