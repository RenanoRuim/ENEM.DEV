import {
  getAccountStorageScope,
  type AccountStorageScope,
} from "@/services/account-storage";

type DeletedRecordKind = keyof AccountDataDeletedRecords;
export interface AccountDataDeletedRecords {
  essays: Record<string, string>;
  topics: Record<string, string>;
  questionRecords: Record<string, string>;
}

const DELETED_RECORDS_KEY = "enemfordevs:deleted-account-records:v1";
const PENDING_SYNC_KEY = "enemfordevs:pending-account-sync:v1";
let syncListener:
  | ((scope: AccountStorageScope) => Promise<void>)
  | null = null;
let mutationQueue: Promise<void> = Promise.resolve();
const pendingSyncVersions = new Map<string, number>();
const pendingSyncQueues = new Map<string, Promise<void>>();

function queueMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(operation);
  mutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function isDeletedRecords(value: unknown): value is AccountDataDeletedRecords {
  if (!value || typeof value !== "object") return false;
  const records = value as Record<string, unknown>;
  return (["essays", "topics", "questionRecords"] as const).every(
    (key) => {
      const entries = records[key];
      return (
        entries !== null &&
        typeof entries === "object" &&
        !Array.isArray(entries) &&
        Object.values(entries).every((deletedAt) => typeof deletedAt === "string")
      );
    },
  );
}

export async function getDeletedAccountRecords(
  scope: AccountStorageScope = getAccountStorageScope(),
): Promise<AccountDataDeletedRecords> {
  const stored = await scope.getItem(DELETED_RECORDS_KEY);
  if (stored === null) {
    return { essays: {}, topics: {}, questionRecords: {} };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error("Os marcadores de sincronização salvos contêm JSON inválido.");
  }
  if (!isDeletedRecords(parsed)) {
    throw new Error("Os marcadores de sincronização salvos têm formato inválido.");
  }
  return parsed;
}

export async function replaceDeletedAccountRecords(
  records: AccountDataDeletedRecords,
  scope: AccountStorageScope = getAccountStorageScope(),
): Promise<void> {
  if (!isDeletedRecords(records)) {
    throw new Error("Os marcadores remotos de exclusão têm formato inválido.");
  }
  await queueMutation(async () => {
    const current = await getDeletedAccountRecords(scope);
    const merged = {
      essays: { ...current.essays, ...records.essays },
      topics: { ...current.topics, ...records.topics },
      questionRecords: {
        ...current.questionRecords,
        ...records.questionRecords,
      },
    };
    for (const kind of ["essays", "topics", "questionRecords"] as const) {
      for (const [id, deletedAt] of Object.entries(records[kind])) {
        const currentDeletedAt = current[kind][id];
        if (currentDeletedAt && currentDeletedAt.localeCompare(deletedAt) > 0) {
          merged[kind][id] = currentDeletedAt;
        }
      }
    }
    await scope.setItem(DELETED_RECORDS_KEY, JSON.stringify(merged));
  });
}

async function updateDeletedRecords(
  kind: DeletedRecordKind,
  id: string,
  deleted: boolean,
  scope: AccountStorageScope,
): Promise<void> {
  await queueMutation(async () => {
    const records = await getDeletedAccountRecords(scope);
    const values = { ...records[kind] };
    if (deleted) values[id] = new Date().toISOString();
    else delete values[id];
    await scope.setItem(
      DELETED_RECORDS_KEY,
      JSON.stringify({ ...records, [kind]: values }),
    );
  });
}

export function markAccountRecordDeleted(
  kind: DeletedRecordKind,
  id: string,
  scope: AccountStorageScope = getAccountStorageScope(),
): Promise<void> {
  return updateDeletedRecords(kind, id, true, scope);
}

export function markAccountRecordRestored(
  kind: DeletedRecordKind,
  id: string,
  scope: AccountStorageScope = getAccountStorageScope(),
): Promise<void> {
  return updateDeletedRecords(kind, id, false, scope);
}

export function registerAccountDataSyncListener(
  listener: (scope: AccountStorageScope) => Promise<void>,
): () => void {
  syncListener = listener;
  return () => {
    if (syncListener === listener) syncListener = null;
  };
}

export function notifyAccountDataChanged(
  scope: AccountStorageScope = getAccountStorageScope(),
): void {
  if (!scope.userId) return;

  const userId = scope.userId;
  const version = (pendingSyncVersions.get(userId) ?? 0) + 1;
  pendingSyncVersions.set(userId, version);

  const markerWrite = enqueuePendingSyncOperation(scope, async () => {
    await scope.setItem(PENDING_SYNC_KEY, String(version));
  });
  const sync = syncListener?.(scope) ?? Promise.resolve();
  void Promise.all([markerWrite, sync]).catch((error: unknown) => {
      console.error("Account data sync failed:", error);
  });
}

function enqueuePendingSyncOperation(
  scope: AccountStorageScope,
  operation: () => Promise<void>,
): Promise<void> {
  const userId = scope.userId;
  if (!userId) return Promise.resolve();
  const previous = pendingSyncQueues.get(userId) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(operation);
  const settled = result.then(
    () => undefined,
    () => undefined,
  );
  pendingSyncQueues.set(userId, settled);
  return result;
}

export async function getPendingAccountDataSyncVersion(
  scope: AccountStorageScope,
): Promise<number> {
  if (!scope.userId) return 0;
  const inMemoryVersion = pendingSyncVersions.get(scope.userId);
  if (inMemoryVersion !== undefined) return inMemoryVersion;

  const storedVersion = Number(await scope.getItem(PENDING_SYNC_KEY));
  const version =
    Number.isSafeInteger(storedVersion) && storedVersion > 0 ? storedVersion : 0;
  if (version > 0) pendingSyncVersions.set(scope.userId, version);
  return version;
}

export async function hasPendingAccountDataSync(
  scope: AccountStorageScope,
): Promise<boolean> {
  return (await getPendingAccountDataSyncVersion(scope)) > 0;
}

export async function markAccountDataSyncCompleted(
  scope: AccountStorageScope,
  completedVersion: number,
): Promise<void> {
  if (!scope.userId) return;
  const userId = scope.userId;
  await enqueuePendingSyncOperation(scope, async () => {
    const currentVersion = pendingSyncVersions.get(userId) ?? completedVersion;
    if (currentVersion === completedVersion) {
      await scope.removeItem(PENDING_SYNC_KEY);
      if (pendingSyncVersions.get(userId) === completedVersion) {
        pendingSyncVersions.delete(userId);
      }
      return;
    }
    await scope.setItem(PENDING_SYNC_KEY, String(currentVersion));
  });
}

export async function clearPendingAccountDataSync(
  scope: AccountStorageScope,
): Promise<void> {
  if (!scope.userId) return;
  const userId = scope.userId;
  await enqueuePendingSyncOperation(scope, async () => {
    await scope.removeItem(PENDING_SYNC_KEY);
    pendingSyncVersions.delete(userId);
  });
}
