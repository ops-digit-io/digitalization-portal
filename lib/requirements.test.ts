import { describe, expect, it } from "vitest";
import { analyseIntake, buildRequirementsMarkdown, buildAnalysisMarkdown } from "./requirements.js";
import { EMPTY_ANSWERS, type DemandAnswers } from "./demand.js";

const answers: DemandAnswers = {
  ...EMPTY_ANSWERS,
  title: "Predictive scrap alerts",
  problem: "Defects are caught only at end-of-line inspection.",
  currentPain: "We scrap 40-60 parts before adjusting; ~150/week.",
  desiredOutcome: "An early signal that predicts a defect trend.",
  affectedProcess: "Coating line, quality.",
  frequencyScale: "2-3 shifts a week.",
  plant: "DE-ALD",
  domain: "quality",
};

const meta = { id: "UC-2026-0071", title: "Predictive scrap alerts", generatedOn: "2026-07-16" };

describe("analyseIntake", () => {
  const { analysis, requirements } = analyseIntake(answers);

  it("is deterministic", () => {
    expect(analyseIntake(answers)).toEqual({ analysis, requirements });
  });

  it("grounds the analysis in the demand's domain", () => {
    expect(analysis.domain).toBe("quality");
    expect(analysis.personas).toContain("line operator");
    expect(analysis.dataSources).toContain("MES");
    expect(analysis.standards.join(" ")).toMatch(/ISO 9001/);
    expect(analysis.comparablePatterns.length).toBeGreaterThan(0);
  });

  it("derives epics, user stories with acceptance criteria, and NFRs", () => {
    expect(requirements.epics.length).toBeGreaterThanOrEqual(2);
    expect(requirements.stories.length).toBeGreaterThanOrEqual(2);
    for (const s of requirements.stories) {
      expect(s.id).toMatch(/^US-\d+$/);
      expect(s.acceptance.length).toBeGreaterThan(0);
      expect(["must", "should", "could"]).toContain(s.priority);
      expect(requirements.epics.some((e) => e.id === s.epic)).toBe(true);
    }
    expect(requirements.nfrs.length).toBeGreaterThan(0);
  });

  it("raises an enhancement/open question when the intake is thin", () => {
    const thin = analyseIntake({ ...EMPTY_ANSWERS, title: "X", problem: "p", currentPain: "bad", desiredOutcome: "better", plant: "DE-ALD", domain: "maintenance" });
    expect(thin.analysis.enhancements.some((e) => /baseline|quantif/i.test(e))).toBe(true);
    expect(thin.requirements.openQuestions.length).toBeGreaterThan(0);
    expect(thin.analysis.personas).toContain("maintenance technician"); // domain switched
  });

  it("falls back to a generic domain for an unknown one", () => {
    const g = analyseIntake({ ...EMPTY_ANSWERS, title: "X", problem: "p", currentPain: "c", desiredOutcome: "d", plant: "P", domain: "astrophysics" });
    expect(g.requirements.epics.length).toBeGreaterThan(0);
    expect(g.analysis.personas.length).toBeGreaterThan(0);
  });
});

describe("standardized markdown", () => {
  const { analysis, requirements } = analyseIntake(answers);

  it("requirements.md carries every standardized section", () => {
    const md = buildRequirementsMarkdown(meta, requirements);
    for (const h of ["## Epics", "## User stories", "## Non-functional requirements", "## Assumptions", "## Risks", "## Open questions", "## Out of scope"]) {
      expect(md).toContain(h);
    }
    expect(md).toMatch(/As a \*\*.+\*\*, I want .+, so that/);
    expect(md).toMatch(/Acceptance criteria/);
  });

  it("analysis.md carries the domain analysis sections and is deterministic", () => {
    const md = buildAnalysisMarkdown(meta, analysis);
    for (const h of ["## Domain", "## Refined problem", "## Comparable patterns", "## Suggested enhancements", "## Personas"]) {
      expect(md).toContain(h);
    }
    expect(buildAnalysisMarkdown(meta, analysis)).toBe(md);
  });
});
