import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { describe, it } from "node:test";

import { createClient } from "@supabase/supabase-js";

import {
  AccountDataConflictError,
  AccountDataStoreError,
  createAccountDataRepository,
} from "../../frontend/enemfordevs/src/services/account-data-repository.js";
import type { AccountData } from "../../frontend/enemfordevs/src/types/account-data.js";
import type { Database } from "../../frontend/enemfordevs/src/types/database.js";
import type { AccountStorageScope } from "../../frontend/enemfordevs/src/services/account-storage.js";

interface StoredAccountData {
  user_id: string;
  data: unknown;
  revision: number;
  updated_at: string;
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function decodeUserId(token: string | null): string | null {
  if (!token) return null;
  const payload = token.split(".")[1];
  if (!payload) return null;
  const value: unknown = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (
    !value ||
    typeof value !== "object" ||
    !("sub" in value) ||
    typeof value.sub !== "string"
  ) {
    return null;
  }
  return value.sub;
}

function createRestMock() {
  const rows = new Map<string, StoredAccountData>();
  const fetcher: typeof fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    if (url.pathname !== "/rest/v1/user_app_data") {
      return jsonResponse({ message: "Unexpected test endpoint." }, 404);
    }

    const requestHeaders = request.headers;
    const authenticatedUserId = decodeUserId(
      requestHeaders.get("Authorization")?.replace(/^Bearer /u, "") ?? null,
    );
    if (!authenticatedUserId) {
      return jsonResponse({ code: "PGRST301", message: "Missing session." }, 401);
    }

    const bodyText = await request.clone().text();
    const body = bodyText
      ? (JSON.parse(bodyText) as Record<string, unknown>)
      : {};
    const requestedUserId =
      request.method === "POST"
        ? body.user_id
        : url.searchParams.get("user_id")?.replace(/^eq\./u, "");
    if (requestedUserId !== authenticatedUserId) {
      return jsonResponse({ code: "42501", message: "RLS denied access." }, 403);
    }

    if (request.method === "GET") {
      const row = rows.get(authenticatedUserId);
      return jsonResponse(row ? [row] : []);
    }

    if (request.method === "POST") {
      if (rows.has(authenticatedUserId)) {
        return jsonResponse(
          { code: "23505", message: "Duplicate user_app_data row." },
          409,
        );
      }
      const row: StoredAccountData = {
        user_id: authenticatedUserId,
        data: body.data,
        revision: Number(body.revision),
        updated_at: new Date().toISOString(),
      };
      rows.set(authenticatedUserId, row);
      return jsonResponse([row], 201);
    }

    if (request.method === "PATCH") {
      const row = rows.get(authenticatedUserId);
      const expectedRevision = Number(
        url.searchParams.get("revision")?.replace(/^eq\./u, ""),
      );
      if (!row || row.revision !== expectedRevision) return jsonResponse([]);
      const updated: StoredAccountData = {
        ...row,
        data: body.data,
        revision: Number(body.revision),
        updated_at: String(body.updated_at),
      };
      rows.set(authenticatedUserId, updated);
      return jsonResponse([updated]);
    }
    return jsonResponse({ message: "Unexpected test method." }, 405);
  };
  return { fetcher, rows };
}

function createSession(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url");
  const session = {
    access_token: `eyJhbGciOiJub25lIn0.${payload}.signature`,
    refresh_token: "test-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      email: `${userId}@example.test`,
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
  return {
    getItem: async () => JSON.stringify(session),
    setItem: async () => undefined,
    removeItem: async () => undefined,
  };
}

function createTestClient(
  userId: string | null,
  fetcher: typeof fetch,
) {
  return createClient<Database>("https://test.supabase.co", "public-test-key", {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
      storageKey: `test-session-${userId ?? "guest"}`,
      ...(userId ? { storage: createSession(userId) } : {}),
    },
    global: { fetch: fetcher },
  });
}

function createScope(userId: string): AccountStorageScope {
  return {
    userId,
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
  };
}

const sampleData: AccountData = {
  format: "enem.dev-account-data",
  version: 1,
  studentState: {
    attempts: [],
    progress: [],
    xpTotal: 0,
    rewardedFirstAttempts: [],
    rewardedFirstCorrect: [],
    rewardedDebugCorrect: [],
    unlockedAchievements: [],
    dailyGoal: 5,
    dailyDays: [],
  },
  writingEssays: [],
  personalWritingTopics: [],
  personalQuestionRecords: [],
  deleted: { essays: {}, topics: {}, questionRecords: {} },
};

describe("direct Supabase account data repository", () => {
  it("returns an empty revision for an authenticated account without a row", async () => {
    const { fetcher } = createRestMock();
    const repository = createAccountDataRepository(
      createTestClient("user-a", fetcher),
    );
    assert.deepEqual(await repository.fetch(createScope("user-a")), {
      data: null,
      revision: 0,
    });
  });

  it("creates, reads, and revision-updates the authenticated user's document", async () => {
    const { fetcher } = createRestMock();
    const repository = createAccountDataRepository(
      createTestClient("user-a", fetcher),
    );
    const scope = createScope("user-a");

    assert.deepEqual(await repository.save(sampleData, 0, scope), {
      revision: 1,
    });
    const saved = await repository.fetch(scope);
    assert.equal(saved.revision, 1);
    assert.deepEqual(saved.data, sampleData);

    assert.deepEqual(await repository.save(sampleData, 1, scope), {
      revision: 2,
    });
    assert.equal((await repository.fetch(scope)).revision, 2);
  });

  it("rejects access without an authenticated session", async () => {
    const { fetcher } = createRestMock();
    const repository = createAccountDataRepository(
      createTestClient(null, fetcher),
    );
    await assert.rejects(
      repository.fetch(createScope("user-a")),
      (error: unknown) =>
        error instanceof AccountDataStoreError &&
        error.code === "unauthenticated",
    );
  });

  it("keeps two authenticated accounts in separate rows", async () => {
    const { fetcher, rows } = createRestMock();
    const repositoryA = createAccountDataRepository(
      createTestClient("user-a", fetcher),
    );
    const repositoryB = createAccountDataRepository(
      createTestClient("user-b", fetcher),
    );
    const dataForB = {
      ...sampleData,
      studentState: { ...sampleData.studentState, xpTotal: 27 },
    };

    await repositoryA.save(sampleData, 0, createScope("user-a"));
    await repositoryB.save(dataForB, 0, createScope("user-b"));

    assert.equal(rows.size, 2);
    assert.deepEqual(
      (await repositoryA.fetch(createScope("user-a"))).data,
      sampleData,
    );
    assert.deepEqual(
      (await repositoryB.fetch(createScope("user-b"))).data,
      dataForB,
    );
  });

  it("rejects a stale revision without overwriting the row", async () => {
    const { fetcher, rows } = createRestMock();
    const repository = createAccountDataRepository(
      createTestClient("user-a", fetcher),
    );
    await repository.save(sampleData, 0, createScope("user-a"));
    const newerData = {
      ...sampleData,
      studentState: { ...sampleData.studentState, xpTotal: 12 },
    };
    await repository.save(newerData, 1, createScope("user-a"));

    await assert.rejects(
      repository.save(sampleData, 1, createScope("user-a")),
      AccountDataConflictError,
    );
    assert.equal(rows.get("user-a")?.revision, 2);
    assert.deepEqual(rows.get("user-a")?.data, newerData);
  });

  it("treats a concurrent first insert as a revision conflict", async () => {
    const { fetcher } = createRestMock();
    const repository = createAccountDataRepository(
      createTestClient("user-a", fetcher),
    );
    const scope = createScope("user-a");
    await repository.save(sampleData, 0, scope);

    await assert.rejects(
      repository.save(sampleData, 0, scope),
      AccountDataConflictError,
    );
  });

  it("reports Supabase permission errors without hiding them", async () => {
    const fetcher: typeof fetch = async () =>
      jsonResponse({ code: "42501", message: "RLS denied access." }, 403);
    const repository = createAccountDataRepository(
      createTestClient("user-a", fetcher),
    );

    await assert.rejects(
      repository.fetch(createScope("user-a")),
      (error: unknown) =>
        error instanceof AccountDataStoreError && error.code === "permission",
    );
  });

  it("reports an unavailable Supabase connection explicitly", async () => {
    const fetcher: typeof fetch = async () =>
      jsonResponse({ code: "08006", message: "Database connection failure." }, 503);
    const repository = createAccountDataRepository(
      createTestClient("user-a", fetcher),
    );

    await assert.rejects(
      repository.fetch(createScope("user-a")),
      (error: unknown) =>
        error instanceof AccountDataStoreError &&
        error.code === "unavailable",
    );
  });
});
