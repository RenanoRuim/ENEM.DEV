import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useAuth } from "@/contexts/auth-context";
import {
  RecoveryButton,
  RecoveryFeedback,
  RecoveryField,
  RecoveryFrame,
} from "@/features/auth/components/recovery-ui";
import {
  isValidAuthEmail,
} from "@/features/auth/services/auth-flow-policy";
import { getPasswordRecoveryRedirectUrl } from "@/features/auth/services/password-recovery";
import { useTheme } from "@/hooks/use-theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { isConfigured, requestPasswordRecovery } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  async function submit() {
    if (!isConfigured || isSubmitting) return;
    if (!isValidAuthEmail(email)) {
      setFeedback({ kind: "error", message: "Digite um endereço de e-mail válido." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await requestPasswordRecovery(email, getPasswordRecoveryRedirectUrl());
      setFeedback({
        kind: "success",
        message:
          "Se houver uma conta associada a este e-mail, enviaremos um link para redefinir a senha.",
      });
    } catch {
      setFeedback({
        kind: "error",
        message:
          "Não foi possível solicitar a recuperação agora. Verifique sua conexão e tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <RecoveryFrame
      eyebrow="RECUPERAÇÃO DE ACESSO"
      title="Redefina sua senha"
      description="Informe o e-mail da conta. Se existir um cadastro, enviaremos as instruções para continuar."
    >
      <View style={{ gap: 15 }}>
        <RecoveryField
          autoComplete="email"
          keyboardType="email-address"
          label="E-mail"
          onChangeText={(value) => {
            setEmail(value);
            setFeedback(null);
          }}
          placeholder="voce@exemplo.com"
          value={email}
        />
        {feedback ? (
          <RecoveryFeedback kind={feedback.kind}>
            {feedback.message}
          </RecoveryFeedback>
        ) : null}
        <RecoveryButton
          disabled={!isConfigured}
          label="Enviar link de recuperação"
          loading={isSubmitting}
          onPress={() => void submit()}
        />
        {!isConfigured ? (
          <Text style={{ color: colors.orange, fontSize: 11 }}>
            Configure as variáveis públicas do Supabase para recuperar a senha.
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="link"
          disabled={isSubmitting}
          onPress={() => router.replace("/auth")}
          style={{ alignSelf: "center", paddingVertical: 5 }}
        >
          <Text style={{ color: colors.blue, fontSize: 11 }}>
            Voltar para entrar
          </Text>
        </Pressable>
      </View>
    </RecoveryFrame>
  );
}
