import { describe, it, expect } from "vitest";
import {
  parseBusinessCaseModel,
  renderBusinessCaseModel,
  applyValuePatch,
  applyAssumptionTested,
  appendChangeLog,
  parseEuro,
} from "./business-case-model.js";

const CANONICAL = `# Business case · UC-2026-0300 · Predictive scrap alerts

> Auto-generated on 2026-07-28. Draft — a human decides.

## State

- **Confidence:** indicative
- **Version:** 1
- **Review horizon:** 12 weeks

## Baseline

**Metric.** Scrap rate at end of line
**Value.** ~150/week
**Verified.** No — intake estimate, not measured.

## Value

**Category.** Quality cost
**Annual gross.** EUR 250,000
**Basis.** Scrap avoided × unit cost.

### Assumptions

| Assumption | Tested | Source |
|---|---|---|
| The baseline can be quantified | No | — |
| MES data is available | Yes | requirements |

## Cost

| | |
|---|---|
| Build estimate | EUR 80,000 |
| Annual run estimate | EUR 20,000 / yr |

## Open questions

- Who owns the value?
`;

describe("parseBusinessCaseModel", () => {
  it("reads every field from a canonical document", () => {
    const m = parseBusinessCaseModel(CANONICAL);
    expect(m.heading).toBe("Business case · UC-2026-0300 · Predictive scrap alerts");
    expect(m.confidence).toBe("indicative");
    expect(m.version).toBe(1);
    expect(m.reviewHorizonWeeks).toBe(12);
    expect(m.baseline.verified).toBe(false);
    expect(m.baseline.value).toBe("~150/week");
    expect(m.value.category).toBe("Quality cost");
    expect(m.value.annualGross).toBe(250000);
    expect(m.assumptions).toHaveLength(2);
    expect(m.assumptions[1]).toMatchObject({ tested: true, source: "requirements" });
    expect(m.cost.buildEstimate).toBe("EUR 80,000");
    expect(m.cost.annualRunEstimate).toBe("EUR 20,000 / yr");
    expect(m.openQuestions).toEqual(["Who owns the value?"]);
  });

  it("round-trips: render(parse(md)) reproduces a canonical document exactly", () => {
    expect(renderBusinessCaseModel(parseBusinessCaseModel(CANONICAL))).toBe(CANONICAL);
  });

  it("is tolerant of an untidy input surface (this is the whole point)", () => {
    // Extra heading spaces, a collapsed table header, reordered/space-padded fields,
    // a differently-worded verified line, lowercase category — all still parse.
    const messy = `#   Business case · UC-9 · Messy

##   State
-   **Confidence:**   indicative
- **Version:** 2

## Baseline

**Value.**   200 units
**Metric.** the thing
**Verified.** yes — confirmed by audit

## Value

**Annual gross.**    EUR 1.250.000
**Category.** labour effort
**Basis.** because.

###   Assumptions

|Assumption|Tested|Source|
|:-|:-:|-:|
|A works|yes|pilot|
|B holds|no|intake|

## Cost

| | |
|---|---|
|  Build estimate  |  €40,000  |
| Annual run estimate | none yet |

## Open questions

- q1
`;
    const m = parseBusinessCaseModel(messy);
    expect(m.version).toBe(2);
    expect(m.baseline.verified).toBe(true);
    expect(m.value.annualGross).toBe(1250000); // European thousands separators
    expect(m.value.category).toBe("labour effort");
    expect(m.assumptions).toEqual([
      { name: "A works", tested: true, source: "pilot" },
      { name: "B holds", tested: false, source: "intake" },
    ]);
    expect(m.cost.buildEstimate).toBe("€40,000");
  });

  it("preserves an unrecognised section verbatim through a round-trip", () => {
    const withExtra = CANONICAL.replace("## Open questions", "## Risk notes\n\nSome **bespoke** prose we don't model.\n\n## Open questions");
    const out = renderBusinessCaseModel(parseBusinessCaseModel(withExtra));
    expect(out).toContain("## Risk notes");
    expect(out).toContain("Some **bespoke** prose we don't model.");
    // and the modelled sections are still intact
    expect(parseBusinessCaseModel(out).value.annualGross).toBe(250000);
  });

  it("never throws on garbage input", () => {
    expect(() => parseBusinessCaseModel("")).not.toThrow();
    expect(() => parseBusinessCaseModel("# just a title\n\nnothing else")).not.toThrow();
    expect(parseBusinessCaseModel("").confidence).toBe("indicative");
  });
});

describe("model edits", () => {
  const model = parseBusinessCaseModel(CANONICAL);

  it("applyValuePatch clears the gross on null/zero and sets cost", () => {
    expect(applyValuePatch(model, { annualGross: null }).value.annualGross).toBeUndefined();
    expect(applyValuePatch(model, { annualGross: 0 }).value.annualGross).toBeUndefined();
    expect(applyValuePatch(model, { annualGross: 500000 }).value.annualGross).toBe(500000);
    expect(applyValuePatch(model, { baselineVerified: true }).baseline.verified).toBe(true);
    expect(applyValuePatch(model, { buildEstimate: "  " }).cost.buildEstimate).toBeUndefined();
  });

  it("applyAssumptionTested toggles by index and no-ops out of range", () => {
    expect(applyAssumptionTested(model, 0, true).assumptions[0]!.tested).toBe(true);
    expect(applyAssumptionTested(model, 99, true)).toBe(model); // same ref → caller returns input
  });

  it("appendChangeLog adds a dated line and renders a section", () => {
    const m = appendChangeLog(model, { actor: "amy", date: "2026-07-29", summary: "value set" });
    expect(m.changeLog).toEqual(["2026-07-29 — value set (amy)"]);
    expect(renderBusinessCaseModel(m)).toContain("## Change log\n\n- 2026-07-29 — value set (amy)");
  });
});

describe("parseEuro", () => {
  it("extracts integers from currency-ish text, else undefined", () => {
    expect(parseEuro("EUR 250,000")).toBe(250000);
    expect(parseEuro("€1.250.000")).toBe(1250000);
    expect(parseEuro("80,000 one-off")).toBe(80000);
    expect(parseEuro("To be estimated")).toBeUndefined();
    expect(parseEuro(undefined)).toBeUndefined();
  });
});
