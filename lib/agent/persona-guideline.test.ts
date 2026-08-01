import { describe, it, expect } from "vitest";
import { hasRegistryMirror } from "../testing/mirror";
import { loadPersonaGuideline, personaSystemPrompt } from "./persona-guideline.js";

/** Reads the bundled playbook + skills from the working tree — doubles as a contract
 *  that the Persona Analyst's library files exist, parse, and carry the ethics frame. */
describe.skipIf(!hasRegistryMirror)("persona guideline", () => {
  it("loads the playbook and composes its method skills", async () => {
    const g = await loadPersonaGuideline();
    expect(g.playbook).toContain("persona-analysis");
    const names = g.skills.map((s) => s.name);
    expect(names).toContain("persona-screening");
    for (const s of g.skills) expect(s.body.trim().length).toBeGreaterThan(0);
  });

  it("composes a prompt whose non-negotiable contract forbids ranking/scoring people", async () => {
    const g = await loadPersonaGuideline();
    const prompt = personaSystemPrompt(g);
    expect(prompt).toContain("=== PLAYBOOK: persona-analysis ===");
    expect(prompt).toContain("=== SKILL: persona-screening ===");
    expect(prompt).toContain("OPERATING CONTRACT");
    expect(prompt).toMatch(/never rank, compare, or single out individuals/i);
    expect(prompt).toMatch(/descriptive, never evaluative/i);
    expect(prompt).toMatch(/aggregate/i);
  });
});
