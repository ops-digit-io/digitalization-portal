/**
 * Runs the domain-research agent (`playbooks/domain-research.md`).
 *
 * The agent is free to research public data. Live: the model, governed by the
 * research playbook and using the web-search tool, gathers reference cases,
 * testimonials, benchmarks, and lessons for comparable problems and writes the
 * brief. Offline (or on any failure): a deterministic seed emits the research plan
 * plus the baseline, honestly labelled as having no live sources. Never throws.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DemandAnswers } from "../demand.js";
import { seedResearchBrief, buildResearchMarkdown, type ResearchMeta } from "../research.js";
import { getProvider } from "./provider.js";

async function loadResearchPlaybook(baseDir = process.cwd()): Promise<string> {
  return readFile(join(baseDir, "playbooks/domain-research.md"), "utf8").catch(() => "");
}

function researchSystemPrompt(playbook: string): string {
  return [
    "You are the domain-research agent for Opsphere. Research the demand freely against public data and write a research brief. You draft; a human decides. You pass no gate.",
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
  const provider = getProvider();
  if (provider.live) {
    try {
      const playbook = await loadResearchPlaybook();
      const res = await provider.complete({
        system: researchSystemPrompt(playbook),
        messages: [{ role: "user", content: researchTask(answers) }],
        webSearch: true,
        maxTokens: 1800,
      });
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
