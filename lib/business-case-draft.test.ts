import { describe, it, expect } from "vitest";
import { draftBusinessCase, buildBusinessCaseMarkdown, setBusinessCaseValue, setAssumptionTested, logBusinessCaseChange, type BusinessCaseMeta } from "./business-case-draft.js";
import { parseBusinessCase, simulateBusinessCase, analyseBusinessCase } from "./businesscase.js";
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

describe("setBusinessCaseValue is section-scoped (no cross-section bleed)", () => {
  const { requirements } = analyseIntake(answers);
  const draft = buildBusinessCaseMarkdown(meta, draftBusinessCase(answers, requirements));

  it("rewrites the Value section's Annual gross, not a like-named phrase elsewhere", () => {
    // Inject a decoy "Annual gross" mention in an unrelated section.
    const withDecoy = draft.replace("## Open questions", "## Notes\n\n**Annual gross.** do not touch this line\n\n## Open questions");
    const out = setBusinessCaseValue(withDecoy, { annualGross: 250000 });
    expect(out).toContain("**Annual gross.** do not touch this line"); // decoy untouched
    expect(parseBusinessCase(out).annualGross).toBe(250000); // real one set
  });

  it("parses build and run cost back after setting them", () => {
    const out = setBusinessCaseValue(draft, { buildEstimate: "EUR 80,000", annualRunEstimate: "EUR 20,000 / yr" });
    const facts = parseBusinessCase(out);
    expect(facts.buildCost).toBe(80000);
    expect(facts.annualRunCost).toBe(20000);
  });
});

describe("setAssumptionTested", () => {
  const { requirements } = analyseIntake(answers);
  const draft = buildBusinessCaseMarkdown(meta, draftBusinessCase(answers, requirements));

  it("marks the indexed assumption tested and the parser reflects it", () => {
    expect(parseBusinessCase(draft).assumptions[0]!.tested).toBe(false);
    const out = setAssumptionTested(draft, 0, true);
    const facts = parseBusinessCase(out);
    expect(facts.assumptions[0]!.tested).toBe(true);
    // other rows unchanged
    expect(facts.assumptions[1]?.tested).toBe(false);
    // tested assumptions carry lower sensitivity → higher downside band
    const base = parseBusinessCase(draft).assumptions;
    expect(facts.assumptions[0]!.sensitivity).toBeLessThan(base[0]!.sensitivity);
  });

  it("round-trips a toggle back to untested", () => {
    const on = setAssumptionTested(draft, 0, true);
    const off = setAssumptionTested(on, 0, false);
    expect(parseBusinessCase(off).assumptions[0]!.tested).toBe(false);
  });

  it("is a no-op for an out-of-range index", () => {
    expect(setAssumptionTested(draft, 99, true)).toBe(draft);
  });
});

describe("logBusinessCaseChange", () => {
  const { requirements } = analyseIntake(answers);
  const draft = buildBusinessCaseMarkdown(meta, draftBusinessCase(answers, requirements));

  it("creates a Change log section on first write, then appends", () => {
    expect(draft).not.toContain("## Change log");
    const one = logBusinessCaseChange(draft, { actor: "amy", date: "2026-07-28", summary: "annual gross set to EUR 250,000" });
    expect(one).toContain("## Change log");
    expect(one).toContain("- 2026-07-28 — annual gross set to EUR 250,000 (amy)");
    const two = logBusinessCaseChange(one, { actor: "ben", date: "2026-07-29", summary: "assumption tested" });
    expect((two.match(/^- \d{4}-\d{2}-\d{2} — /gm) ?? [])).toHaveLength(2);
    // only one Change log heading, ever
    expect((two.match(/## Change log/g) ?? [])).toHaveLength(1);
  });

  it("leaves the rest of the document parseable", () => {
    const logged = logBusinessCaseChange(setBusinessCaseValue(draft, { annualGross: 100000 }), { actor: "amy", date: "2026-07-28", summary: "value set" });
    const facts = parseBusinessCase(logged);
    expect(facts.annualGross).toBe(100000);
    expect(facts.confidence).toBe("indicative");
    expect(facts.assumptions.length).toBeGreaterThanOrEqual(2);
  });
});

describe("analyseBusinessCase (draft → quantify → decision-grade economics)", () => {
  const { requirements } = analyseIntake(answers);
  const draft = buildBusinessCaseMarkdown(meta, draftBusinessCase(answers, requirements));

  it("is all zeros while the value is unquantified", () => {
    const { economics } = analyseBusinessCase(draft);
    expect(economics.hasValue).toBe(false);
    expect(economics.p50.netAnnual).toBe(0);
    expect(economics.viable).toBe(false);
  });

  it("lights up net value, payback and NPV once value and cost are entered", () => {
    let md = setBusinessCaseValue(draft, { annualGross: 250000, buildEstimate: "EUR 80,000", annualRunEstimate: "EUR 20,000" });
    // prove one assumption to tighten the downside
    md = setAssumptionTested(md, 0, true);
    const { facts, economics } = analyseBusinessCase(md);
    expect(facts.annualGross).toBe(250000);
    expect(facts.buildCost).toBe(80000);
    expect(facts.annualRunCost).toBe(20000);
    expect(economics.p90.netAnnual).toBe(230000); // 250k − 20k run
    expect(economics.paybackYears).toBeGreaterThan(0);
    expect(economics.npv).toBeGreaterThan(0);
    expect(economics.viable).toBe(true);
    // testing an assumption raised the downside above the fully-untested floor
    const untested = analyseBusinessCase(setBusinessCaseValue(draft, { annualGross: 250000, annualRunEstimate: "EUR 20,000" }));
    expect(economics.p10.netAnnual).toBeGreaterThan(untested.economics.p10.netAnnual);
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
