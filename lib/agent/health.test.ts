import { describe, it, expect } from "vitest";
import { probeProvider } from "./health.js";
import type { ModelProvider, ModelResponse } from "./provider.js";

function provider(over: Partial<ModelProvider> & { fail?: string }): ModelProvider {
  return {
    name: over.name ?? "anthropic",
    live: over.live ?? true,
    async complete(): Promise<ModelResponse> {
      if (over.fail) throw new Error(over.fail);
      return { text: "OK", toolCalls: [], content: [{ type: "text", text: "OK" }], stopReason: "end_turn", truncated: false, usage: { input: 1, output: 1 } };
    },
  };
}

describe("probeProvider", () => {
  it("reports offline without calling the model", async () => {
    const res = await probeProvider(provider({ name: "offline", live: false }));
    expect(res.live).toBe(false);
    expect(res.ok).toBe(false);
  });

  it("reports ok when the live provider responds", async () => {
    const res = await probeProvider(provider({ name: "anthropic", live: true }));
    expect(res.live).toBe(true);
    expect(res.ok).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it("reports failure with a short, key-free error", async () => {
    const res = await probeProvider(provider({ live: true, fail: "Anthropic API 401: invalid x-api-key sk-ant-LEAKEDSECRET123" }));
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
    expect(res.error).not.toContain("sk-ant-LEAKEDSECRET123");
    expect(res.error).toContain("401");
  });
});
