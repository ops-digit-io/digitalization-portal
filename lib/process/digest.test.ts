/**
 * `parseDigest` — the paste-back path for the engagement digest.
 *
 * The tests that matter here are the hostile ones. This function is the only
 * place where JSON authored outside the portal reaches the engagement store, so
 * it is tested as a whitelist (does it drop what it does not know?) rather than
 * as a parser (does it read what it does know?).
 */

import { describe, it, expect } from "vitest";
import { parseDigest, extractJson } from "./digest";

const MINIMAL = { processStatement: "Order intake works but leans on one person." };

describe("parseDigest", () => {
  it("reads the JSON out of a fenced model reply", () => {
    const reply =
      "Here is the digest.\n\n```json\n" +
      JSON.stringify({ ...MINIMAL, processScore: { value: 55, basis: "self-reported latencies" } }) +
      "\n```\n\nLet me know if you want it re-cut.";
    const r = parseDigest(reply);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.digest.processStatement).toBe(MINIMAL.processStatement);
    expect(r.digest.processScore).toEqual({ value: 55, basis: "self-reported latencies" });
  });

  it("accepts bare JSON and an already-parsed object alike", () => {
    expect(parseDigest(JSON.stringify(MINIMAL)).ok).toBe(true);
    expect(parseDigest(MINIMAL).ok).toBe(true);
  });

  it("refuses anything without a process statement", () => {
    // The scores describe a sentence. Without it they are two numbers on a dial.
    for (const bad of [{}, { processStatement: "   " }, { processScore: { value: 80 } }]) {
      const r = parseDigest(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/processStatement/);
    }
  });

  it("refuses text that carries no JSON object", () => {
    for (const bad of ["", "the model refused", "[1,2,3]", null, 42]) {
      const r = parseDigest(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/no JSON object/);
    }
  });

  it("drops keys it does not know instead of storing them", () => {
    const r = parseDigest({
      ...MINIMAL,
      __proto__: { polluted: true },
      script: "<img src=x onerror=alert(1)>",
      generatedAt: "1999-01-01T00:00:00Z",
      model: "some-model-that-never-ran",
      provider: "anthropic",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.digest)).toEqual(["processStatement"]);
    // Provenance is the route's to set, never the paste's to claim.
    expect(r.digest.provider).toBeUndefined();
    expect(r.digest.generatedAt).toBeUndefined();
  });

  it("keeps a score only when it carries a usable number, and clamps it", () => {
    const cases: [unknown, unknown][] = [
      [{ value: 55, basis: "x" }, { value: 55, basis: "x" }],
      [{ value: "72" }, { value: 72, basis: "" }], // numeric string coerces
      [{ value: 140 }, { value: 100, basis: "" }], // clamped up
      [{ value: -20 }, { value: 0, basis: "" }], // clamped down
      [{ value: 55.6 }, { value: 56, basis: "" }], // rounded
      [{ basis: "no number" }, undefined],
      [{ value: "high" }, undefined],
      [{ value: null }, undefined],
      ["55", undefined],
    ];
    for (const [input, expected] of cases) {
      const r = parseDigest({ ...MINIMAL, processScore: input });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.digest.processScore).toEqual(expected);
    }
  });

  it("keeps only tool rows that name a tool", () => {
    const r = parseDigest({
      ...MINIMAL,
      tools: [
        { name: "ERP", role: "system of record", velocityOfChange: "low" },
        { name: "  ", role: "an empty row" },
        { role: "no name at all" },
        "not an object",
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.digest.tools).toHaveLength(1);
    expect(r.digest.tools?.[0]?.name).toBe("ERP");
    expect(r.digest.tools?.[0]?.velocityOfChange).toBe("low");
  });

  it("omits friction and dependency groups whose branches are all empty", () => {
    const empty = parseDigest({ ...MINIMAL, friction: { actual: [], potential: "nope" }, dependencies: {} });
    expect(empty.ok).toBe(true);
    if (empty.ok) {
      expect(empty.digest.friction).toBeUndefined();
      expect(empty.digest.dependencies).toBeUndefined();
    }

    const some = parseDigest({
      ...MINIMAL,
      friction: { actual: [{ where: "hand-off to planning", what: "re-keyed by hand" }], prunable: [{}] },
      dependencies: { influences: [{ process: "Dispatch", how: "sets the sequence" }], influencedBy: [{ how: "no process named" }] },
    });
    expect(some.ok).toBe(true);
    if (!some.ok) return;
    expect(some.digest.friction?.actual).toHaveLength(1);
    expect(some.digest.friction?.prunable).toBeUndefined();
    expect(some.digest.dependencies?.influences?.[0]?.process).toBe("Dispatch");
    expect(some.digest.dependencies?.influencedBy).toBeUndefined();
  });

  it("keeps confidence, basedOn and gaps as plain strings", () => {
    const r = parseDigest({ ...MINIMAL, confidence: "low", basedOn: ["flow", 7, ""], gaps: ["no timestamps"] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.digest.confidence).toBe("low");
    expect(r.digest.basedOn).toEqual(["flow"]);
    expect(r.digest.gaps).toEqual(["no timestamps"]);
  });

  it("round-trips what generate would have stored", () => {
    // The shape the digest agent is asked for (lib/process/ai-integration.test.ts).
    const fromModel = {
      processStatement: "Order intake works but leans on one person.",
      processScore: { value: 55, basis: "self-reported latencies" },
      technologyStatement: "Mail plus ERP, no exports.",
      technologyScore: { value: 40, basis: "no interfaces" },
      confidence: "low",
      gaps: ["no timestamps"],
    };
    const r = parseDigest("```json\n" + JSON.stringify(fromModel) + "\n```");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.digest).toEqual(fromModel);
  });
});

describe("extractJson", () => {
  it("finds the object in fenced, unfenced and chatty replies", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('Sure!\n{"a":1}\nHope that helps.')).toEqual({ a: 1 });
  });

  it("returns null rather than throwing on nonsense", () => {
    expect(extractJson("no json here")).toBeNull();
    expect(extractJson("{ not: valid json ]")).toBeNull();
  });
});
