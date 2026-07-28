import { describe, expect, it } from "vitest";
import { analyseIntake, buildRequirementsMarkdown, buildAnalysisMarkdown, parseRequirementsMarkdown } from "./requirements.js";
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

  it("grounds the analysis on the solution archetype as a second axis", () => {
    // This demand predicts a defect trend → prediction archetype.
    expect(analysis.archetype).toBe("Prediction / anomaly detection");
    expect(analysis.feasibilityQuestions.length).toBeGreaterThan(0);
    expect(analysis.dataPrerequisites.length).toBeGreaterThan(0);
    expect(analysis.characteristicRisks.length).toBeGreaterThan(0);
  });

  it("classifies a non-manufacturing digital use case (GenAI) end to end", () => {
    const g = analyseIntake({ ...EMPTY_ANSWERS, title: "Assistant to answer policy questions from our HR documents", problem: "employees email HR the same questions", currentPain: "HR spends hours", desiredOutcome: "a chatbot answers from the document base", plant: "ALL", domain: "hr" });
    expect(g.analysis.archetype).toBe("GenAI assistant / RAG");
    // Archetype-driven NFRs are folded in (groundedness is load-bearing for RAG).
    expect(g.requirements.nfrs.some((n) => /groundedness|human control/i.test(n.category))).toBe(true);
    // HR domain personas ground it (aliases + new domain).
    expect(g.analysis.personas).toContain("employee");
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
    for (const h of ["## Domain", "## Refined problem", "## Solution archetype", "## Comparable patterns", "## Suggested enhancements", "## Personas"]) {
      expect(md).toContain(h);
    }
    expect(buildAnalysisMarkdown(meta, analysis)).toBe(md);
  });
});

describe("parseRequirementsMarkdown (round-trip)", () => {
  const { requirements } = analyseIntake(answers);
  const md = buildRequirementsMarkdown(meta, requirements);
  const parsed = parseRequirementsMarkdown(md);

  it("recovers the epics", () => {
    expect(parsed.epics.map((e) => e.id)).toEqual(requirements.epics.map((e) => e.id));
    expect(parsed.epics[0]!.title).toBe(requirements.epics[0]!.title);
    expect(parsed.epics[0]!.description).toBe(requirements.epics[0]!.description);
  });

  it("recovers each user story with persona, capability, benefit, priority and epic link", () => {
    expect(parsed.stories).toHaveLength(requirements.stories.length);
    for (const s of requirements.stories) {
      const got = parsed.stories.find((x) => x.id === s.id)!;
      expect(got).toBeDefined();
      expect(got.epic).toBe(s.epic);
      expect(got.persona).toBe(s.persona);
      expect(got.capability).toBe(s.capability);
      expect(got.benefit).toBe(s.benefit);
      expect(got.priority).toBe(s.priority);
    }
  });

  it("recovers acceptance criteria for each story", () => {
    for (const s of requirements.stories) {
      const got = parsed.stories.find((x) => x.id === s.id)!;
      expect(got.acceptance).toEqual(s.acceptance);
    }
  });

  it("recovers NFRs and the supporting lists", () => {
    expect(parsed.nfrs.map((n) => n.id)).toEqual(requirements.nfrs.map((n) => n.id));
    expect(parsed.assumptions).toEqual(requirements.assumptions);
    expect(parsed.risks).toEqual(requirements.risks);
    expect(parsed.openQuestions).toEqual(requirements.openQuestions);
    expect(parsed.outOfScope).toEqual(requirements.outOfScope);
  });

  it("returns empty arrays for a non-requirements document", () => {
    const empty = parseRequirementsMarkdown("# Something else\n\nno sections here");
    expect(empty.epics).toEqual([]);
    expect(empty.stories).toEqual([]);
  });
});
