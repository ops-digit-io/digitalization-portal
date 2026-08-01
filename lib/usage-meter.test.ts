/**
 * The usage meter — no-op without a store, and correct aggregation with one.
 * KV is exercised by stubbing `fetch` (the pipeline transport) and capturing the
 * commands / feeding back day hashes, so no real store is needed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { recordUsage, recordUiEvents, readUsage, usageMeterEnabled, FEATURES } from "./usage-meter.js";

const AT = new Date("2026-08-01T12:00:00.000Z");

describe("without a store", () => {
  const saved = { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
  beforeEach(() => { delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN; });
  afterEach(() => {
    if (saved.url !== undefined) process.env.KV_REST_API_URL = saved.url; else delete process.env.KV_REST_API_URL;
    if (saved.token !== undefined) process.env.KV_REST_API_TOKEN = saved.token; else delete process.env.KV_REST_API_TOKEN;
  });

  it("reports disabled and never throws when recording", async () => {
    expect(usageMeterEnabled()).toBe(false);
    await expect(recordUsage({ feature: FEATURES.champions, provider: "anthropic", model: "claude-opus-5", usage: { input: 10, output: 20 } }, AT)).resolves.toBeUndefined();
  });

  it("reads back an empty, disabled report with a null cost", async () => {
    const r = await readUsage(7, AT);
    expect(r.enabled).toBe(false);
    expect(r.totals.calls).toBe(0);
    expect(r.totals.cost).toBeNull();
    expect(r.daily).toHaveLength(7);
  });
});

describe("with a store", () => {
  const saved = { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
  beforeEach(() => {
    process.env.KV_REST_API_URL = "https://kv.example";
    process.env.KV_REST_API_TOKEN = "t";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (saved.url !== undefined) process.env.KV_REST_API_URL = saved.url; else delete process.env.KV_REST_API_URL;
    if (saved.token !== undefined) process.env.KV_REST_API_TOKEN = saved.token; else delete process.env.KV_REST_API_TOKEN;
  });

  it("records one call as pipelined HINCRBYs on the day bucket, by feature and by model", async () => {
    let sent: unknown[][] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body));
      return new Response(JSON.stringify(sent.map(() => ({ result: 1 }))), { status: 200 });
    });
    await recordUsage(
      { feature: "champions.analysis", provider: "anthropic", model: "claude-opus-5", usage: { input: 100, output: 50, cacheRead: 900, cacheWrite: 10 } },
      AT,
    );
    const flat = sent.map((c) => c.join(" "));
    expect(flat).toContain("HINCRBY usage:d:2026-08-01 f:champions.analysis:calls 1");
    expect(flat).toContain("HINCRBY usage:d:2026-08-01 f:champions.analysis:in 100");
    expect(flat).toContain("HINCRBY usage:d:2026-08-01 m:claude-opus-5:out 50");
    expect(flat).toContain("HINCRBY usage:d:2026-08-01 m:claude-opus-5:cr 900");
    expect(flat.some((c) => c.startsWith("SADD usage:days 2026-08-01"))).toBe(true);
    expect(flat.some((c) => c.startsWith("EXPIRE usage:d:2026-08-01"))).toBe(true);
  });

  it("aggregates a window: totals, per-feature volume, per-model cost", async () => {
    // One day carries two features on one model. HGETALL comes back as a flat array.
    const dayHash = [
      "f:champions.analysis:calls", "2", "f:champions.analysis:in", "1000000", "f:champions.analysis:out", "0",
      "f:process.section:calls", "3", "f:process.section:in", "0", "f:process.section:out", "1000000",
      "m:claude-opus-5:calls", "5", "m:claude-opus-5:in", "1000000", "m:claude-opus-5:out", "1000000",
    ];
    vi.stubGlobal("fetch", async (url: string) => {
      // readUsage pipelines HGETALL for each day; answer the last day with data, others empty.
      const body = [dayHash, ...Array(1).fill([])];
      void url;
      // The number of results must match the number of days requested; build below in the call.
      return new Response(JSON.stringify(RESULTS.map((r) => ({ result: r }))), { status: 200 });
    });
    // 2 days requested → most recent gets the hash, the older one empty.
    const RESULTS: unknown[] = [[], dayHash];
    const r = await readUsage(2, AT);

    expect(r.enabled).toBe(true);
    expect(r.totals.calls).toBe(5); // 2 + 3 feature calls
    expect(r.totals.input).toBe(1_000_000);
    expect(r.totals.output).toBe(1_000_000);
    // Cost is priced by MODEL: 1M in @ $5 + 1M out @ $25 = $30.
    expect(r.totals.cost).toBeCloseTo(30, 6);

    const champ = r.byFeature.find((f) => f.key === "champions.analysis");
    expect(champ?.calls).toBe(2);
    const section = r.byFeature.find((f) => f.key === "process.section");
    expect(section?.calls).toBe(3);
    expect(r.byModel[0]!.key).toBe("claude-opus-5");
    expect(r.byModel[0]!.cost).toBeCloseTo(30, 6);
    expect(r.hasUnpriced).toBe(false);
  });

  it("flags an unpriced model rather than dropping it from volume", async () => {
    const dayHash = ["m:local-llama:calls", "4", "m:local-llama:in", "1000000", "m:local-llama:out", "1000000"];
    const RESULTS: unknown[] = [dayHash];
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify(RESULTS.map((r) => ({ result: r }))), { status: 200 }));
    const r = await readUsage(1, AT);
    expect(r.hasUnpriced).toBe(true);
    expect(r.byModel[0]!.cost).toBeNull();
    expect(r.byModel[0]!.input).toBe(1_000_000); // still counted as volume
  });

  it("folds a batch of UI events into per-(tool,type) increments", async () => {
    let sent: unknown[][] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body));
      return new Response(JSON.stringify(sent.map(() => ({ result: 1 }))), { status: 200 });
    });
    await recordUiEvents(
      [
        { tool: "process", type: "view" },
        { tool: "process", type: "click" },
        { tool: "process", type: "click" },
        { tool: "champions", type: "view" },
      ],
      AT,
    );
    const flat = sent.map((c) => c.join(" "));
    // Three process events collapse to two HINCRBYs (view +1, click +2), not four.
    expect(flat).toContain("HINCRBY usage:d:2026-08-01 u:process:view 1");
    expect(flat).toContain("HINCRBY usage:d:2026-08-01 u:process:click 2");
    expect(flat).toContain("HINCRBY usage:d:2026-08-01 u:champions:view 1");
  });

  it("aggregates UI activity per tool alongside the AI rollups", async () => {
    const dayHash = [
      "u:process:view", "10", "u:process:click", "25",
      "u:champions:view", "4",
      "m:claude-opus-5:calls", "1", "m:claude-opus-5:in", "0", "m:claude-opus-5:out", "0",
    ];
    const RESULTS: unknown[] = [dayHash];
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify(RESULTS.map((r) => ({ result: r }))), { status: 200 }));
    const r = await readUsage(1, AT);
    expect(r.totals.views).toBe(14);
    expect(r.totals.clicks).toBe(25);
    // Sorted by total activity: process (35) before champions (4).
    expect(r.byTool.map((t) => t.key)).toEqual(["process", "champions"]);
    expect(r.byTool[0]).toMatchObject({ key: "process", views: 10, clicks: 25, total: 35 });
  });
});
