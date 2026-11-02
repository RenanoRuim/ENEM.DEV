import { ArrowLeft, Check, Monitor, Moon, Sun } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/contexts/auth-context";
import { useVisualPreferences } from "@/contexts/visual-preferences-context";
import { useIsWideLayout } from "@/hooks/use-is-wide-layout";
import { useShouldReduceMotion, useTheme, useThemedStyles } from "@/hooks/use-theme";
import type {
  AppearanceMode,
  VisualStyle,
} from "@/types/visual-preferences";

const appearanceOptions: {
  value: AppearanceMode;
  label: string;
  description: string;
  icon: typeof Moon;
}[] = [
  {
    value: "dark",
    label: "Escuro",
    description: "Preserva o visual atual do ENEM.DEV.",
    icon: Moon,
  },
  {
    value: "light",
    label: "Claro",
    description: "Superfícies claras e tons confortáveis para estudar.",
    icon: Sun,
  },
  {
    value: "system",
    label: "Seguir sistema",
    description: "Acompanha a aparência definida no dispositivo.",
    icon: Monitor,
  },
];

const styleOptions: {
  value: VisualStyle;
  label: string;
  description: string;
}[] = [
  {
    value: "classic",
    label: "Clássico",
    description: "Experiência atual, com efeitos discretos e foco na leitura.",
  },
  {
    value: "dynamic",
    label: "Dinâmico",
    description: "Microinterações e transições suaves, sem excesso de movimento.",
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const isWide = useIsWideLayout();
  const colors = useTheme();
  const styles = useThemedStyles(baseStyles);
  const shouldReduceMotion = useShouldReduceMotion();
  const { session, syncError, syncStatus } = useAuth();
  const {
    preferences,
    preferenceError,
    setAppearance,
    setStyle,
    setReduceAnimations,
  } = useVisualPreferences();
  const [saveError, setSaveError] = useState<string | null>(null);

  async function savePreference(update: () => Promise<void>) {
    setSaveError(null);
    try {
      await update();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar suas preferências.",
      );
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Aparência" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar à tela anterior"
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/");
        }}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <ArrowLeft color={colors.blue} size={18} />
        <Text style={[styles.backText, { color: colors.blue }]}>Voltar</Text>
      </Pressable>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isWide && styles.contentWide,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={styles.title}>Personalize sua experiência</Text>
          <Text style={styles.description}>
            Ajuste o visual para estudar com conforto. As mesmas telas e
            ferramentas continuam disponíveis em todas as opções.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tema</Text>
          <Text style={styles.sectionDescription}>
            Escolha como as cores do aplicativo são exibidas.
          </Text>
          <View style={styles.options}>
            {appearanceOptions.map(({ value, label, description, icon: Icon }) => {
              const selected = preferences.appearance === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => void savePreference(() => setAppearance(value))}
                  style={[
                    styles.option,
                    selected && styles.selectedOption,
                  ]}
                >
                  <View style={styles.optionIcon}>
                    <Icon
                      color={selected ? colors.green : colors.muted}
                      size={19}
                    />
                  </View>
                  <View style={styles.optionCopy}>
                    <Text style={styles.optionTitle}>{label}</Text>
                    <Text style={styles.optionDescription}>{description}</Text>
                  </View>
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[
                      styles.radio,
                      selected && styles.radioSelected,
                    ]}
                  >
                    {selected && <Check color={colors.white} size={13} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estilo visual</Text>
          <Text style={styles.sectionDescription}>
            Os estilos usam a mesma estrutura; apenas a intensidade dos efeitos
            muda.
          </Text>
          <View style={styles.options}>
            {styleOptions.map(({ value, label, description }) => {
              const selected = preferences.style === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => void savePreference(() => setStyle(value))}
                  style={[
                    styles.option,
                    selected && styles.selectedOption,
                  ]}
                >
                  <View style={styles.optionCopy}>
                    <Text style={styles.optionTitle}>{label}</Text>
                    <Text style={styles.optionDescription}>{description}</Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      selected && styles.radioSelected,
                    ]}
                  >
                    {selected && <Check color={colors.white} size={13} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, styles.motionRow]}>
          <View style={styles.motionCopy}>
            <Text style={styles.sectionTitle}>Reduzir animações</Text>
            <Text style={styles.sectionDescription}>
              Desativa movimentos decorativos. A preferência de redução de
              movimento do sistema também é respeitada.
            </Text>
            {shouldReduceMotion && (
              <Text style={styles.systemMotion}>
                Redução de movimento ativa neste dispositivo.
              </Text>
            )}
          </View>
          <Switch
            accessibilityLabel="Reduzir animações"
            accessibilityHint="Reduz animações não essenciais do aplicativo"
            value={preferences.reduceAnimations}
            onValueChange={(enabled) =>
              void savePreference(() => setReduceAnimations(enabled))
            }
            trackColor={{ false: colors.border, true: colors.green }}
            thumbColor={colors.white}
          />
        </View>

        {saveError && (
          <Text accessibilityRole="alert" style={styles.error}>
            Não foi possível salvar a preferência: {saveError}
          </Text>
        )}
        {preferenceError && (
          <Text accessibilityRole="alert" style={styles.error}>
            Não foi possível carregar as preferências salvas: {preferenceError}
          </Text>
        )}
        {session && syncStatus === "error" && (
          <Text accessibilityRole="alert" style={styles.error}>
            A preferência está salva neste dispositivo, mas a sincronização da
            conta falhou: {syncError ?? "Tente sincronizar novamente na tela Conta."}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D1117" },
  backButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
  },
  backText: { fontSize: 13, fontWeight: "600" },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    gap: 22,
    padding: 18,
    paddingBottom: 36,
  },
  contentWide: { padding: 30 },
  intro: { gap: 8, paddingVertical: 6 },
  title: { color: "#E6EDF3", fontSize: 22, fontWeight: "800" },
  description: { color: "#8B949E", fontSize: 14, lineHeight: 21 },
  section: {
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#30363D",
    borderRadius: 12,
    backgroundColor: "#161B22",
  },
  sectionTitle: { color: "#E6EDF3", fontSize: 15, fontWeight: "700" },
  sectionDescription: { color: "#8B949E", fontSize: 12, lineHeight: 18 },
  options: { gap: 8, marginTop: 6 },
  option: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#30363D",
    borderRadius: 9,
    backgroundColor: "#0D1117",
  },
  selectedOption: {
    borderColor: "#39D353",
    backgroundColor: "#39D35312",
  },
  optionIcon: { width: 26, alignItems: "center" },
  optionCopy: { flex: 1, gap: 3 },
  optionTitle: { color: "#E6EDF3", fontSize: 13, fontWeight: "700" },
  optionDescription: { color: "#8B949E", fontSize: 11, lineHeight: 16 },
  radio: {
    width: 21,
    height: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#8B949E",
    borderRadius: 11,
  },
  radioSelected: {
    borderColor: "#39D353",
    backgroundColor: "#39D353",
  },
  motionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  motionCopy: { flex: 1, gap: 6 },
  systemMotion: { color: "#0969DA", fontSize: 11, fontWeight: "600" },
  error: { color: "#F85149", fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.75 },
});
