/**
 * The Champions Analyst.
 *
 * The property that matters most is that it ALWAYS returns results: with no key,
 * with a model that errors, with a model that returns nothing usable, and with an
 * empty register — each of those degrades to fewer and duller actions, never to a
 * blank page. The second property is the contract holding: nothing it produces
 * ranks a person.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { analyseNetwork, buildFacts, deterministicActions, type AnalysisInput } from "./champions-analysis";
import { completeChampion, type Champion, type EngagementRef } from "./champions";

const NOW = "2026-08-01T00:00:00.000Z";
const ON = "2026-08-01";

const ch = (over: Partial<Champion> & { id: string }): Champion =>
  completeChampion({ name: `Person ${over.id}`, ...over }, over.id);

const input = (over: Partial<AnalysisInput> = {}): AnalysisInput => ({
  champions: [],
  plants: ["DE-ALD", "SK-PUC"],
  domains: ["quality", "maintenance"],
  engagements: [],
  demandRequesters: [],
  ...over,
});

const saved: Record<string, string | undefined> = {};
beforeEach(() => {
  for (const k of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "MODEL_PROVIDER"]) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  // No backoff in tests — the retry envelope has its own suite.
  saved.MODEL_RETRY_ATTEMPTS = process.env.MODEL_RETRY_ATTEMPTS;
  process.env.MODEL_RETRY_ATTEMPTS = "1";
});
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.unstubAllGlobals();
});

describe("the deterministic floor", () => {
  it("calls an empty register a finding about the REGISTER, not the organisation", () => {
    const a = deterministicActions(input(), ON);
    expect(a[0]!.kind).toBe("register-thin");
    expect(a[0]!.finding).toMatch(/describes the register, not the organisation/i);
  });

  it("proposes the people already doing the work when nobody is registered", () => {
    const a = deterministicActions(
      input({ engagements: [{ slug: "s", title: "T", owner: "Bea Fischer", champion: "" }] }),
      ON,
    );
    expect(a[0]!.approach).toContain("Bea Fischer");
  });

  it("names a wholly uncovered plant and says its silence is an artefact", () => {
    const a = deterministicActions(
      input({ champions: [ch({ id: "C-01", role: "spoke", plants: ["DE-ALD"] })] }),
      ON,
    );
    const uncovered = a.filter((x) => x.kind === "uncovered");
    expect(uncovered).toHaveLength(1);
    expect(uncovered[0]!.finding).toContain("SK-PUC");
    expect(uncovered[0]!.finding).toMatch(/artefact/i);
    expect(uncovered[0]!.blocked).toBe("Intake from this area.");
  });

  it("separates 'can carry but cannot decide' from 'nobody at all'", () => {
    const a = deterministicActions(
      input({ champions: [ch({ id: "C-01", role: "champion", plants: ["DE-ALD"] })] }),
      ON,
    );
    const nd = a.find((x) => x.kind === "no-decider");
    expect(nd?.finding).toContain("no spoke");
    expect(nd?.ask).toMatch(/record them as spoke/i);
  });

  it("flags a single point of failure without criticising the person", () => {
    const a = deterministicActions(
      input({ champions: [ch({ id: "C-01", name: "Ada", role: "spoke", plants: ["DE-ALD"] })] }),
      ON,
    );
    const sp = a.find((x) => x.kind === "single-point");
    expect(sp?.finding).toContain("go dark if they step back");
    expect(sp?.finding).not.toMatch(/overload|too much|failing|slow/i);
  });

  it("surfaces a capacity conflict as a commitment the hub has not honoured", () => {
    const a = deterministicActions(
      input({
        champions: [ch({ id: "C-01", name: "Ada", email: "ada@x.com", role: "spoke", plants: ["DE-ALD"], capacity: "half a day a week" })],
        engagements: [
          { slug: "a", title: "Order intake", owner: "ada@x.com", champion: "" },
          { slug: "b", title: "Spare parts", owner: "", champion: "Ada" },
        ],
      }),
      ON,
    );
    const cap = a.find((x) => x.kind === "capacity");
    expect(cap?.finding).toContain("half a day a week");
    expect(cap?.finding).toContain("2 engagement");
    expect(cap?.ask).toMatch(/hand over|waits/i);
  });

  it("calls out the hub doing local work", () => {
    const a = deterministicActions(
      input({
        champions: [ch({ id: "C-01", name: "Hub Person", email: "hub@x.com", role: "hub" })],
        engagements: [{ slug: "a", title: "Order intake", owner: "hub@x.com", champion: "" }],
      }),
      ON,
    );
    const hub = a.find((x) => x.kind === "hub-carrying");
    expect(hub?.finding).toMatch(/centre is doing what the network was meant to do/i);
  });

  it("every action names somebody and names its basis — an action with no target is an observation", () => {
    const a = deterministicActions(
      input({ champions: [ch({ id: "C-01", role: "champion", plants: ["DE-ALD"] })] }),
      ON,
    );
    expect(a.length).toBeGreaterThan(0);
    for (const x of a) {
      expect(x.approach.trim()).not.toBe("");
      expect(x.ask.trim()).not.toBe("");
      expect(x.basis.trim()).not.toBe("");
    }
  });
});

describe("the facts block", () => {
  it("hands over the register, the coverage, the engagements and the candidates", () => {
    const facts = buildFacts(
      input({
        champions: [ch({ id: "C-01", name: "Ada", role: "spoke", plants: ["DE-ALD"], domains: ["quality"] })],
        engagements: [{ slug: "s", title: "Order intake", owner: "Bea", champion: "" }],
      }),
      ON,
    );
    expect(facts).toContain("C-01 Ada · spoke");
    expect(facts).toContain("uncovered cells:");
    expect(facts).toContain('s "Order intake"');
    expect(facts).toContain("Bea — seen as process owner");
  });

  it("says plainly when there is nothing, rather than omitting the heading", () => {
    const facts = buildFacts(input(), ON);
    expect(facts).toContain("(nobody registered)");
    expect(facts).toContain("(none)");
  });
});


/**
 * The analysis call asks for enough tokens that it STREAMS, so a stub that
 * answers with a single JSON body is not answering the request that was made.
 * This re-encodes a Messages response as the SSE frames the provider reads.
 */
function sseFetch(msg: Record<string, any>) {
  const frames: unknown[] = [{ type: "message_start", message: { usage: msg.usage } }];
  (msg.content as Record<string, any>[]).forEach((block, index) => {
    frames.push({ type: "content_block_start", index, content_block: { ...block, input: {} } });
    frames.push({ type: "content_block_delta", index, delta: { type: "input_json_delta", partial_json: JSON.stringify(block.input) } });
    frames.push({ type: "content_block_stop", index });
  });
  frames.push({ type: "message_delta", delta: { stop_reason: msg.stop_reason }, usage: { output_tokens: 1 } });
  const body = frames.map((f) => `event: ${(f as any).type}\ndata: ${JSON.stringify(f)}\n\n`).join("");
  return () => Promise.resolve(new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } }));
}

describe("always returns results", () => {
  const withRegister = input({ champions: [ch({ id: "C-01", role: "champion", plants: ["DE-ALD"] })] });

  it("offline: returns the deterministic floor and says it was not live", async () => {
    const r = await analyseNetwork(withRegister, NOW);
    expect(r.live).toBe(false);
    expect(r.actions.length).toBeGreaterThan(0);
    expect(r.coverage.cells).toHaveLength(4);
  });

  it("reports what governed the run, so a reader can check it", async () => {
    const r = await analyseNetwork(withRegister, NOW);
    expect(r.governance.playbook).toBe("champions-analysis");
    // The playbook composes skills, and one of those composes another.
    expect(r.governance.skills).toContain("network-coverage");
    expect(r.governance.skills).toContain("evidence-standards");
    expect(r.governance.contract).toBe("champions");
    expect(r.governance.healthy).toBe(true);
  });

  it("live: a model refusal or error falls back to the floor rather than blanking", async () => {
    process.env.ANTHROPIC_API_KEY = "k";
    vi.stubGlobal("fetch", () => Promise.reject(new Error("upstream down")));
    const r = await analyseNetwork(withRegister, NOW);
    expect(r.live).toBe(false);
    expect(r.actions.length).toBeGreaterThan(0);
  });

  it("says WHY the floor is standing alone — a rejected key is not a missing one", async () => {
    // Both produce the same actions and call for opposite responses. Reporting
    // both as "no model key" tells one of them a lie.
    const noKey = await analyseNetwork(withRegister, NOW);
    expect(noKey.fallback).toMatch(/no model key/i);

    process.env.ANTHROPIC_API_KEY = "k";
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response("nope", { status: 401, headers: { "content-type": "application/json" } })),
    );
    const rejected = await analyseNetwork(withRegister, NOW);
    expect(rejected.live).toBe(false);
    expect(rejected.actions.length).toBeGreaterThan(0); // the floor still stands
    expect(rejected.fallback).toContain("auth");
  });

  it("a model refinement leaves no fallback note to explain away", async () => {
    process.env.ANTHROPIC_API_KEY = "k";
    vi.stubGlobal("fetch", sseFetch({
      content: [{
        type: "tool_use", id: "t", name: "propose_network_actions",
        input: { actions: [{ kind: "uncovered", finding: "f", approach: "a", ask: "x", blocked: "", basis: "b" }] },
      }],
      stop_reason: "tool_use",
      usage: { input_tokens: 1, output_tokens: 1 },
    }));
    const r = await analyseNetwork(withRegister, NOW);
    expect(r.live).toBe(true);
    expect(r.fallback).toBeUndefined();
  });

  it("live: an empty tool call falls back to the floor", async () => {
    process.env.ANTHROPIC_API_KEY = "k";
    vi.stubGlobal("fetch", sseFetch({
            content: [{ type: "tool_use", id: "t", name: "propose_network_actions", input: { actions: [] } }],
            stop_reason: "tool_use",
            usage: { input_tokens: 1, output_tokens: 1 },
          }));
    const r = await analyseNetwork(withRegister, NOW);
    expect(r.live).toBe(false);
    expect(r.actions.length).toBeGreaterThan(0);
  });

  it("live: a usable tool call replaces the floor and is marked live", async () => {
    process.env.ANTHROPIC_API_KEY = "k";
    vi.stubGlobal("fetch", sseFetch({
            content: [{
              type: "tool_use", id: "t", name: "propose_network_actions",
              input: { actions: [{ kind: "uncovered", finding: "SK-PUC has nobody.", approach: "Site lead", ask: "Nominate a spoke", blocked: "Intake", basis: "coverage: SK-PUC" }] },
            }],
            stop_reason: "tool_use",
            usage: { input_tokens: 1, output_tokens: 1 },
          }));
    const r = await analyseNetwork(withRegister, NOW);
    expect(r.live).toBe(true);
    expect(r.actions).toHaveLength(1);
    expect(r.actions[0]!.finding).toBe("SK-PUC has nobody.");
  });

  it("normalises an unknown kind rather than trusting the model's shape", async () => {
    process.env.ANTHROPIC_API_KEY = "k";
    vi.stubGlobal("fetch", sseFetch({
            content: [{
              type: "tool_use", id: "t", name: "propose_network_actions",
              input: { actions: [{ kind: "nonsense", finding: "f", approach: "a", ask: "x", basis: "b" }] },
            }],
            stop_reason: "tool_use",
            usage: { input_tokens: 1, output_tokens: 1 },
          }));
    const r = await analyseNetwork(withRegister, NOW);
    expect(r.actions[0]!.kind).toBe("uncovered");
    expect(r.actions[0]!.blocked).toBe("");
  });
});
