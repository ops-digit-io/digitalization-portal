/**
 * The requirements-analysis agent — "the Analyst" — governed at runtime from the
 * git-managed skill & playbook library.
 *
 * Like the intake and portfolio agents, this makes `playbooks/requirements-analysis.md`
 * a REAL agent guideline, not just documentation: the playbook is read from the
 * library and composed into the live model's system prompt, together with the method
 * SKILLS the playbook declares (`skills:` frontmatter) — each loaded dynamically, so
 * adding a skill to the playbook composes it with no code change. On top of the
 * library guidance, code injects the two grounding axes for THIS demand — its business
 * DOMAIN (`domain-knowledge.ts`) and its solution ARCHETYPE (`usecase-archetypes.ts`) —
 * which is what lets the Analyst analyse any type of digital use case, not only the
 * shop-floor domains. The deterministic engine (`lib/requirements.ts`) encodes the
 * same method as the reproducible floor.
 */

import { knowledgeFor } from "../domain-knowledge.js";
import { archetypeById, type UseCaseArchetype } from "../usecase-archetypes.js";
import { loadGoverning, stripFrontmatter } from "./governing.js";
import { loadPlaybook } from "./skills.js";

/** The library playbook that governs this agent's behaviour. */
export const REQUIREMENTS_PLAYBOOK = "requirements-analysis";

export interface GuidelineSkill {
  name: string;
  body: string;
}
export interface RequirementsGuideline {
  /** The playbook markdown (with frontmatter). */
  playbook: string;
  /** The method skills the playbook composes, in declaration order. */
  skills: GuidelineSkill[];
}

/** What governs this agent — surfaced so a route/UI can show (and link) it. */
export async function requirementsGovernedBy(): Promise<{ playbook: string; skills: string[] }> {
  const g = await loadRequirementsGuideline();
  return { playbook: REQUIREMENTS_PLAYBOOK, skills: g.skills.map((s) => s.name) };
}

/**
 * Load the requirements playbook AND every method skill it declares, from the library
 * (registry-first, hot-editable, bundled fallback). The skill list is read from the
 * playbook's `skills:` frontmatter — dynamic, never hardcoded here.
 */
export async function loadRequirementsGuideline(): Promise<RequirementsGuideline> {
  const playbook = await loadGoverning("playbook", REQUIREMENTS_PLAYBOOK);
  const skillNames = loadPlaybook(playbook, REQUIREMENTS_PLAYBOOK).skills;
  const bodies = await Promise.all(skillNames.map((name) => loadGoverning("skill", name)));
  const skills: GuidelineSkill[] = skillNames
    .map((name, i) => ({ name, body: bodies[i] ?? "" }))
    .filter((s) => s.body.trim() !== "");
  return { playbook, skills };
}

/** Render a domain's grounding facts for the prompt. */
function domainBlock(domain: string): string {
  const kb = knowledgeFor(domain);
  return [
    `=== DOMAIN KNOWLEDGE (${kb.domain}) ===`,
    `Personas: ${kb.personas.join(", ")}`,
    `Recurring epics: ${kb.epics.map((e) => e.title).join("; ")}`,
    `Typical NFRs: ${kb.nfrs.map((n) => n.category).join(", ")}`,
    `Data sources: ${kb.dataSources.join(", ")}`,
    `Standards: ${kb.standards.join(", ")}`,
    `Comparable patterns: ${kb.patterns.join("; ")}`,
  ].join("\n");
}

/** Render an archetype's analysis lens for the prompt. */
function archetypeBlock(arch: UseCaseArchetype): string {
  return [
    `=== SOLUTION ARCHETYPE (${arch.label}) ===`,
    arch.summary,
    `Feasibility questions: ${arch.feasibilityQuestions.join(" ")}`,
    `Data prerequisites: ${arch.dataPrerequisites.join("; ")}`,
    `NFRs that matter most: ${arch.typicalNfrs.map((n) => n.category).join(", ")}`,
    `Characteristic risks: ${arch.characteristicRisks.join("; ")}`,
    `Comparable patterns: ${arch.comparablePatterns.join("; ")}`,
  ].join("\n");
}

/**
 * Compose the Analyst's system prompt: the library guidance (playbook + method
 * skills) + the two grounding axes for this case (domain + archetype) + the fixed
 * output contract. Pass the classified archetype (from `classifyArchetype`) so the
 * prompt reasons on the solution shape; omit it to ground on domain alone.
 */
export function requirementsSystemPrompt(
  g: RequirementsGuideline,
  opts: { domain: string; archetypeId?: string },
): string {
  const skillBlocks = g.skills
    .map((s) => `=== SKILL: ${s.name} ===\n${stripFrontmatter(s.body)}`)
    .join("\n\n");
  const arch = opts.archetypeId ? archetypeById(opts.archetypeId) : undefined;

  return [
    "You are the requirements-analysis agent — the Analyst — for the Digitalization Portal. You analyse and enhance a captured demand and derive standardized requirements for ANY kind of digital use case. You draft; a human decides. You never assign a lane, pass a gate, or merge anything.",
    "You operate strictly within the playbook and method skills below — they define how you analyse. Ground every case on BOTH its business domain and its solution archetype.",
    "",
    "=== PLAYBOOK: requirements-analysis ===",
    g.playbook.trim() || "(playbook unavailable — say governance could not be loaded and analyse conservatively.)",
    "",
    skillBlocks,
    "",
    domainBlock(opts.domain),
    "",
    arch ? archetypeBlock(arch) : "=== SOLUTION ARCHETYPE ===\n(Not yet classified — infer the archetype from the demand and apply its lens.)",
    "",
    "=== OUTPUT CONTRACT ===",
    "Produce analysis (domain, refined problem, the solution archetype with its feasibility questions and data prerequisites, comparable patterns, enhancement gaps, personas) and requirements (epics; user stories as 'As a <persona>, I want to <capability>, so that <benefit>' each with individually-checkable Given/When/Then acceptance criteria and a MoSCoW priority; NFRs; assumptions; risks; open questions; out of scope). Keep the standardized section structure and stable ids. Enhance where thin; never fabricate a number — raise it as an open question instead.",
  ].join("\n");
}
