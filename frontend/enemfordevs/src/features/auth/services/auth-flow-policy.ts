export function isValidAuthEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim());
}

export function shouldConfirmLogout(
  hasPendingSync: boolean,
  syncStatus: "idle" | "syncing" | "synced" | "error",
): boolean {
  return hasPendingSync || syncStatus === "syncing" || syncStatus === "error";
}

export function getNewPasswordValidationError(
  password: string,
  confirmation: string,
): string | null {
  if (password.length < 6) {
    return "A nova senha precisa ter pelo menos 6 caracteres.";
  }
  if (password !== confirmation) {
    return "As senhas não coincidem. Confira e tente novamente.";
  }
  return null;
}
