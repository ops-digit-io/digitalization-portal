import { describe, it, expect } from "vitest";
import { hasRegistryMirror } from "../testing/mirror";
import { loadRequirementsGuideline, requirementsSystemPrompt } from "./requirements-guideline.js";

/**
 * These read the bundled playbook + skills from the working tree (offline path of
 * loadGoverning), so they double as a contract that the Analyst's library files exist
 * and parse, and that the prompt composes both grounding axes.
 */
describe.skipIf(!hasRegistryMirror)("loadRequirementsGuideline", () => {
  it("loads the playbook and composes the method skills it declares", async () => {
    const g = await loadRequirementsGuideline();
    expect(g.playbook).toContain("requirements-analysis");
    const names = g.skills.map((s) => s.name);
    // The playbook's frontmatter declares these; each must resolve to a non-empty body.
    for (const expected of ["usecase-archetypes", "acceptance-criteria", "nfr-catalog", "feasibility-assessment"]) {
      expect(names).toContain(expected);
    }
    for (const s of g.skills) expect(s.body.trim().length).toBeGreaterThan(0);
  });
});

describe.skipIf(!hasRegistryMirror)("requirementsSystemPrompt", () => {
  it("composes playbook + skills + both grounding axes + output contract", async () => {
    const g = await loadRequirementsGuideline();
    const prompt = requirementsSystemPrompt(g, { domain: "finance", archetypeId: "genai_assistant" });

    expect(prompt).toContain("=== PLAYBOOK: requirements-analysis ===");
    expect(prompt).toContain("=== SKILL: usecase-archetypes ===");
    expect(prompt).toContain("=== DOMAIN KNOWLEDGE (finance) ===");
    expect(prompt).toContain("=== SOLUTION ARCHETYPE (GenAI assistant / RAG) ===");
    expect(prompt).toContain("=== OUTPUT CONTRACT ===");
    // The archetype block carries its lens.
    expect(prompt).toMatch(/Feasibility questions:/);
  });

  it("grounds on domain alone when no archetype is given, but still asks for one", async () => {
    const g = await loadRequirementsGuideline();
    const prompt = requirementsSystemPrompt(g, { domain: "quality" });
    expect(prompt).toContain("=== DOMAIN KNOWLEDGE (quality) ===");
    expect(prompt).toMatch(/infer the archetype/i);
  });

  it("resolves domain aliases (data ← analytics)", async () => {
    const g = await loadRequirementsGuideline();
    const prompt = requirementsSystemPrompt(g, { domain: "analytics", archetypeId: "prediction" });
    expect(prompt).toContain("=== DOMAIN KNOWLEDGE (data) ===");
  });
});
