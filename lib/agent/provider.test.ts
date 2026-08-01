import { describe, expect, it } from "vitest";
import { describeProvider, getProvider, providerAvailable, providerById, PROVIDERS, OpenAIProvider, AnthropicProvider, OfflineProvider } from "./provider.js";

describe("describeProvider — selection", () => {
  it("is offline with no keys", () => {
    expect(describeProvider({})).toEqual({ provider: "offline", live: false });
  });

  it("prefers Anthropic when both keys are present", () => {
    const s = describeProvider({ ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o" });
    expect(s.provider).toBe("anthropic");
    expect(s.live).toBe(true);
    expect(s.model).toBeTruthy();
  });

  it("uses OpenAI when only its key is present", () => {
    const s = describeProvider({ OPENAI_API_KEY: "o", OPENAI_MODEL: "gpt-4o-mini" });
    expect(s.provider).toBe("openai");
    expect(s.model).toBe("gpt-4o-mini");
  });

  it("honours MODEL_PROVIDER override when the chosen key is present", () => {
    expect(describeProvider({ MODEL_PROVIDER: "openai", ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o" }).provider).toBe("openai");
    expect(describeProvider({ MODEL_PROVIDER: "offline", ANTHROPIC_API_KEY: "a" }).provider).toBe("offline");
  });

  it("falls back past an override whose key is missing", () => {
    // forced openai but no OpenAI key → falls through to Anthropic.
    expect(describeProvider({ MODEL_PROVIDER: "openai", ANTHROPIC_API_KEY: "a" }).provider).toBe("anthropic");
  });
});

describe("getProvider — construction", () => {
  it("constructs the matching provider", () => {
    expect(getProvider({}) instanceof OfflineProvider).toBe(true);
    expect(getProvider({ ANTHROPIC_API_KEY: "a" }) instanceof AnthropicProvider).toBe(true);
    expect(getProvider({ OPENAI_API_KEY: "o" }) instanceof OpenAIProvider).toBe(true);
  });
});

describe("the provider catalogue — genuine agnosticism", () => {
  it("always includes offline plus the built-ins and the generic gateway", () => {
    const ids = PROVIDERS.map((p) => p.id);
    expect(ids).toContain("anthropic");
    expect(ids).toContain("openai");
    expect(ids).toContain("openai-compatible");
    expect(ids).toContain("offline");
  });

  it("offline is always available; keyed providers need their key", () => {
    expect(providerAvailable(providerById("offline")!, {})).toBe(true);
    expect(providerAvailable(providerById("anthropic")!, {})).toBe(false);
    expect(providerAvailable(providerById("anthropic")!, { ANTHROPIC_API_KEY: "a" })).toBe(true);
  });

  it("the OpenAI-compatible gateway needs BOTH a key and a base URL — its identity is the URL", () => {
    const compat = providerById("openai-compatible")!;
    expect(providerAvailable(compat, { OPENAI_COMPAT_API_KEY: "k" })).toBe(false); // no base URL
    expect(providerAvailable(compat, { OPENAI_COMPAT_API_KEY: "k", OPENAI_COMPAT_BASE_URL: "https://openrouter.ai/api/v1" })).toBe(true);
  });

  it("auto-selects by priority: Anthropic before OpenAI before a gateway", () => {
    const env = {
      ANTHROPIC_API_KEY: "a",
      OPENAI_API_KEY: "o",
      OPENAI_COMPAT_API_KEY: "c",
      OPENAI_COMPAT_BASE_URL: "https://x/v1",
    };
    expect(describeProvider(env).provider).toBe("anthropic");
    delete (env as Record<string, unknown>).ANTHROPIC_API_KEY;
    expect(describeProvider(env).provider).toBe("openai");
    delete (env as Record<string, unknown>).OPENAI_API_KEY;
    expect(describeProvider(env).provider).toBe("openai-compatible");
  });

  it("selects and builds an OpenAI-compatible endpoint when forced", () => {
    const env = {
      MODEL_PROVIDER: "openai-compatible",
      OPENAI_COMPAT_API_KEY: "k",
      OPENAI_COMPAT_BASE_URL: "https://openrouter.ai/api/v1",
      OPENAI_COMPAT_MODEL: "meta-llama/llama-3.1-70b",
    };
    const status = describeProvider(env);
    expect(status).toEqual({ provider: "openai-compatible", live: true, model: "meta-llama/llama-3.1-70b" });
    expect(getProvider(env) instanceof OpenAIProvider).toBe(true);
  });

  it("a forced-but-unconfigured provider falls through instead of pretending it is live", () => {
    // Forcing the gateway with no base URL must not report it live.
    const env = { MODEL_PROVIDER: "openai-compatible", ANTHROPIC_API_KEY: "a" };
    expect(describeProvider(env).provider).toBe("anthropic");
  });

  it("uses the env model when set, the catalogue default otherwise", () => {
    expect(describeProvider({ ANTHROPIC_API_KEY: "a" }).model).toBe("claude-opus-5");
    expect(describeProvider({ ANTHROPIC_API_KEY: "a", ANTHROPIC_MODEL: "claude-sonnet-5" }).model).toBe("claude-sonnet-5");
  });
});
