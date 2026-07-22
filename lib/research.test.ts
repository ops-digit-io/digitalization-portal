import { describe, expect, it } from "vitest";
import { seedResearchBrief, buildResearchMarkdown } from "./research.js";
import { EMPTY_ANSWERS, type DemandAnswers } from "./demand.js";

const answers: DemandAnswers = {
  ...EMPTY_ANSWERS,
  title: "Predictive scrap alerts",
  problem: "Defects are caught only at end-of-line inspection.",
  desiredOutcome: "An early signal that predicts a defect trend.",
  plant: "DE-ALD",
  domain: "quality",
};
const meta = { id: "UC-2026-0071", title: "Predictive scrap alerts", generatedOn: "2026-07-16" };

describe("seedResearchBrief", () => {
  const b = seedResearchBrief(answers);

  it("is deterministic and marked as non-live (no invented sources)", () => {
    expect(seedResearchBrief(answers)).toEqual(b);
    expect(b.live).toBe(false);
    expect(b.referenceCases).toEqual([]);
    expect(b.testimonials).toEqual([]);
    expect(b.sources).toEqual([]);
  });

  it("produces a real research plan grounded in the domain", () => {
    expect(b.domain).toBe("quality");
    expect(b.researchTargets.length).toBeGreaterThan(0);
    expect(b.queries.length).toBeGreaterThan(0);
    expect(b.queries.join(" ")).toMatch(/quality/i);
    expect(b.standards.join(" ")).toMatch(/ISO 9001/);
    expect(b.pitfalls.length).toBeGreaterThan(0);
  });
});

describe("buildResearchMarkdown", () => {
  it("carries every standardized section and labels an offline run honestly", () => {
    const md = buildResearchMarkdown(meta, seedResearchBrief(answers));
    for (const h of ["## Problem class", "## Reference cases", "## Testimonials", "## Benchmarks", "## Standards & compliance", "## Common pitfalls", "## What to research", "## Suggested search queries", "## Sources"]) {
      expect(md).toContain(h);
    }
    expect(md.toLowerCase()).toContain("no live web research");
    expect(md).toContain("run live research");
  });

  it("labels a live brief as gathered from public sources", () => {
    const md = buildResearchMarkdown(meta, { ...seedResearchBrief(answers), live: true, sources: ["https://example.org/case"] });
    expect(md).toContain("via public sources");
  });
});
