/**
 * Runs the domain-research agent (`playbooks/domain-research.md`).
 *
 * The agent is free to research public data. Live: the model, governed by the
 * research playbook and using the web-search tool, gathers reference cases,
 * testimonials, benchmarks, and lessons for comparable problems and writes the
 * brief. Offline (or on any failure): a deterministic seed emits the research plan
 * plus the baseline, honestly labelled as having no live sources. Never throws.
 */

import type { DemandAnswers } from "../demand.js";
import { seedResearchBrief, buildResearchMarkdown, type ResearchMeta } from "../research.js";
import { resolveProvider } from "../model-settings.js";
import { recordUsage } from "../usage-meter.js";
import { loadGoverning } from "./governing.js";

/** The library playbook that governs this agent's behaviour. */
export const RESEARCH_PLAYBOOK = "domain-research";

/** Load the research playbook dynamically from the library (registry, then bundled). */
async function loadResearchPlaybook(): Promise<string> {
  return loadGoverning("playbook", RESEARCH_PLAYBOOK);
}

function researchSystemPrompt(playbook: string): string {
  return [
    "You are the domain-research agent for the Digitalization Portal. Research the demand freely against public data and write a research brief. You draft; a human decides. You pass no gate.",
    "You operate strictly by the playbook below — it defines what to research and how to source it. Use the web_search tool to gather real, cited evidence. Never fabricate a case or a citation; a gap is a finding.",
    "",
    "=== PLAYBOOK: domain-research ===",
    playbook.trim(),
    "",
    "=== OUTPUT ===",
    "Write the brief as markdown with these sections in order: Problem class; Reference cases (comparable implementations, each with a source); Testimonials (quoted, with source); Comparable patterns; Benchmarks; Standards & compliance; Common pitfalls & lessons learned; Sources (every link/citation used). Cite everything.",
  ].join("\n");
}

function researchTask(answers: DemandAnswers): string {
  return [
    "Research this demand and write the brief:",
    `- Problem: ${answers.problem}`,
    `- Desired outcome: ${answers.desiredOutcome}`,
    `- Domain: ${answers.domain || "(infer it)"}`,
    `- Context: ${answers.affectedProcess} ${answers.frequencyScale} ${answers.constraints}`.trim(),
    "Find real, comparable reference cases and testimonials from public sources, with citations.",
  ].join("\n");
}

/** Produce research.md for a demand — live public research when possible, else the seed. */
export async function runResearch(answers: DemandAnswers, meta: ResearchMeta): Promise<{ markdown: string; live: boolean }> {
  const provider = await resolveProvider();
  if (provider.live) {
    try {
      const playbook = await loadResearchPlaybook();
      const res = await provider.complete({
        system: researchSystemPrompt(playbook),
        messages: [{ role: "user", content: researchTask(answers) }],
        webSearch: true,
        // Reading several search results and writing a brief from them is the
        // one place here where thinking earns its budget, so effort is left at
        // the model's default — but the ceiling has to cover the searching, the
        // reasoning AND the brief, which 1 800 did not.
        maxTokens: 4000,
      });
      await recordUsage({ feature: "research", provider: provider.name, model: provider.model, usage: res.usage });
      const text = res.text?.trim();
      if (text) {
        const header = `# Research · ${meta.id} · ${meta.title}\n\n> Domain research via public sources, gathered by the research agent on ${meta.generatedOn}. External findings — verify before relying on them.\n\n`;
        return { markdown: header + text + "\n", live: true };
      }
    } catch {
      /* fall through to the seed */
    }
  }
  return { markdown: buildResearchMarkdown(meta, seedResearchBrief(answers)), live: false };
}
