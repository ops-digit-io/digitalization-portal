import { describe, it, expect } from "vitest";
import { draftBusinessCase, buildBusinessCaseMarkdown, setBusinessCaseValue, type BusinessCaseMeta } from "./business-case-draft.js";
import { parseBusinessCase, simulateBusinessCase } from "./businesscase.js";
import { analyseIntake } from "./requirements.js";
import { EMPTY_ANSWERS, type DemandAnswers } from "./demand.js";

const meta: BusinessCaseMeta = { id: "UC-2026-0300", title: "Predictive scrap alerts", generatedOn: "2026-07-28" };

const answers: DemandAnswers = {
  ...EMPTY_ANSWERS,
  title: "Predictive scrap alerts",
  problem: "Defects are caught only at end-of-line inspection.",
  currentPain: "We scrap 40-60 parts before adjusting; ~150/week.",
  desiredOutcome: "predict a defect trend early enough to adjust",
  plant: "DE-ALD",
  domain: "quality",
};

describe("draftBusinessCase → buildBusinessCaseMarkdown", () => {
  const { requirements } = analyseIntake(answers);
  const draft = draftBusinessCase(answers, requirements);
  const md = buildBusinessCaseMarkdown(meta, draft);

  it("round-trips through parseBusinessCase as an indicative draft", () => {
    const facts = parseBusinessCase(md);
    expect(facts.confidence).toBe("indicative");
    expect(facts.baselineVerified).toBe(false);
    expect(facts.category).toMatch(/quality cost/i);
    expect(facts.assumptions.length).toBeGreaterThanOrEqual(2);
  });

  it("never fabricates a value figure (no baseline → no annual gross)", () => {
    const facts = parseBusinessCase(md);
    expect(facts.annualGross).toBeUndefined();
    expect(md).toContain("To be quantified");
  });

  it("leads with the value assumption, untested", () => {
    expect(draft.value.assumptions[0]!.name).toMatch(/baseline can be quantified/i);
    expect(draft.value.assumptions.every((a) => a.tested === false)).toBe(true);
  });

  it("maps the domain to a value category", () => {
    expect(draft.value.categoryLabel).toBe("Quality cost");
  });

  it("never emits a committed confidence at draft time", () => {
    expect(md).not.toMatch(/confidence:\s*committed/i);
    expect(draft.confidence).toBe("indicative");
  });

  it("carries the baseline metric and marks it unverified", () => {
    expect(md).toContain("## Baseline");
    expect(md).toMatch(/\*\*Verified\.\*\* No/);
    expect(draft.baseline.value).toContain("150/week"); // quantified pain surfaced as the baseline
  });

  it("emits every standardized section", () => {
    for (const h of ["## State", "## Baseline", "## Value", "### Assumptions", "## Cost", "## Open questions"]) {
      expect(md).toContain(h);
    }
  });

  it("is deterministic", () => {
    expect(buildBusinessCaseMarkdown(meta, draftBusinessCase(answers, requirements))).toBe(md);
  });

  it("feeds the value simulation (bands compute, still indicative)", () => {
    // With no annual gross the base is 0, but the simulation must run without throwing.
    const { simulation } = simulateBusinessCase(md);
    expect(simulation.confidence).toBe("indicative");
    expect(simulation.p90).toBeGreaterThanOrEqual(simulation.p10);
  });
});

describe("setBusinessCaseValue (the human quantifies the draft)", () => {
  const { requirements } = analyseIntake(answers);
  const draft = buildBusinessCaseMarkdown(meta, draftBusinessCase(answers, requirements));

  it("sets the annual gross so the parser and simulation read a real figure", () => {
    const md = setBusinessCaseValue(draft, { annualGross: 250000 });
    const facts = parseBusinessCase(md);
    expect(facts.annualGross).toBe(250000);
    const { simulation } = simulateBusinessCase(md);
    expect(simulation.p90).toBeGreaterThan(0);
    expect(simulation.p90).toBeGreaterThanOrEqual(simulation.p50);
    expect(simulation.p50).toBeGreaterThanOrEqual(simulation.p10);
  });

  it("clears the value back to 'to be quantified' when null/zero", () => {
    const withValue = setBusinessCaseValue(draft, { annualGross: 100000 });
    expect(parseBusinessCase(withValue).annualGross).toBe(100000);
    const cleared = setBusinessCaseValue(withValue, { annualGross: null });
    expect(parseBusinessCase(cleared).annualGross).toBeUndefined();
    expect(cleared).toContain("To be quantified");
    expect(parseBusinessCase(setBusinessCaseValue(draft, { annualGross: 0 })).annualGross).toBeUndefined();
  });

  it("marks the baseline verified without touching other sections", () => {
    const md = setBusinessCaseValue(draft, { baselineVerified: true });
    expect(parseBusinessCase(md).baselineVerified).toBe(true);
    expect(md).toMatch(/\*\*Verified\.\*\* Yes/);
    // confidence, assumptions, open questions untouched
    expect(parseBusinessCase(md).confidence).toBe("indicative");
    expect(md).toContain("## Open questions");
  });

  it("sets the build and run cost rows", () => {
    const md = setBusinessCaseValue(draft, { buildEstimate: "EUR 80,000 one-off", annualRunEstimate: "EUR 20,000 / yr" });
    expect(md).toContain("EUR 80,000 one-off");
    expect(md).toContain("EUR 20,000 / yr");
    // rows stay valid table cells
    expect(md).toMatch(/\| Build estimate \| EUR 80,000 one-off \|/);
  });

  it("only patches the fields provided (undefined leaves the draft as-is)", () => {
    expect(setBusinessCaseValue(draft, {})).toBe(draft);
  });

  it("is idempotent — re-applying the same value yields identical bytes", () => {
    const once = setBusinessCaseValue(draft, { annualGross: 250000, baselineVerified: true });
    const twice = setBusinessCaseValue(once, { annualGross: 250000, baselineVerified: true });
    expect(twice).toBe(once);
  });
});

describe("draftBusinessCase without requirements", () => {
  it("still produces a valid draft from the demand alone", () => {
    const md = buildBusinessCaseMarkdown(meta, draftBusinessCase({ ...answers, constraints: "MES data exists" }, undefined));
    const facts = parseBusinessCase(md);
    expect(facts.confidence).toBe("indicative");
    expect(facts.assumptions.length).toBeGreaterThanOrEqual(2); // value assumption + constraint
    expect(md).toContain("MES data exists");
  });

  it("defaults a non-manufacturing domain to labour effort", () => {
    const draft = draftBusinessCase({ ...EMPTY_ANSWERS, title: "HR assistant", problem: "p", desiredOutcome: "answer questions", domain: "hr" }, undefined);
    expect(draft.value.categoryLabel).toBe("Labour effort");
  });
});
