import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, describe, it } from "node:test";

import type { AddressInfo } from "node:net";

import { createApp } from "../src/app.js";

const app = createApp({
  PORT: 0,
  CLIENT_ORIGIN: "http://localhost:8081",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
});
const server = app.listen(0);
let baseUrl: string;

before(async () => {
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server.close();
  await once(server, "close");
});

describe("API routes", () => {
  it("reports health without Supabase credentials", async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  });

  it("requires a bearer token before accessing account data", async () => {
    const response = await fetch(`${baseUrl}/api/me/data`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: "Authentication required.",
    });
  });

  it("requires a bearer token before accessing writing images", async () => {
    const response = await fetch(
      `${baseUrl}/api/me/writing-images/prompt-a-b?mimeType=image/png`,
    );
    assert.equal(response.status, 401);
  });

  it("rejects invalid question query parameters before proxying", async () => {
    const response = await fetch(
      `${baseUrl}/api/enem/exams/2024/questions?limit=999`,
    );
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "Invalid question query parameters.",
    });
  });
});
