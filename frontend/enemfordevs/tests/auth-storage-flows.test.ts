import assert from "node:assert/strict";
import test from "node:test";

import { getAccountStorageKey } from "../src/services/account-storage-key.ts";
import {
  isActivePrivateAccountScope,
  isPersistentAccountScope,
} from "../src/services/account-storage-policy.ts";
import { getSecureStoreChunkKey } from "../src/services/secure-store-key.ts";
import {
  getNewPasswordValidationError,
  isValidAuthEmail,
  shouldConfirmLogout,
} from "../src/features/auth/services/auth-flow-policy.ts";
import {
  DEFAULT_VISUAL_PREFERENCES,
  isVisualPreferences,
} from "../src/types/visual-preferences.ts";

test("visitor storage is memory-only, not an account persistence scope", () => {
  assert.equal(isPersistentAccountScope(null), false);
});

test("private storage is accessible only to its matching active account", () => {
  assert.equal(isActivePrivateAccountScope("account-a", "account-a"), true);
  assert.equal(isActivePrivateAccountScope("account-a", "account-b"), false);
  assert.equal(isActivePrivateAccountScope("account-a", null), false);
  assert.equal(isActivePrivateAccountScope(null, "account-b"), false);
});

test("account storage keys are isolated by user ID", () => {
  const key = "enemfordevs:student-state:v1";
  assert.notEqual(
    getAccountStorageKey(key, "account-a"),
    getAccountStorageKey(key, "account-b"),
  );
  assert.equal(getAccountStorageKey(key, null), key);
});

test("SecureStore chunk keys use only supported characters", () => {
  assert.equal(
    getSecureStoreChunkKey("sb-project-auth-token", "chunk-count"),
    "sb-project-auth-token.chunk-count",
  );
  assert.equal(
    getSecureStoreChunkKey("sb-project-auth-token", "chunk-0"),
    "sb-project-auth-token.chunk-0",
  );
  assert.throws(
    () => getSecureStoreChunkKey("", "chunk-count"),
    /não é válida/u,
  );
  assert.throws(
    () => getSecureStoreChunkKey("sb-project:auth-token", "chunk-count"),
    /não é válida/u,
  );
});

test("logout asks what to do when sync is pending, active or failed", () => {
  assert.equal(shouldConfirmLogout(true, "synced"), true);
  assert.equal(shouldConfirmLogout(false, "syncing"), true);
  assert.equal(shouldConfirmLogout(false, "error"), true);
  assert.equal(shouldConfirmLogout(false, "synced"), false);
  assert.equal(shouldConfirmLogout(false, "idle"), false);
});

test("recovery validates email and matching minimum-length passwords", () => {
  assert.equal(isValidAuthEmail("student@example.com"), true);
  assert.equal(isValidAuthEmail("not-an-email"), false);
  assert.equal(getNewPasswordValidationError("12345", "12345") !== null, true);
  assert.equal(getNewPasswordValidationError("123456", "654321") !== null, true);
  assert.equal(getNewPasswordValidationError("123456", "123456"), null);
});

test("visual preferences default to the current dark classic experience", () => {
  assert.deepEqual(
    {
      appearance: DEFAULT_VISUAL_PREFERENCES.appearance,
      style: DEFAULT_VISUAL_PREFERENCES.style,
      reduceAnimations: DEFAULT_VISUAL_PREFERENCES.reduceAnimations,
    },
    { appearance: "dark", style: "classic", reduceAnimations: false },
  );
});

test("visual preference validation accepts supported options only", () => {
  assert.equal(
    isVisualPreferences({
      appearance: "system",
      style: "dynamic",
      reduceAnimations: true,
      updatedAt: "2026-11-01T12:00:00.000Z",
    }),
    true,
  );
  assert.equal(
    isVisualPreferences({
      appearance: "sepia",
      style: "dynamic",
      reduceAnimations: false,
      updatedAt: "2026-11-01T12:00:00.000Z",
    }),
    false,
  );
});
