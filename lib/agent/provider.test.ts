import { describe, expect, it } from "vitest";
import { describeProvider, getProvider, OpenAIProvider, AnthropicProvider, OfflineProvider } from "./provider.js";

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
