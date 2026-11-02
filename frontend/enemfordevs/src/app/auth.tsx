import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  Code2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { ComponentRef, ReactNode, RefObject } from "react";
import Animated, {
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";

import { MOTION_DURATION } from "@/components/motion";
import { useAuth } from "@/contexts/auth-context";
import { shouldConfirmLogout } from "@/features/auth/services/auth-flow-policy";
import { useViewportWidth } from "@/hooks/use-is-wide-layout";
import { useDynamicMotion, useTheme, useThemedStyles } from "@/hooks/use-theme";

type Feedback = { kind: "error" | "success"; text: string };
type AuthMode = "sign-in" | "sign-up";
type FieldName = "email" | "password" | "confirmation";

const colors = {
  background: "#0D1117",
  surface: "#161B22",
  elevated: "#1C232D",
  border: "#30363D",
  text: "#E6EDF3",
  muted: "#8B949E",
  green: "#39D353",
  greenSoft: "#39D35318",
  blue: "#58A6FF",
  orange: "#F0883E",
};

function getAuthFeedback(error: unknown): Feedback {
  const message =
    error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("email not confirmed")) {
    return {
      kind: "error",
      text: "Confirme seu e-mail pelo link enviado antes de entrar.",
    };
  }
  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return { kind: "error", text: "E-mail ou senha incorretos." };
  }
  if (
    message.includes("already registered") ||
    message.includes("user already exists") ||
    message.includes("already been registered")
  ) {
    return {
      kind: "error",
      text: "Este e-mail já possui cadastro. Tente entrar na sua conta.",
    };
  }
  if (
    message.includes("rate limit") ||
    message.includes("too many requests")
  ) {
    return {
      kind: "error",
      text: "Muitas tentativas em pouco tempo. Aguarde um momento e tente novamente.",
    };
  }
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection")
  ) {
    return {
      kind: "error",
      text: "Não foi possível conectar. Verifique sua internet e tente novamente.",
    };
  }
  return {
    kind: "error",
    text: "Não foi possível concluir. Confira seus dados e tente novamente.",
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim());
}

function SyncStatusMessage({
  status,
  error,
}: {
  status: "idle" | "syncing" | "synced" | "error";
  error: string | null;
}) {
  const colors = useTheme();
  const styles = useThemedStyles(baseStyles);
  const copy =
    status === "syncing"
      ? "Sincronizando seus dados com segurança..."
      : status === "synced"
        ? "Seus dados estão sincronizados."
        : status === "error"
          ? error?.toLowerCase().includes("connection") ||
            error?.toLowerCase().includes("network")
            ? "Sem conexão no momento. Seus dados locais continuam preservados."
            : "Não foi possível sincronizar agora. Seus dados locais continuam preservados."
          : "Sua conta está pronta para sincronizar.";
  const isError = status === "error";

  return (
    <View style={[styles.statusNotice, isError && styles.statusNoticeError]}>
      {status === "syncing" ? (
        <ActivityIndicator color={colors.blue} size="small" />
      ) : isError ? (
        <ShieldCheck color={colors.orange} size={17} />
      ) : (
        <Check color={colors.green} size={17} />
      )}
      <Text style={[styles.statusNoticeText, isError && styles.errorText]}>
        {copy}
      </Text>
    </View>
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const width = useViewportWidth();
  const reduceMotion = useDynamicMotion();
  const colors = useTheme();
  const styles = useThemedStyles(baseStyles);
  const isWide = width >= 900;
  const {
    session,
    isConfigured,
    isLoading,
    hasPendingSync,
    syncStatus,
    syncError,
    signIn,
    signUp,
    signOut,
    retrySync,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoutConfirmation, setLogoutConfirmation] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [focusedField, setFocusedField] = useState<FieldName | null>(null);
  const passwordInputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const confirmationInputRef = useRef<ComponentRef<typeof TextInput>>(null);

  function changeMode(nextMode: AuthMode) {
    if (isSubmitting || mode === nextMode) return;
    setMode(nextMode);
    setConfirmation("");
    setFeedback(null);
  }

  function validateForm(): string | null {
    if (!email.trim() || !password) {
      return "Preencha seu e-mail e sua senha para continuar.";
    }
    if (!isValidEmail(email)) {
      return "Digite um endereço de e-mail válido.";
    }
    if (mode === "sign-up") {
      if (password.length < 6) {
        return "Sua senha precisa ter pelo menos 6 caracteres.";
      }
      if (password !== confirmation) {
        return "As senhas não coincidem. Confira e tente novamente.";
      }
    }
    return null;
  }

  async function submit() {
    if (!isConfigured || isSubmitting) return;
    setFeedback(null);
    const validationError = validateForm();
    if (validationError) {
      setFeedback({ kind: "error", text: validationError });
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "sign-up") {
        const hasSession = await signUp(email.trim(), password);
        if (hasSession) {
          router.replace("/");
          return;
        }
        setFeedback({
          kind: "success",
          text: "Conta criada. Confirme seu e-mail pelo link enviado para começar.",
        });
      } else {
        await signIn(email.trim(), password);
        router.replace("/");
      }
    } catch (error) {
      setFeedback(getAuthFeedback(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function leaveAccount(disposition: "sync" | "discard") {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await signOut(disposition);
      router.replace("/auth");
    } catch (error) {
      setFeedback({
        kind: "error",
        text:
          error instanceof Error &&
          error.message.includes("alguns dados locais não puderam")
            ? error.message
            : getAuthFeedback(error).text,
      });
    } finally {
      setIsSubmitting(false);
      setLogoutConfirmation(false);
    }
  }

  function requestLeaveAccount() {
    if (isSubmitting) return;
    if (shouldConfirmLogout(hasPendingSync, syncStatus)) {
      setLogoutConfirmation(true);
      return;
    }
    void leaveAccount("discard");
  }

  async function retry() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await retrySync();
      setFeedback({ kind: "success", text: "Sincronização concluída." });
    } catch {
      setFeedback({
        kind: "error",
        text: "Não foi possível sincronizar agora. Seus dados locais continuam preservados.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const entering = reduceMotion
    ? undefined
    : FadeInDown.duration(MOTION_DURATION.authEntry);

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isWide && styles.scrollContentWide,
          ]}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.layout, isWide && styles.layoutWide]}>
            <Animated.View
              entering={
                reduceMotion
                  ? undefined
                  : FadeIn.duration(MOTION_DURATION.authFeedback)
              }
              style={[styles.intro, isWide && styles.introWide]}
            >
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <Code2 color={colors.green} size={21} strokeWidth={2.2} />
                </View>
                <Text style={styles.brandName}>ENEM.DEV</Text>
              </View>
              <View style={styles.eyebrow}>
                <View style={styles.eyebrowDot} />
                <Text style={styles.eyebrowText}>SUA JORNADA COMEÇA AQUI</Text>
              </View>
              <Text style={[styles.heroTitle, !isWide && styles.heroTitleMobile]}>
                Constância hoje.
                {"\n"}
                <Text style={styles.heroAccent}>Conquista amanhã.</Text>
              </Text>
              <Text style={styles.heroDescription}>
                Um espaço para praticar, acompanhar sua evolução e chegar ao
                ENEM com mais confiança — um passo de cada vez.
              </Text>
              <View
                style={[
                  styles.benefitList,
                  !isWide && styles.benefitListMobile,
                ]}
              >
                <BenefitRow
                  icon={<BookOpenCheck color={colors.green} size={17} />}
                  title="Prática com propósito"
                  description="Questões e revisão no seu ritmo."
                />
                <BenefitRow
                  icon={<ShieldCheck color={colors.blue} size={17} />}
                  title="Seu progresso, protegido"
                  description="Dados separados e sincronizados na sua conta."
                />
              </View>
              <View style={styles.motivation}>
                <Sparkles color={colors.orange} size={15} />
                <Text style={styles.motivationText}>
                  Pequenos avanços também contam.
                </Text>
              </View>
            </Animated.View>

            <Animated.View
              entering={entering}
              style={[styles.panel, isWide && styles.panelWide]}
            >
              <View style={styles.panelHeading}>
                <Text style={styles.panelEyebrow}>
                  {session ? "ESPAÇO PESSOAL" : "BEM-VINDO DE VOLTA"}
                </Text>
                <Text style={styles.panelTitle}>
                  {session
                    ? "Sua conta"
                    : mode === "sign-in"
                      ? "Entre na sua conta"
                      : "Crie sua conta"}
                </Text>
                <Text style={styles.panelDescription}>
                  {session
                    ? "Acompanhe o estado da sua conta e dos seus dados."
                    : mode === "sign-in"
                      ? "Continue de onde parou na sua preparação."
                      : "Comece a construir seu ritmo de estudos."}
                </Text>
              </View>

              {isLoading ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator color={colors.green} />
                  <Text style={styles.loadingText}>Verificando sua conta...</Text>
                </View>
              ) : session ? (
                <View style={styles.accountContent}>
                  <View style={styles.accountIdentity}>
                    <View style={styles.accountAvatar}>
                      <Text style={styles.accountAvatarText}>
                        {(session.user.email?.[0] ?? "E").toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.accountCopy}>
                      <Text style={styles.accountLabel}>CONECTADO COMO</Text>
                      <Text style={styles.accountEmail} numberOfLines={1}>
                        {session.user.email}
                      </Text>
                    </View>
                  </View>
                  <SyncStatusMessage status={syncStatus} error={syncError} />
                  {syncStatus === "error" && (
                    <ActionButton
                      disabled={isSubmitting}
                      label="Tentar sincronizar novamente"
                      loading={isSubmitting}
                      onPress={() => void retry()}
                      variant="secondary"
                    />
                  )}
                  {logoutConfirmation ? (
                    <View style={styles.logoutConfirmation}>
                      <Text style={styles.logoutConfirmationTitle}>
                        Há alterações que podem não estar sincronizadas.
                      </Text>
                      <Text style={styles.logoutConfirmationText}>
                        Sincronize antes de sair ou descarte a cópia deste
                        dispositivo. Seus dados remotos não serão apagados.
                      </Text>
                      <ActionButton
                        disabled={isSubmitting}
                        label="Sincronizar e sair"
                        loading={isSubmitting}
                        onPress={() => void leaveAccount("sync")}
                        variant="primary"
                      />
                      <ActionButton
                        disabled={isSubmitting}
                        label="Descartar alterações e sair"
                        loading={false}
                        onPress={() => void leaveAccount("discard")}
                        variant="secondary"
                      />
                      <Pressable
                        accessibilityRole="button"
                        disabled={isSubmitting}
                        onPress={() => setLogoutConfirmation(false)}
                      >
                        <Text style={styles.cancelLogout}>Cancelar</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <ActionButton
                      disabled={isSubmitting}
                      label="Sair da conta"
                      loading={isSubmitting}
                      onPress={requestLeaveAccount}
                      variant="primary"
                    />
                  )}
                </View>
              ) : (
                <>
                  <View
                    accessibilityRole="tablist"
                    style={styles.modeSwitch}
                  >
                    <ModeButton
                      active={mode === "sign-in"}
                      disabled={isSubmitting}
                      label="Entrar"
                      onPress={() => changeMode("sign-in")}
                    />
                    <ModeButton
                      active={mode === "sign-up"}
                      disabled={isSubmitting}
                      label="Criar conta"
                      onPress={() => changeMode("sign-up")}
                    />
                  </View>

                  {!isConfigured && (
                    <View style={styles.configNotice}>
                      <ShieldCheck color={colors.orange} size={17} />
                      <Text style={styles.configNoticeText}>
                        O acesso à conta está indisponível. Configure as
                        variáveis públicas do Supabase no app.
                      </Text>
                    </View>
                  )}

                  <View style={styles.form}>
                    <InputField
                      autoComplete="email"
                      focused={focusedField === "email"}
                      icon={<Mail color={colors.muted} size={17} />}
                      keyboardType="email-address"
                      label="E-mail"
                      onBlur={() => setFocusedField(null)}
                      onChangeText={(value) => {
                        setEmail(value);
                        setFeedback(null);
                      }}
                      onFocus={() => setFocusedField("email")}
                      onSubmitEditing={() => passwordInputRef.current?.focus()}
                      placeholder="voce@exemplo.com"
                      returnKeyType="next"
                      value={email}
                      blurOnSubmit={false}
                    />
                    <InputField
                      autoComplete={
                        mode === "sign-up" ? "new-password" : "current-password"
                      }
                      focused={focusedField === "password"}
                      icon={<LockKeyhole color={colors.muted} size={17} />}
                      inputRef={passwordInputRef}
                      label="Senha"
                      onBlur={() => setFocusedField(null)}
                      onChangeText={(value) => {
                        setPassword(value);
                        setFeedback(null);
                      }}
                      onFocus={() => setFocusedField("password")}
                      onSubmitEditing={() => {
                        if (mode === "sign-up") {
                          confirmationInputRef.current?.focus();
                        } else {
                          void submit();
                        }
                      }}
                      placeholder={
                        mode === "sign-up" ? "Mínimo de 6 caracteres" : "Sua senha"
                      }
                      secureTextEntry={!showPassword}
                      value={password}
                      returnKeyType={mode === "sign-up" ? "next" : "done"}
                      visibilityLabel={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                      onToggleVisibility={() =>
                        setShowPassword((visible) => !visible)
                      }
                    />
                    {mode === "sign-in" && (
                      <Pressable
                        accessibilityRole="link"
                        disabled={!isConfigured || isSubmitting}
                        onPress={() =>
                          router.push("/forgot-password" as Href)
                        }
                        style={styles.forgotPasswordButton}
                      >
                        <Text style={styles.forgotPasswordText}>
                          Esqueci minha senha
                        </Text>
                      </Pressable>
                    )}
                    {mode === "sign-up" && (
                      <InputField
                        autoComplete="new-password"
                        focused={focusedField === "confirmation"}
                        icon={<LockKeyhole color={colors.muted} size={17} />}
                        inputRef={confirmationInputRef}
                        label="Confirme sua senha"
                        onBlur={() => setFocusedField(null)}
                        onChangeText={(value) => {
                          setConfirmation(value);
                          setFeedback(null);
                        }}
                        onFocus={() => setFocusedField("confirmation")}
                        onSubmitEditing={() => void submit()}
                        placeholder="Digite a senha novamente"
                        returnKeyType="done"
                        secureTextEntry={!showPassword}
                        value={confirmation}
                        visibilityLabel={
                          showPassword ? "Ocultar senha" : "Mostrar senha"
                        }
                        onToggleVisibility={() =>
                          setShowPassword((visible) => !visible)
                        }
                      />
                    )}
                    {feedback && (
                      <FeedbackNotice feedback={feedback} />
                    )}
                    <ActionButton
                      disabled={!isConfigured || isSubmitting}
                      label={
                        mode === "sign-in" ? "Entrar na conta" : "Criar minha conta"
                      }
                      loading={isSubmitting}
                      onPress={() => void submit()}
                      variant="primary"
                    />
                  </View>

                  <View style={styles.privacyNote}>
                    <ShieldCheck color={colors.muted} size={14} />
                    <Text style={styles.privacyText}>
                      Os dados do visitante e de cada conta permanecem separados.
                    </Text>
                  </View>
                </>
              )}
            </Animated.View>
          </View>
          <Text style={styles.footerText}>
            ENEM.DEV · Estude com intenção. Evolua no seu ritmo.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function BenefitRow({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  const styles = useThemedStyles(baseStyles);

  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>{icon}</View>
      <View style={styles.benefitCopy}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitDescription}>{description}</Text>
      </View>
    </View>
  );
}

function ModeButton({
  active,
  disabled,
  label,
  onPress,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(baseStyles);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeButton,
        active && styles.modeButtonActive,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function InputField({
  autoComplete,
  focused,
  icon,
  inputRef,
  keyboardType,
  label,
  onBlur,
  onChangeText,
  onFocus,
  onToggleVisibility,
  onSubmitEditing,
  blurOnSubmit,
  placeholder,
  returnKeyType,
  secureTextEntry,
  value,
  visibilityLabel,
}: {
  autoComplete: "email" | "new-password" | "current-password";
  focused: boolean;
  icon: ReactNode;
  keyboardType?: "email-address";
  label: string;
  onBlur: () => void;
  onChangeText: (value: string) => void;
  onFocus: () => void;
  onToggleVisibility?: () => void;
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
  inputRef?: RefObject<ComponentRef<typeof TextInput> | null>;
  placeholder: string;
  returnKeyType?: "next" | "done";
  secureTextEntry?: boolean;
  value: string;
  visibilityLabel?: string;
}) {
  const colors = useTheme();
  const styles = useThemedStyles(baseStyles);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputShell, focused && styles.inputShellFocused]}>
        {icon}
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="none"
          autoComplete={autoComplete}
          autoCorrect={false}
          blurOnSubmit={blurOnSubmit ?? returnKeyType !== "next"}
          keyboardType={keyboardType}
          onBlur={onBlur}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          ref={inputRef}
          returnKeyType={returnKeyType}
          secureTextEntry={secureTextEntry}
          selectionColor={colors.green}
          style={styles.input}
          value={value}
        />
        {onToggleVisibility && visibilityLabel && (
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
        )}
      </View>
    </View>
  );
}

function FeedbackNotice({ feedback }: { feedback: Feedback }) {
  const colors = useTheme();
  const styles = useThemedStyles(baseStyles);
  const success = feedback.kind === "success";
  return (
    <View
      style={[
        styles.feedbackNotice,
        success ? styles.feedbackSuccess : styles.feedbackError,
      ]}
    >
      {success ? (
        <Check color={colors.green} size={17} />
      ) : (
        <ShieldCheck color={colors.orange} size={17} />
      )}
      <Text
        style={[
          styles.feedbackText,
          success ? styles.successText : styles.errorText,
        ]}
      >
        {feedback.text}
      </Text>
    </View>
  );
}

function ActionButton({
  disabled,
  label,
  loading,
  onPress,
  variant,
}: {
  disabled: boolean;
  label: string;
  loading: boolean;
  onPress: () => void;
  variant: "primary" | "secondary";
}) {
  const colors = useTheme();
  const styles = useThemedStyles(baseStyles);
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        primary ? styles.primaryButton : styles.secondaryButton,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.background : colors.green} />
      ) : (
        <>
          <Text
            style={[
              styles.actionButtonText,
              primary ? styles.primaryButtonText : styles.secondaryButtonText,
            ]}
          >
            {label}
          </Text>
          {primary && <ArrowRight color={colors.background} size={17} />}
        </>
      )}
    </Pressable>
  );
}

const baseStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
  },
  scrollContentWide: {
    paddingHorizontal: 40,
    paddingVertical: 36,
  },
  layout: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    gap: 20,
  },
  layoutWide: {
    maxWidth: 1120,
    minHeight: 560,
    flexDirection: "row",
    alignItems: "center",
    gap: 76,
  },
  intro: {
    gap: 14,
    paddingHorizontal: 2,
  },
  introWide: {
    flex: 1,
    maxWidth: 470,
    gap: 21,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },
  brandMark: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${colors.green}50`,
    borderRadius: 11,
    backgroundColor: colors.greenSoft,
  },
  brandName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.15,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  eyebrowText: {
    color: colors.green,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 42,
    lineHeight: 49,
    fontWeight: "800",
    letterSpacing: -1.5,
  },
  heroTitleMobile: {
    fontSize: 30,
    lineHeight: 35,
    letterSpacing: -0.8,
  },
  heroAccent: { color: colors.green },
  heroDescription: {
    maxWidth: 430,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  benefitList: { gap: 15, marginTop: 3 },
  benefitListMobile: { display: "none" },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  benefitCopy: { gap: 2 },
  benefitTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  benefitDescription: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  motivation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  motivationText: {
    color: colors.muted,
    fontSize: 11,
    fontStyle: "italic",
  },
  panel: {
    width: "100%",
    gap: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 5,
  },
  panelWide: {
    maxWidth: 440,
    padding: 30,
  },
  panelHeading: { gap: 7 },
  panelEyebrow: {
    color: colors.blue,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.25,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  panelDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  modeSwitch: {
    flexDirection: "row",
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.background,
  },
  modeButton: {
    minHeight: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  modeButtonActive: { backgroundColor: colors.elevated },
  modeButtonText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  modeButtonTextActive: { color: colors.text },
  form: { gap: 15 },
  field: { gap: 7 },
  fieldLabel: { color: colors.text, fontSize: 11, fontWeight: "700" },
  inputShell: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  inputShellFocused: {
    borderColor: `${colors.green}B0`,
    shadowColor: colors.green,
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  input: {
    minWidth: 0,
    minHeight: 46,
    flex: 1,
    paddingVertical: 0,
    color: colors.text,
    fontSize: 13,
  },
  visibilityButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  configNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: 11,
    borderWidth: 1,
    borderColor: `${colors.orange}50`,
    borderRadius: 10,
    backgroundColor: `${colors.orange}10`,
  },
  configNoticeText: {
    flex: 1,
    color: colors.orange,
    fontSize: 11,
    lineHeight: 17,
  },
  actionButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
  },
  primaryButton: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  secondaryButton: {
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  actionButtonText: { fontSize: 12, fontWeight: "800" },
  primaryButtonText: { color: colors.background },
  secondaryButtonText: { color: colors.text },
  buttonDisabled: { opacity: 0.48 },
  privacyNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingTop: 2,
  },
  privacyText: { flex: 1, color: colors.muted, fontSize: 10, lineHeight: 15 },
  feedbackNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: 11,
    borderWidth: 1,
    borderRadius: 10,
  },
  feedbackSuccess: {
    borderColor: `${colors.green}55`,
    backgroundColor: colors.greenSoft,
  },
  feedbackError: {
    borderColor: `${colors.orange}55`,
    backgroundColor: `${colors.orange}10`,
  },
  feedbackText: { flex: 1, fontSize: 11, lineHeight: 17 },
  successText: { color: colors.green },
  errorText: { color: colors.orange },
  loadingState: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: colors.muted, fontSize: 12 },
  accountContent: { gap: 16 },
  logoutConfirmation: {
    gap: 11,
    padding: 13,
    borderWidth: 1,
    borderColor: `${colors.orange}55`,
    borderRadius: 12,
    backgroundColor: `${colors.orange}0C`,
  },
  logoutConfirmationTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  logoutConfirmationText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  cancelLogout: {
    paddingVertical: 6,
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    paddingVertical: 2,
  },
  forgotPasswordText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "600",
  },
  accountIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  accountAvatar: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.greenSoft,
  },
  accountAvatarText: { color: colors.green, fontSize: 16, fontWeight: "800" },
  accountCopy: { flex: 1, gap: 4 },
  accountLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },
  accountEmail: { color: colors.text, fontSize: 12, fontWeight: "600" },
  statusNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 12,
    borderWidth: 1,
    borderColor: `${colors.green}45`,
    borderRadius: 10,
    backgroundColor: colors.greenSoft,
  },
  statusNoticeError: {
    borderColor: `${colors.orange}45`,
    backgroundColor: `${colors.orange}10`,
  },
  statusNoticeText: { flex: 1, color: colors.text, fontSize: 11, lineHeight: 16 },
  footerText: {
    alignSelf: "center",
    marginTop: 20,
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  pressed: { opacity: 0.8 },
});
