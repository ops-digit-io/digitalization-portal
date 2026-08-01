/**
 * The runtime default-model selection — validation, the env-merge that carries a
 * choice to the pure resolvers, and the KV gating that keeps it read-only without
 * a durable store.
 *
 * The pure parts (validateOverride, applyOverride) are tested directly; the KV
 * paths are exercised by stubbing `fetch` (which `kvCommand` uses) and setting
 * the KV env, mirroring the app's other over-the-wire tests.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  validateOverride,
  applyOverride,
  modelSettingsEditable,
  saveModelOverride,
  getModelOverride,
} from "./model-settings.js";
import { describeProvider } from "./agent/provider.js";

describe("validateOverride", () => {
  it("accepts a known provider and a model", () => {
    expect(validateOverride({ provider: "openai", model: "gpt-4o-mini" })).toEqual({
      ok: true,
      value: { provider: "openai", model: "gpt-4o-mini" },
    });
  });

  it("accepts an arbitrary model for a compatible gateway — no allow-list", () => {
    const r = validateOverride({ provider: "openai-compatible", model: "meta-llama/llama-3.1-70b" });
    expect(r.ok).toBe(true);
  });

  it("rejects an unknown provider", () => {
    const r = validateOverride({ provider: "definitely-not-a-provider" });
    expect(r.ok).toBe(false);
  });

  it("rejects a model name with newline/pipe characters", () => {
    expect(validateOverride({ provider: "openai", model: "a|b" }).ok).toBe(false);
    expect(validateOverride({ provider: "openai", model: "x\ny" }).ok).toBe(false);
  });

  it("treats empty strings as 'not set', not as errors", () => {
    expect(validateOverride({ provider: "", model: "" })).toEqual({ ok: true, value: {} });
  });
});

describe("applyOverride — the mechanism a choice reaches the resolver by", () => {
  it("is a no-op when nothing is overridden", () => {
    const base = { ANTHROPIC_API_KEY: "a" };
    expect(applyOverride(base, {})).toBe(base);
  });

  it("maps provider to MODEL_PROVIDER and model to that provider's own model var", () => {
    const env = applyOverride({ ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o" }, { provider: "openai", model: "gpt-4o-mini" });
    expect(env.MODEL_PROVIDER).toBe("openai");
    expect(env.OPENAI_MODEL).toBe("gpt-4o-mini");
    // …and the pure resolver then reports exactly that.
    expect(describeProvider(env)).toEqual({ provider: "openai", live: true, model: "gpt-4o-mini" });
  });

  it("routes the model to the gateway's var when the gateway is chosen", () => {
    const env = applyOverride(
      { OPENAI_COMPAT_API_KEY: "k", OPENAI_COMPAT_BASE_URL: "https://x/v1" },
      { provider: "openai-compatible", model: "mixtral" },
    );
    expect(env.OPENAI_COMPAT_MODEL).toBe("mixtral");
    expect(describeProvider(env).model).toBe("mixtral");
  });

  it("applies a lone model to whichever provider the base env would pick", () => {
    const env = applyOverride({ ANTHROPIC_API_KEY: "a" }, { model: "claude-sonnet-5" });
    expect(env.ANTHROPIC_MODEL).toBe("claude-sonnet-5");
    expect(env.MODEL_PROVIDER).toBeUndefined();
  });
});

describe("without a durable store", () => {
  const saved = { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
  beforeEach(() => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });
  afterEach(() => {
    if (saved.url !== undefined) process.env.KV_REST_API_URL = saved.url; else delete process.env.KV_REST_API_URL;
    if (saved.token !== undefined) process.env.KV_REST_API_TOKEN = saved.token; else delete process.env.KV_REST_API_TOKEN;
  });

  it("is not editable and serves an empty override", async () => {
    expect(modelSettingsEditable()).toBe(false);
    expect(await getModelOverride()).toEqual({});
  });

  it("refuses to save with a clear reason", async () => {
    const r = await saveModelOverride({ provider: "openai" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toMatch(/KV_REST_API/);
  });
});

describe("with a durable store", () => {
  const saved = {
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
    a: process.env.ANTHROPIC_API_KEY,
    o: process.env.OPENAI_API_KEY,
  };
  beforeEach(() => {
    process.env.KV_REST_API_URL = "https://kv.example";
    process.env.KV_REST_API_TOKEN = "t";
    delete process.env.OPENAI_API_KEY;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const [k, v] of Object.entries({ KV_REST_API_URL: saved.url, KV_REST_API_TOKEN: saved.token, ANTHROPIC_API_KEY: saved.a, OPENAI_API_KEY: saved.o })) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("refuses to select a provider whose credentials aren't in the environment", async () => {
    // KV is present, but OpenAI has no key — selecting it would silently fall to offline.
    const r = await saveModelOverride({ provider: "openai" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toMatch(/OPENAI_API_KEY/);
  });

  it("persists a valid, configured choice through KV", async () => {
    process.env.ANTHROPIC_API_KEY = "a";
    const calls: unknown[][] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      calls.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify({ result: "OK" }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const r = await saveModelOverride({ provider: "anthropic", model: "claude-sonnet-5" });
    expect(r.ok).toBe(true);
    // A SET landed on KV with the serialised choice.
    const set = calls.find((c) => c[0] === "SET");
    expect(set).toBeTruthy();
    expect(JSON.parse(String(set![2]))).toEqual({ provider: "anthropic", model: "claude-sonnet-5" });
  });
});
