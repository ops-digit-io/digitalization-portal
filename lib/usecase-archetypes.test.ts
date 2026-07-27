import { describe, it, expect } from "vitest";
import { classifyArchetype, archetypeById, ARCHETYPES } from "./usecase-archetypes.js";
import { EMPTY_ANSWERS, type DemandAnswers } from "./demand.js";

const demand = (over: Partial<DemandAnswers>): DemandAnswers => ({ ...EMPTY_ANSWERS, ...over });

describe("classifyArchetype", () => {
  const cases: [string, Partial<DemandAnswers>, string][] = [
    ["GenAI assistant", { title: "A chatbot to answer HR questions from our policy documents" }, "genai_assistant"],
    ["computer vision", { problem: "Inspect parts with a camera to detect surface defects from images" }, "computer_vision"],
    ["prediction", { desiredOutcome: "Predict machine failure and forecast an early warning of anomalies" }, "prediction"],
    ["optimization", { desiredOutcome: "Optimize the production schedule and routing to minimize changeover" }, "optimization"],
    ["automation", { problem: "Too much manual work; automate the invoice workflow with RPA" }, "automation"],
    ["IoT monitoring", { problem: "Put sensors on pumps for remote condition monitoring via telemetry" }, "iot_monitoring"],
    ["integration", { desiredOutcome: "Build a pipeline to sync master data between ERP and CRM via API" }, "integration"],
    ["self-service", { title: "A self-service portal where staff submit a request form" }, "self_service"],
    ["data foundation", { desiredOutcome: "Establish a single source of truth and data governance for a golden record" }, "data_foundation"],
    ["analytics (default)", { title: "A dashboard to track KPI performance over time" }, "analytics"],
  ];

  for (const [label, answers, expected] of cases) {
    it(`classifies ${label} → ${expected}`, () => {
      expect(classifyArchetype(demand(answers)).id).toBe(expected);
    });
  }

  it("is deterministic", () => {
    const a = demand({ title: "predict failures", problem: "forecast anomalies" });
    expect(classifyArchetype(a).id).toBe(classifyArchetype(a).id);
  });

  it("falls back to descriptive analytics when nothing matches", () => {
    expect(classifyArchetype(demand({ title: "something vague", problem: "unclear need" })).id).toBe("analytics");
  });
});

describe("archetype catalogue", () => {
  it("every archetype carries a complete, non-empty lens", () => {
    for (const a of ARCHETYPES) {
      expect(a.id).toBeTruthy();
      expect(a.label).toBeTruthy();
      expect(a.summary).toBeTruthy();
      expect(a.feasibilityQuestions.length).toBeGreaterThan(0);
      expect(a.dataPrerequisites.length).toBeGreaterThan(0);
      expect(a.typicalNfrs.length).toBeGreaterThan(0);
      expect(a.characteristicRisks.length).toBeGreaterThan(0);
      expect(a.acceptancePatterns.length).toBeGreaterThan(0);
      expect(a.comparablePatterns.length).toBeGreaterThan(0);
    }
  });

  it("archetypeById falls back to analytics for an unknown id", () => {
    expect(archetypeById("nope").id).toBe("analytics");
    expect(archetypeById("genai_assistant").id).toBe("genai_assistant");
  });
});
