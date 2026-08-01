import { describe, it, expect } from "vitest";
import { describeConfig } from "./config-status.js";
import { describeProvider } from "./agent/provider.js";

const SECRET = "sk-ant-SUPERSECRETVALUE-should-never-appear";

describe("describeConfig", () => {
  it("reports configured integrations without leaking any key value", () => {
    const cfg = describeConfig({
      ANTHROPIC_API_KEY: SECRET,
      ANTHROPIC_MODEL: "claude-sonnet-5",
      GITHUB_APP_ID: "123",
      GITHUB_APP_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----",
      GITHUB_ORG: "ops-digit-io",
    });

    // The whole serialised summary must not contain the secret or the raw PEM.
    const serialised = JSON.stringify(cfg);
    expect(serialised).not.toContain(SECRET);
    expect(serialised).not.toContain("BEGIN PRIVATE KEY");

    // But it correctly reflects what is configured.
    expect(cfg.model.provider).toBe("anthropic");
    expect(cfg.model.live).toBe(true);
    expect(cfg.gitLive).toBe(true);

    const anthropic = cfg.groups.flatMap((g) => g.items).find((i) => i.key === "anthropic");
    expect(anthropic?.configured).toBe(true);
    expect(anthropic?.detail).toBe("claude-sonnet-5"); // model name is non-secret
    // env var NAMES are shown, values never are.
    expect(anthropic?.envVars).toContain("ANTHROPIC_API_KEY");
  });

  it("reports the model the portal will actually call, not a second copy of the name", () => {
    // Settings once carried its own hardcoded default. When the provider's
    // default moved, Settings kept confidently naming the old model — the
    // failure a status page cannot afford. Both must come from one place.
    const cfg = describeConfig({ ANTHROPIC_API_KEY: "k" });
    const anthropic = cfg.groups.flatMap((g) => g.items).find((i) => i.key === "anthropic");
    expect(anthropic?.detail).toBe(describeProvider({ ANTHROPIC_API_KEY: "k" }).model);
    expect(anthropic?.detail).toBe(cfg.model.model);
  });

  it("names each provider's own model even when the other one is active", () => {
    // Both keys present → Anthropic wins, but the OpenAI row must still say
    // which model IT would use rather than borrowing the active one.
    const cfg = describeConfig({ ANTHROPIC_API_KEY: "k", OPENAI_API_KEY: "o", OPENAI_MODEL: "gpt-4o-mini" });
    const items = cfg.groups.flatMap((g) => g.items);
    expect(items.find((i) => i.key === "openai")?.detail).toBe("gpt-4o-mini");
    expect(items.find((i) => i.key === "anthropic")?.detail).toBe("claude-opus-5");
  });

  it("marks missing providers and falls back to offline", () => {
    const cfg = describeConfig({});
    expect(cfg.model.provider).toBe("offline");
    expect(cfg.model.live).toBe(false);
    expect(cfg.gitLive).toBe(false);
    const anthropic = cfg.groups.flatMap((g) => g.items).find((i) => i.key === "anthropic");
    expect(anthropic?.configured).toBe(false);
  });

  it("defaults repo names and reflects the AGENT_TOOLS kill switch", () => {
    const on = describeConfig({});
    const demands = on.groups.flatMap((g) => g.items).find((i) => i.key === "demands-repo");
    expect(demands?.detail).toBe("du-demands");
    const toolsOn = on.groups.flatMap((g) => g.items).find((i) => i.key === "agent-tools");
    expect(toolsOn?.configured).toBe(true);

    const off = describeConfig({ AGENT_TOOLS: "off" });
    const toolsOff = off.groups.flatMap((g) => g.items).find((i) => i.key === "agent-tools");
    expect(toolsOff?.configured).toBe(false);
    expect(toolsOff?.detail).toMatch(/kill switch/i);
  });
});
