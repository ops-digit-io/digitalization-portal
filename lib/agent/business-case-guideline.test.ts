import { describe, it, expect } from "vitest";
import { loadBusinessCaseGuideline, businessCaseSystemPrompt } from "./business-case-guideline.js";

/** Reads the bundled playbook + skills from the working tree — doubles as a contract
 *  that the business-case library files exist, parse, and carry the honesty frame. */
describe("business-case guideline", () => {
  it("loads the playbook and composes its method skills", async () => {
    const g = await loadBusinessCaseGuideline();
    expect(g.playbook).toContain("business-case");
    const names = g.skills.map((s) => s.name);
    for (const expected of ["value-sizing", "risk-assumptions"]) expect(names).toContain(expected);
    for (const s of g.skills) expect(s.body.trim().length).toBeGreaterThan(0);
  });

  it("composes a prompt whose contract forbids inventing a figure or committing early", async () => {
    const g = await loadBusinessCaseGuideline();
    const prompt = businessCaseSystemPrompt(g);
    expect(prompt).toContain("=== PLAYBOOK: business-case ===");
    expect(prompt).toContain("=== SKILL: value-sizing ===");
    expect(prompt).toContain("OPERATING CONTRACT");
    expect(prompt).toMatch(/never invent a value figure/i);
    expect(prompt).toMatch(/never 'committed'/i);
  });
});
