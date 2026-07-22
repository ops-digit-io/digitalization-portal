/**
 * The requirements-analysis agent's guideline, loaded at runtime from the playbook.
 *
 * Like the intake agent, this makes `playbooks/requirements-analysis.md` a real
 * agent guideline and not just documentation: the playbook is read and composed
 * into the live model's system prompt, so a live analysis agent follows the same
 * method the deterministic engine (`lib/requirements.ts`) encodes. Change the
 * playbook → change how the agent analyses.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { knowledgeFor } from "../domain-knowledge.js";

export async function loadRequirementsGuideline(baseDir = process.cwd()): Promise<string> {
  return readFile(join(baseDir, "playbooks/requirements-analysis.md"), "utf8").catch(() => "");
}

/**
 * Compose the analysis agent's system prompt: the playbook + the domain knowledge
 * for this case's domain + the fixed output contract.
 */
export function requirementsSystemPrompt(playbook: string, domain: string): string {
  const kb = knowledgeFor(domain);
  return [
    "You are the requirements-analysis agent for the Digital Unit Portal. You analyse and enhance a captured demand with domain knowledge and derive standardized requirements. You draft; a human decides. You never assign a lane, pass a gate, or merge anything.",
    "You operate strictly by the playbook below — it defines your method.",
    "",
    "=== PLAYBOOK: requirements-analysis ===",
    playbook.trim(),
    "",
    `=== DOMAIN KNOWLEDGE (${kb.domain}) ===`,
    `Personas: ${kb.personas.join(", ")}`,
    `Recurring epics: ${kb.epics.map((e) => e.title).join("; ")}`,
    `Typical NFRs: ${kb.nfrs.map((n) => n.category).join(", ")}`,
    `Data sources: ${kb.dataSources.join(", ")}`,
    `Standards: ${kb.standards.join(", ")}`,
    `Comparable patterns: ${kb.patterns.join("; ")}`,
    "",
    "=== OUTPUT CONTRACT ===",
    "Produce analysis (domain, refined problem, comparable patterns, enhancement gaps, data, standards, personas) and requirements (epics; user stories as 'As a <persona>, I want to <capability>, so that <benefit>' each with Given/When/Then acceptance criteria and a MoSCoW priority; NFRs; assumptions; risks; open questions; out of scope). Keep the standardized section structure. Enhance where thin, never fabricate numbers.",
  ].join("\n");
}
