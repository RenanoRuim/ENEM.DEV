import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getAccountStorageKey } from "../../frontend/enemfordevs/src/services/account-storage-key.js";

describe("account-scoped local storage keys", () => {
  it("keeps visitor keys unchanged for existing local data", () => {
    assert.equal(
      getAccountStorageKey("enemfordevs:student-state:v1", null),
      "enemfordevs:student-state:v1",
    );
  });

  it("separates the same data key by authenticated user ID", () => {
    const key = "enemfordevs:student-state:v1";
    const userA = getAccountStorageKey(key, "user-a");
    const userB = getAccountStorageKey(key, "user-b");

    assert.notEqual(userA, userB);
    assert.equal(userA, getAccountStorageKey(key, "user-a"));
  });
});
