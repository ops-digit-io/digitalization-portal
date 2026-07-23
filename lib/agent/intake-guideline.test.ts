import { describe, expect, it } from "vitest";
import { loadIntakeGuideline, intakeSystemPrompt, SAVE_DEMAND_TOOL } from "./intake-guideline.js";
import { INTAKE_FIELDS } from "../demand.js";

describe("intake guideline", () => {
  it("loads the playbook and interview guide that define the agent's behaviour", async () => {
    const g = await loadIntakeGuideline();
    expect(g.playbook).toContain("s1-intake");
    expect(g.playbook.toLowerCase()).toContain("one question per turn");
    expect(g.interview).toContain("Intake interview");
  });

  it("builds a system prompt from the playbook — so the playbook governs the agent", async () => {
    const g = await loadIntakeGuideline();
    const prompt = intakeSystemPrompt(g);
    expect(prompt).toContain("PLAYBOOK: s1-intake");
    expect(prompt).toContain(g.playbook.trim().slice(0, 80)); // the actual playbook text is embedded
    expect(prompt).toContain("save_demand");
    // every field is listed for the model to collect
    for (const f of INTAKE_FIELDS) expect(prompt).toContain(f.key);
  });

  it("exposes a save tool requiring exactly the required fields", () => {
    const required = INTAKE_FIELDS.filter((f) => f.required).map((f) => f.key);
    expect(SAVE_DEMAND_TOOL.input_schema.required).toEqual(required);
  });
});
