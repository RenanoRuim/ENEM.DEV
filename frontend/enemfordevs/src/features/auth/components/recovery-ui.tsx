import { ArrowLeft, ArrowRight, Check, Code2, Eye, EyeOff, ShieldCheck } from "lucide-react-native";
import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme, useThemedStyles } from "@/hooks/use-theme";

export const recoveryColors = {
  background: "#0D1117",
  surface: "#161B22",
  elevated: "#1C232D",
  border: "#30363D",
  text: "#E6EDF3",
  muted: "#8B949E",
  green: "#39D353",
  blue: "#58A6FF",
  orange: "#F0883E",
};

export function RecoveryFrame({
  eyebrow,
  title,
  description,
  children,
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>) {
  const colors = useTheme();
  const styles = useThemedStyles(baseStyles);
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Code2 color={colors.green} size={19} />
            </View>
            <Text style={styles.brandName}>ENEM.DEV</Text>
          </View>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          {children}
        </View>
        <Text style={styles.footer}>ENEM.DEV · Estude com intenção.</Text>
      </ScrollView>
    </View>
  );
}

export function RecoveryField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  onToggleVisibility,
  visibilityLabel,
  keyboardType,
  autoComplete,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  onToggleVisibility?: () => void;
  visibilityLabel?: string;
  keyboardType?: "email-address";
  autoComplete: "email" | "new-password";
}) {
  const colors = useTheme();
  const styles = useThemedStyles(baseStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputShell}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="none"
          autoComplete={autoComplete}
          autoCorrect={false}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={secureTextEntry}
          style={styles.input}
          value={value}
        />
        {onToggleVisibility && visibilityLabel ? (
          <Pressable
            accessibilityLabel={visibilityLabel}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onToggleVisibility}
            style={styles.visibilityButton}
          >
            {secureTextEntry ? (
              <Eye color={colors.muted} size={17} />
            ) : (
              <EyeOff color={colors.muted} size={17} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function RecoveryFeedback({
  kind,
  children,
}: PropsWithChildren<{ kind: "success" | "error" }>) {
  const colors = useTheme();
  const styles = useThemedStyles(baseStyles);
  const success = kind === "success";
  return (
    <View style={[styles.feedback, success ? styles.success : styles.error]}>
      {success ? (
        <Check color={colors.green} size={17} />
      ) : (
        <ShieldCheck color={colors.orange} size={17} />
      )}
      <Text style={[styles.feedbackText, success ? styles.successText : styles.errorText]}>
        {children}
      </Text>
    </View>
  );
}

export function RecoveryButton({
  label,
  loading,
  disabled,
  onPress,
  secondary = false,
}: {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  secondary?: boolean;
}) {
  const colors = useTheme();
  const styles = useThemedStyles(baseStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        secondary ? styles.secondaryButton : styles.primaryButton,
        (disabled || loading) && styles.disabledButton,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.green : colors.background} />
      ) : (
        <>
          <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>
            {label}
          </Text>
          {secondary ? (
            <ArrowLeft color={colors.text} size={17} />
          ) : (
            <ArrowRight color={colors.background} size={17} />
          )}
        </>
      )}
    </Pressable>
  );
}

const baseStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: recoveryColors.background },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    gap: 17,
    padding: 24,
    borderWidth: 1,
    borderColor: recoveryColors.border,
    borderRadius: 18,
    backgroundColor: recoveryColors.surface,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${recoveryColors.green}50`,
    borderRadius: 10,
    backgroundColor: `${recoveryColors.green}18`,
  },
  brandName: { color: recoveryColors.text, fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  eyebrow: { color: recoveryColors.blue, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: recoveryColors.text, fontSize: 24, lineHeight: 30, fontWeight: "700" },
  description: { color: recoveryColors.muted, fontSize: 12, lineHeight: 18 },
  field: { gap: 7 },
  label: { color: recoveryColors.text, fontSize: 11, fontWeight: "700" },
  inputShell: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: recoveryColors.border,
    borderRadius: 10,
    backgroundColor: recoveryColors.background,
  },
  input: { minWidth: 0, minHeight: 46, flex: 1, color: recoveryColors.text, fontSize: 13 },
  visibilityButton: { minWidth: 28, minHeight: 34, alignItems: "center", justifyContent: "center" },
  feedback: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 11, borderWidth: 1, borderRadius: 10 },
  success: { borderColor: `${recoveryColors.green}55`, backgroundColor: `${recoveryColors.green}18` },
  error: { borderColor: `${recoveryColors.orange}55`, backgroundColor: `${recoveryColors.orange}10` },
  feedbackText: { flex: 1, fontSize: 11, lineHeight: 17 },
  successText: { color: recoveryColors.green },
  errorText: { color: recoveryColors.orange },
  button: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
  },
  primaryButton: { borderColor: recoveryColors.green, backgroundColor: recoveryColors.green },
  secondaryButton: { borderColor: recoveryColors.border, backgroundColor: recoveryColors.elevated },
  buttonText: { color: recoveryColors.background, fontSize: 12, fontWeight: "800" },
  secondaryButtonText: { color: recoveryColors.text },
  disabledButton: { opacity: 0.48 },
  footer: { alignSelf: "center", marginTop: 16, color: recoveryColors.muted, fontSize: 9 },
});
