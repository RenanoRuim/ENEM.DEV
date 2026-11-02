import type { SupabaseClient } from "@supabase/supabase-js";

import type { AccountStorageScope } from "@/services/account-storage";
import type { Database, Json } from "@/types/database";
import type { AccountData } from "@/types/account-data";

export type AccountDataStoreErrorCode =
  | "unauthenticated"
  | "session_changed"
  | "permission"
  | "unavailable"
  | "conflict"
  | "remote";

export class AccountDataStoreError extends Error {
  constructor(
    message: string,
    public readonly code: AccountDataStoreErrorCode,
  ) {
    super(message);
    this.name = "AccountDataStoreError";
  }
}

export class AccountDataConflictError extends AccountDataStoreError {
  constructor() {
    super(
      "Os dados da conta foram alterados em outro dispositivo.",
      "conflict",
    );
    this.name = "AccountDataConflictError";
  }
}

export interface RemoteAccountData {
  data: Json | null;
  revision: number;
}

function getErrorDetails(error: unknown): {
  code?: string;
  status?: number;
  message: string;
} {
  if (error && typeof error === "object") {
    const details = error as {
      code?: unknown;
      status?: unknown;
      message?: unknown;
    };
    return {
      ...(typeof details.code === "string" ? { code: details.code } : {}),
      ...(typeof details.status === "number" ? { status: details.status } : {}),
      message:
        typeof details.message === "string"
          ? details.message
          : error instanceof Error
            ? error.message
            : "Erro desconhecido ao acessar o Supabase.",
    };
  }
  if (typeof error === "string") return { message: error };
  return { message: "Erro desconhecido ao acessar o Supabase." };
}

function toStoreError(error: unknown): AccountDataStoreError {
  if (error instanceof AccountDataStoreError) return error;
  const details = getErrorDetails(error);
  if (
    details.code === "42501" ||
    details.code === "PGRST301" ||
    details.status === 401 ||
    details.status === 403
  ) {
    return new AccountDataStoreError(
      "O Supabase negou o acesso aos dados desta conta. Verifique a sessão e as políticas RLS.",
      "permission",
    );
  }
  if (
    error instanceof TypeError ||
    details.code?.startsWith("08") ||
    /network|fetch|connection/i.test(details.message)
  ) {
    return new AccountDataStoreError(
      "Não foi possível conectar ao Supabase. Verifique sua conexão e tente novamente.",
      "unavailable",
    );
  }
  return new AccountDataStoreError(
    `Falha ao acessar os dados da conta no Supabase: ${details.message}`,
    "remote",
  );
}

async function getAuthenticatedUserId(
  client: SupabaseClient<Database>,
  scope: AccountStorageScope,
): Promise<string> {
  let sessionResult: Awaited<ReturnType<typeof client.auth.getSession>>;
  try {
    sessionResult = await client.auth.getSession();
  } catch (error) {
    throw toStoreError(error);
  }
  if (sessionResult.error) throw toStoreError(sessionResult.error);

  const userId = sessionResult.data.session?.user.id;
  if (!userId) {
    throw new AccountDataStoreError(
      "Entre na conta antes de sincronizar os dados.",
      "unauthenticated",
    );
  }
  if (!scope.userId || scope.userId !== userId) {
    throw new AccountDataStoreError(
      "A sessão mudou; tente sincronizar novamente.",
      "session_changed",
    );
  }
  return userId;
}

function assertRevision(revision: number): void {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new AccountDataStoreError(
      "A revisão recebida é inválida ou excede o limite seguro do JavaScript.",
      "remote",
    );
  }
}

function toJson(data: AccountData): Json {
  return JSON.parse(JSON.stringify(data)) as Json;
}

export function createAccountDataRepository(
  client: SupabaseClient<Database>,
) {
  return {
    async fetch(scope: AccountStorageScope): Promise<RemoteAccountData> {
      const userId = await getAuthenticatedUserId(client, scope);
      try {
        const { data, error } = await client
          .from("user_app_data")
          .select("data, revision")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;

        const revision = data?.revision ?? 0;
        assertRevision(revision);
        return { data: data?.data ?? null, revision };
      } catch (error) {
        throw toStoreError(error);
      }
    },

    async save(
      data: AccountData,
      expectedRevision: number,
      scope: AccountStorageScope,
    ): Promise<{ revision: number }> {
      assertRevision(expectedRevision);
      assertRevision(expectedRevision + 1);
      const userId = await getAuthenticatedUserId(client, scope);
      const jsonData = toJson(data);

      try {
        if (expectedRevision === 0) {
          const { data: inserted, error } = await client
            .from("user_app_data")
            .insert({
              user_id: userId,
              data: jsonData,
              revision: 1,
              updated_at: new Date().toISOString(),
            })
            .select("revision")
            .maybeSingle();

          if (error?.code === "23505") throw new AccountDataConflictError();
          if (error) throw error;
          if (!inserted) {
            throw new AccountDataStoreError(
              "O Supabase não confirmou a criação dos dados da conta.",
              "remote",
            );
          }
          return { revision: inserted.revision };
        }

        const { data: updated, error } = await client
          .from("user_app_data")
          .update({
            data: jsonData,
            revision: expectedRevision + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("revision", expectedRevision)
          .select("revision")
          .maybeSingle();

        if (error) throw error;
        if (!updated) throw new AccountDataConflictError();
        return { revision: updated.revision };
      } catch (error) {
        throw toStoreError(error);
      }
    },
  };
}

export async function fetchRemoteAccountData(
  scope: AccountStorageScope,
): Promise<RemoteAccountData> {
  const { getSupabaseClient } = await import("@/services/supabase");
  return createAccountDataRepository(getSupabaseClient()).fetch(scope);
}

export async function saveRemoteAccountData(
  data: AccountData,
  expectedRevision: number,
  scope: AccountStorageScope,
): Promise<{ revision: number }> {
  const { getSupabaseClient } = await import("@/services/supabase");
  return createAccountDataRepository(getSupabaseClient()).save(
    data,
    expectedRevision,
    scope,
  );
}
