import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import {
  clearPendingAccountDataSync,
  hasPendingAccountDataSync,
  registerAccountDataSyncListener,
} from "@/services/account-data-events";
import {
  clearSynchronizedImageCache,
  synchronizeAccountData,
  waitForAccountDataSync,
} from "@/services/account-data-sync";
import {
  clearAccountStorage,
  getAccountStorageScope,
  isActiveAccountStorageScope,
  moveLegacyVisitorStorageToMemory,
  setActiveAccountStorageUser,
  type AccountStorageScope,
} from "@/services/account-storage";
import {
  clearLegacyVisitorWritingPromptImages,
  clearVisitorWritingPromptImages,
  clearWritingPromptImages,
} from "@/features/essays/services/writing-prompt-images";
import { clearTemporaryWritingExports } from "@/features/essays/services/export-writing";
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from "@/services/supabase";

type SyncStatus = "idle" | "syncing" | "synced" | "error";
export type SignOutDisposition = "sync" | "discard";
type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  hasPendingSync: boolean;
  isPasswordRecovery: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: (disposition: SignOutDisposition) => Promise<void>;
  retrySync: () => Promise<void>;
  requestPasswordRecovery: (email: string, redirectTo: string) => Promise<void>;
  exchangeRecoveryCode: (code: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

const accountCleanupPromises = new Map<string, Promise<void>>();

function clearLocalAccountData(userId: string): Promise<void> {
  const existing = accountCleanupPromises.get(userId);
  if (existing) return existing;

  const scope = getAccountStorageScope(userId);
  const cleanup = waitForAccountDataSync()
    .then(async () => {
      const results = await Promise.allSettled([
        clearAccountStorage(userId),
        clearPendingAccountDataSync(scope),
        clearWritingPromptImages(scope),
        clearTemporaryWritingExports(),
      ]);
      clearSynchronizedImageCache(userId);
      const failure = results.find(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );
      if (failure) {
        throw new Error(
          "A sessão foi encerrada, mas alguns dados locais não puderam ser removidos. Reinicie o app e tente novamente.",
          { cause: failure.reason },
        );
      }
    })
    .finally(() => {
      accountCleanupPromises.delete(userId);
    });
  accountCleanupPromises.set(userId, cleanup);
  return cleanup;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [pendingSyncUserId, setPendingSyncUserId] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const isConfigured = isSupabaseConfigured;

  useEffect(() => {
    let active = true;
    void Promise.all([
      moveLegacyVisitorStorageToMemory(),
      clearLegacyVisitorWritingPromptImages(),
    ])
      .catch((error: unknown) => {
        console.error("Could not move legacy visitor study data to memory:", error);
        if (active) {
          setSyncError(
            "Não foi possível preparar o armazenamento local. Verifique o espaço disponível e reinicie o app.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsStorageReady(true);
          if (!isSupabaseConfigured) setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isStorageReady || !isSupabaseConfigured) return;

    const client = getSupabaseClient();
    let active = true;
    let receivedAuthEvent = false;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      receivedAuthEvent = true;
      if (!active) return;

      const previousUserId = activeUserIdRef.current;
      const nextUserId = nextSession?.user.id ?? null;
      activeUserIdRef.current = nextUserId;
      setActiveAccountStorageUser(nextSession?.user.id ?? null);
      clearVisitorWritingPromptImages();
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      } else if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        setIsPasswordRecovery(false);
      }
      if (!nextSession) {
        setHasPendingSync(false);
        setPendingSyncUserId(null);
      }
      setSyncStatus("idle");
      setSyncError(null);
      setSession(nextSession);
      setIsLoading(false);
      if (event === "SIGNED_OUT" && previousUserId) {
        void clearLocalAccountData(previousUserId).catch((error: unknown) => {
          console.error("Could not clear local data after sign out:", error);
          if (active) setSyncError(getErrorMessage(error));
        });
      }
    });

    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (active && !receivedAuthEvent) {
          activeUserIdRef.current = data.session?.user.id ?? null;
          setActiveAccountStorageUser(data.session?.user.id ?? null);
          clearVisitorWritingPromptImages();
          setSession(data.session);
        }
      })
      .catch((error: unknown) => {
        if (active && !receivedAuthEvent) setSyncError(getErrorMessage(error));
      })
      .finally(() => {
        if (active && !receivedAuthEvent) setIsLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isStorageReady]);

  useEffect(() => {
    if (!session?.user.id || !isConfigured) return;

    let active = true;
    const scope = getAccountStorageScope(session.user.id);
    void hasPendingAccountDataSync(scope)
      .then((pending) => {
        if (active) {
          setPendingSyncUserId(scope.userId);
          setHasPendingSync(pending);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setPendingSyncUserId(scope.userId);
          setHasPendingSync(true);
          setSyncError(getErrorMessage(error));
        }
      });
    return () => {
      active = false;
    };
  }, [isConfigured, session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !isConfigured) return;

    return registerAccountDataSyncListener(async (scope: AccountStorageScope) => {
      if (
        scope.userId !== session.user.id ||
        !isActiveAccountStorageScope(scope)
      ) {
        return;
      }
      setPendingSyncUserId(scope.userId);
      setHasPendingSync(true);
      setSyncStatus("syncing");
      setSyncError(null);
      try {
        await synchronizeAccountData(false, scope);
        if (isActiveAccountStorageScope(scope)) {
          setPendingSyncUserId(scope.userId);
          setHasPendingSync(await hasPendingAccountDataSync(scope));
          setSyncStatus("synced");
        }
      } catch (error) {
        if (isActiveAccountStorageScope(scope)) {
          setPendingSyncUserId(scope.userId);
          setHasPendingSync(true);
          setSyncStatus("error");
          setSyncError(getErrorMessage(error));
        }
        throw error;
      }
    });
  }, [isConfigured, session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !isConfigured) return;

    let active = true;
    const scope = getAccountStorageScope(session.user.id);
    void Promise.resolve()
      .then(() => {
        if (active && isActiveAccountStorageScope(scope)) {
          setSyncStatus("syncing");
          setSyncError(null);
        }
        return synchronizeAccountData(true, scope);
      })
      .then(async () => {
        if (active && isActiveAccountStorageScope(scope)) {
          setPendingSyncUserId(scope.userId);
          setHasPendingSync(await hasPendingAccountDataSync(scope));
          setSyncStatus("synced");
        }
      })
      .catch((error: unknown) => {
        if (active && isActiveAccountStorageScope(scope)) {
          setSyncStatus("error");
          setSyncError(getErrorMessage(error));
        }
      });
    return () => {
      active = false;
    };
  }, [isConfigured, session?.user.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isConfigured,
      hasPendingSync:
        Boolean(session?.user.id) &&
        pendingSyncUserId === session?.user.id &&
        hasPendingSync,
      isPasswordRecovery,
      syncStatus: session && isConfigured ? syncStatus : "idle",
      syncError,
      signIn: async (email, password) => {
        const { data, error } = await getSupabaseClient().auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        activeUserIdRef.current = data.session?.user.id ?? null;
        setActiveAccountStorageUser(data.session?.user.id ?? null);
        clearVisitorWritingPromptImages();
        setPendingSyncUserId(null);
        setHasPendingSync(false);
        setSession(data.session);
      },
      signUp: async (email, password) => {
        const { data, error } = await getSupabaseClient().auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        activeUserIdRef.current = data.session?.user.id ?? null;
        setActiveAccountStorageUser(data.session?.user.id ?? null);
        clearVisitorWritingPromptImages();
        setPendingSyncUserId(null);
        setHasPendingSync(false);
        setSession(data.session);
        return Boolean(data.session);
      },
      signOut: async (disposition) => {
        const userId = session?.user.id;
        const scope = userId ? getAccountStorageScope(userId) : null;
        if (disposition === "sync" && scope) {
          await synchronizeAccountData(true, scope);
          if (await hasPendingAccountDataSync(scope)) {
            throw new Error(
              "Há alterações que ainda não foram sincronizadas. Tente novamente ou descarte as alterações.",
            );
          }
        }

        const client = getSupabaseClient();
        const { data: currentAuth, error: sessionError } =
          await client.auth.getSession();
        if (sessionError) throw sessionError;
        if (userId && currentAuth.session?.user.id !== userId) {
          throw new Error("A conta mudou. Atualize a tela antes de sair.");
        }

        const { error } = await client.auth.signOut({ scope: "local" });
        if (error) throw error;
        activeUserIdRef.current = null;
        setActiveAccountStorageUser(null);
        clearVisitorWritingPromptImages();
        setSession(null);
        setHasPendingSync(false);
        setPendingSyncUserId(null);
        setIsPasswordRecovery(false);

        if (userId && scope) {
          await clearLocalAccountData(userId);
        }
      },
      retrySync: async () => {
        setSyncStatus("syncing");
        setSyncError(null);
        try {
          if (!session?.user.id) {
            throw new Error("Entre na conta antes de sincronizar os dados.");
          }
          const scope = getAccountStorageScope(session.user.id);
          await synchronizeAccountData(true, scope);
          if (isActiveAccountStorageScope(scope)) {
            setPendingSyncUserId(scope.userId);
            setHasPendingSync(await hasPendingAccountDataSync(scope));
            setSyncStatus("synced");
          }
        } catch (error) {
          if (
            session?.user.id &&
            isActiveAccountStorageScope(getAccountStorageScope(session.user.id))
          ) {
            setSyncStatus("error");
            setSyncError(getErrorMessage(error));
          }
          throw error;
        }
      },
      requestPasswordRecovery: async (email, redirectTo) => {
        const { error } = await getSupabaseClient().auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo },
        );
        if (error) throw error;
      },
      exchangeRecoveryCode: async (code) => {
        const { error } =
          await getSupabaseClient().auth.exchangeCodeForSession(code);
        if (error) throw error;
        setIsPasswordRecovery(true);
      },
      updatePassword: async (password) => {
        if (!isPasswordRecovery) {
          throw new Error("Abra o link de recuperação enviado por e-mail.");
        }
        const { error } = await getSupabaseClient().auth.updateUser({
          password,
        });
        if (error) throw error;
        setIsPasswordRecovery(false);
      },
    }),
    [
      hasPendingSync,
      isConfigured,
      isLoading,
      isPasswordRecovery,
      pendingSyncUserId,
      session,
      syncError,
      syncStatus,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de AuthProvider.");
  }
  return context;
}
