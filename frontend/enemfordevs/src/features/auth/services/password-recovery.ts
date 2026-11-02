import * as Linking from "expo-linking";
import { Platform } from "react-native";

export { isValidAuthEmail } from "@/features/auth/services/auth-flow-policy";

export function getPasswordRecoveryRedirectUrl(): string {
  if (Platform.OS === "web") {
    return new URL("/reset-password", window.location.origin).toString();
  }
  return Linking.createURL("reset-password");
}

export function getRecoveryErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (/network|fetch|connection/u.test(message)) {
    return "Não foi possível conectar. Verifique sua internet e tente novamente.";
  }
  if (/expired|invalid|code|token/u.test(message)) {
    return "Este link é inválido ou expirou. Solicite uma nova recuperação de senha.";
  }
  if (/rate limit|too many requests/u.test(message)) {
    return "Muitas tentativas em pouco tempo. Aguarde um momento e tente novamente.";
  }
  return "Não foi possível concluir. Tente novamente.";
}
