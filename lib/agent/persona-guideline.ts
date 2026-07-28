/**
 * The Persona Analyst's governance, loaded at runtime from the git-managed library.
 *
 * Mirrors the requirements Analyst: the `persona-analysis` playbook and its method
 * skills ARE the behaviour (dynamic, hot-editable in the catalog), and code owns only
 * the non-negotiable OPERATING CONTRACT — here, the ethics frame that a person-
 * profiling tool may never step outside. The deterministic engine (`lib/persona.ts`)
 * encodes the same method and enforces the same guardrails structurally.
 */

import { loadGoverning, stripFrontmatter } from "./governing.js";
import { loadPlaybook } from "./skills.js";

/** The library playbook that governs this agent. */
export const PERSONA_PLAYBOOK = "persona-analysis";
/** The file-managed operating contract (editable in the catalog like a playbook). */
export const PERSONA_CONTRACT = "persona";

export interface GuidelineSkill {
  name: string;
  body: string;
}
export interface PersonaGuideline {
  playbook: string;
  skills: GuidelineSkill[];
  /** The operating contract, loaded from the library (`contracts/persona.md`). */
  contract: string;
}

/** What governs this agent — surfaced so a route/UI can show (and link) it. */
export async function personaGovernedBy(): Promise<{ playbook: string; skills: string[]; contract: string }> {
  const g = await loadPersonaGuideline();
  return { playbook: PERSONA_PLAYBOOK, skills: g.skills.map((s) => s.name), contract: PERSONA_CONTRACT };
}

/** Load the persona playbook, its method skills, and its operating contract from the library. */
export async function loadPersonaGuideline(): Promise<PersonaGuideline> {
  const [playbook, contract] = await Promise.all([
    loadGoverning("playbook", PERSONA_PLAYBOOK),
    loadGoverning("contract", PERSONA_CONTRACT),
  ]);
  const skillNames = loadPlaybook(playbook, PERSONA_PLAYBOOK).skills;
  const bodies = await Promise.all(skillNames.map((name) => loadGoverning("skill", name)));
  const skills: GuidelineSkill[] = skillNames
    .map((name, i) => ({ name, body: bodies[i] ?? "" }))
    .filter((s) => s.body.trim() !== "");
  return { playbook, skills, contract };
}

/**
 * Compose the Persona Analyst's system prompt: the library guidance (playbook + method
 * skills + operating contract). All three are file-managed (editable in the catalog);
 * this only assembles them. A missing contract degrades to a note.
 */
export function personaSystemPrompt(g: PersonaGuideline): string {
  const skillBlocks = g.skills
    .map((s) => `=== SKILL: ${s.name} ===\n${stripFrontmatter(s.body)}`)
    .join("\n\n");

  return [
    "You are the Persona Analyst inside the Digitalization Portal. You screen a requestor's own demands and build a service-oriented understanding of their role, jobs, daily workflows, and the digitalization they need — so the Digital Unit can serve them better. You also surface aggregate cohort patterns across requestor groups.",
    "You operate STRICTLY within the playbook, skills, and operating contract below. Do not improvise beyond them.",
    "",
    `=== PLAYBOOK: ${PERSONA_PLAYBOOK} ===`,
    g.playbook.trim() || "(playbook unavailable — say governance could not be loaded and do nothing that profiles a person.)",
    "",
    skillBlocks,
    "",
    stripFrontmatter(g.contract) || "=== OPERATING CONTRACT ===\n(contract unavailable — governance could not be loaded; do nothing that ranks, scores, or profiles a person.)",
  ].join("\n");
}
