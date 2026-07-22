import { describe, expect, it } from "vitest";
import {
  buildDemand,
  classifyDemand,
  missingRequired,
  nextDemandId,
  EMPTY_ANSWERS,
  INTAKE_FIELDS,
  type DemandAnswers,
} from "./demand.js";
import { parseUseCase } from "./parse.js";

const meta = { id: "UC-2026-0099", createdOn: "2026-07-22", lane: "data_ai" as const };

const answers: DemandAnswers = {
  ...EMPTY_ANSWERS,
  title: "Predictive scrap alerts",
  problem: "Defects are caught only at end-of-line inspection.",
  currentPain: "We scrap 40-60 parts before adjusting.",
  desiredOutcome: "An early signal from telemetry.",
  affectedProcess: "Coating line, quality.",
  frequencyScale: "2-3 shifts a week.",
  constraints: "PLC exposes temperature tags.",
  plant: "DE-ALD",
  domain: "quality",
  requester: "m.keller@example.com",
};

describe("buildDemand", () => {
  it("is deterministic — same input renders byte-identical markdown", () => {
    expect(buildDemand(meta, answers)).toBe(buildDemand(meta, answers));
  });

  it("always renders every prose section, even when empty (stable shape)", () => {
    const empty = buildDemand(meta, EMPTY_ANSWERS);
    for (const f of INTAKE_FIELDS) {
      if (f.section) expect(empty).toContain(`## ${f.section}`);
    }
    // Empty required fields fall back to their stable placeholder, not blank.
    expect(empty).toContain("_Captured at intake._");
  });

  it("opens at S1 with G1 open and the rest pending", () => {
    const p = parseUseCase(buildDemand(meta, answers));
    expect(p.state.stage).toBe("S1");
    expect(p.needsAttention).toBe(false);
    expect(p.gates.find((g) => g.id === "G1")!.status).toBe("open");
    expect(p.gates.find((g) => g.id === "G2")!.status).toBe("pending");
  });

  it("round-trips through the use-case parser (a demand is a future README)", () => {
    const p = parseUseCase(buildDemand(meta, answers));
    expect(p.state.lane).toBe("data_ai");
    expect(p.state.plant).toBe("DE-ALD");
    expect(p.state.domain).toBe("quality");
    expect(p.title).toContain("Predictive scrap alerts");
  });
});

describe("classifyDemand", () => {
  it("is deterministic and keyword-driven", () => {
    const a = { ...EMPTY_ANSWERS, problem: "We need a predictive ML model for defects." };
    expect(classifyDemand(a)).toEqual(classifyDemand(a));
    expect(classifyDemand(a).lane).toBe("data_ai");
  });

  it("defaults to transform when there is text but no keyword", () => {
    const a = { ...EMPTY_ANSWERS, problem: "Handover between shifts loses information." };
    expect(classifyDemand(a).lane).toBe("transform");
  });

  it("proposes unassigned for empty input", () => {
    expect(classifyDemand(EMPTY_ANSWERS).lane).toBe("unassigned");
  });

  it("infers a domain from keywords when none given", () => {
    const a = { ...EMPTY_ANSWERS, problem: "Reduce scrap and rework on the line." };
    expect(classifyDemand(a).domain).toBe("quality");
  });
});

describe("missingRequired", () => {
  it("lists empty required fields and clears when filled", () => {
    expect(missingRequired(EMPTY_ANSWERS).length).toBeGreaterThan(0);
    expect(missingRequired(answers)).toEqual([]);
  });
});

describe("nextDemandId", () => {
  it("increments the highest number for the year, zero-padded", () => {
    expect(nextDemandId(["UC-2026-0071", "UC-2026-0073", "UC-2025-0500"], 2026)).toBe("UC-2026-0074");
  });

  it("starts at 0001 for an empty year", () => {
    expect(nextDemandId([], 2026)).toBe("UC-2026-0001");
  });
});
