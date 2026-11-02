import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";

import { useAuth } from "@/contexts/auth-context";
import {
  RecoveryButton,
  RecoveryFeedback,
  RecoveryField,
  RecoveryFrame,
} from "@/features/auth/components/recovery-ui";
import { getNewPasswordValidationError } from "@/features/auth/services/auth-flow-policy";
import { getRecoveryErrorMessage } from "@/features/auth/services/password-recovery";
import { useTheme } from "@/hooks/use-theme";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { code: routeCode } = useLocalSearchParams<{ code?: string | string[] }>();
  const code = Array.isArray(routeCode) ? routeCode[0] : routeCode;
  const {
    isLoading,
    isPasswordRecovery,
    exchangeRecoveryCode,
    updatePassword,
  } = useAuth();
  const exchangedCode = useRef<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (
      Platform.OS === "web" ||
      !code ||
      isPasswordRecovery ||
      exchangedCode.current === code
    ) {
      return;
    }

    exchangedCode.current = code;
    let active = true;
    setIsExchanging(true);
    void exchangeRecoveryCode(code)
      .catch((error: unknown) => {
        if (active) setRecoveryError(getRecoveryErrorMessage(error));
      })
      .finally(() => {
        if (active) setIsExchanging(false);
      });

    return () => {
      active = false;
    };
  }, [code, exchangeRecoveryCode, isPasswordRecovery]);

  useEffect(() => {
    if (isLoading || isPasswordRecovery || isExchanging || recoveryError) return;
    const timeout = setTimeout(() => {
      setRecoveryError(
        "Este link não iniciou uma recuperação válida ou já expirou. Solicite um novo link.",
      );
    }, 8000);
    return () => clearTimeout(timeout);
  }, [isExchanging, isLoading, isPasswordRecovery, recoveryError]);

  async function submit() {
    if (!isPasswordRecovery || isSubmitting) return;
    const validationError = getNewPasswordValidationError(
      password,
      confirmation,
    );
    if (validationError) {
      setFeedback({
        kind: "error",
        message: validationError,
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await updatePassword(password);
      setPassword("");
      setConfirmation("");
      setFeedback({
        kind: "success",
        message: "Senha atualizada. Sua sessão foi mantida com segurança.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: getRecoveryErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isReady = isPasswordRecovery && !recoveryError;

  return (
    <RecoveryFrame
      eyebrow="NOVA SENHA"
      title="Crie uma nova senha"
      description="Use pelo menos 6 caracteres e confirme a senha antes de salvar."
    >
      {isLoading || isExchanging ? (
        <View style={{ minHeight: 72, alignItems: "center", justifyContent: "center", gap: 10 }}>
          <ActivityIndicator color={colors.green} />
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Validando o link de recuperação...
          </Text>
        </View>
      ) : recoveryError || !isReady ? (
        <View style={{ gap: 15 }}>
          <RecoveryFeedback kind="error">
            {recoveryError ?? "Abra o link de recuperação enviado ao seu e-mail."}
          </RecoveryFeedback>
          <RecoveryButton
            label="Voltar para entrar"
            onPress={() => router.replace("/auth")}
            secondary
          />
        </View>
      ) : feedback?.kind === "success" ? (
        <View style={{ gap: 15 }}>
          <RecoveryFeedback kind="success">{feedback.message}</RecoveryFeedback>
          <RecoveryButton
            label="Continuar para o ENEM.DEV"
            onPress={() => router.replace("/")}
          />
        </View>
      ) : (
        <View style={{ gap: 15 }}>
          <RecoveryField
            autoComplete="new-password"
            label="Nova senha"
            onChangeText={(value) => {
              setPassword(value);
              setFeedback(null);
            }}
            onToggleVisibility={() => setShowPassword((visible) => !visible)}
            placeholder="Mínimo de 6 caracteres"
            secureTextEntry={!showPassword}
            value={password}
            visibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
          />
          <RecoveryField
            autoComplete="new-password"
            label="Confirme a nova senha"
            onChangeText={(value) => {
              setConfirmation(value);
              setFeedback(null);
            }}
            onToggleVisibility={() => setShowPassword((visible) => !visible)}
            placeholder="Digite a senha novamente"
            secureTextEntry={!showPassword}
            value={confirmation}
            visibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
          />
          {feedback ? (
            <RecoveryFeedback kind={feedback.kind}>
              {feedback.message}
            </RecoveryFeedback>
          ) : null}
          <RecoveryButton
            disabled={!password || !confirmation}
            label="Atualizar senha"
            loading={isSubmitting}
            onPress={() => void submit()}
          />
        </View>
      )}
    </RecoveryFrame>
  );
}
