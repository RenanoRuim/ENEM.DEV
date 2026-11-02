import type { WritingPromptImage } from "@/features/essays/types/writing";
import { getSupabaseClient } from "@/services/supabase";
import type { AccountStorageScope } from "@/services/account-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/u, "");

export class AccountDataApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AccountDataApiError";
  }
}

export interface AccountSession {
  userId: string;
  accessToken: string;
}

async function request<T>(
  path: string,
  session: AccountSession,
  init?: RequestInit,
): Promise<T> {
  if (!API_URL) {
    throw new Error("Configure EXPO_PUBLIC_API_URL para conectar ao backend Node.");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `A API respondeu com HTTP ${response.status}.`;
    try {
      const body: unknown = await response.json();
      if (
        body &&
        typeof body === "object" &&
        "error" in body &&
        typeof body.error === "string"
      ) {
        message = body.error;
      }
    } catch {
      // The response body is optional; the HTTP status remains actionable.
    }
    throw new AccountDataApiError(message, response.status);
  }
  return (await response.json()) as T;
}

export async function getAccountSession(
  scope: AccountStorageScope,
): Promise<AccountSession> {
  if (!scope.userId) {
    throw new Error("É necessário entrar para sincronizar os dados.");
  }
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw error;
  const session = data.session;
  if (!session?.access_token || session.user.id !== scope.userId) {
    throw new Error("A sessão mudou; tente sincronizar novamente.");
  }
  return { userId: session.user.id, accessToken: session.access_token };
}

export async function uploadRemoteWritingImage(
  imageId: string,
  mimeType: WritingPromptImage["mimeType"],
  base64: string,
  session: AccountSession,
): Promise<void> {
  await request(`/api/me/writing-images/${encodeURIComponent(imageId)}`, session, {
    method: "PUT",
    body: JSON.stringify({ mimeType, base64 }),
  });
}

export async function downloadRemoteWritingImage(
  imageId: string,
  mimeType: WritingPromptImage["mimeType"],
  session: AccountSession,
): Promise<string> {
  const query = new URLSearchParams({ mimeType });
  const result = await request<{ mimeType: string; base64: string }>(
    `/api/me/writing-images/${encodeURIComponent(imageId)}?${query.toString()}`,
    session,
  );
  if (result.mimeType !== mimeType || typeof result.base64 !== "string") {
    throw new Error("A imagem remota tem formato inválido.");
  }
  return result.base64;
}
