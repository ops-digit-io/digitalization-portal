/**
 * The business-case agent's governance, loaded at runtime from the git-managed library.
 *
 * Mirrors the requirements Analyst: the `business-case` playbook and its method skills
 * ARE the behaviour (dynamic, hot-editable), and code owns only the non-negotiable
 * OPERATING CONTRACT — the honesty frame a value case may never step outside. The
 * deterministic engine (`lib/business-case-draft.ts`) encodes the same method and floor.
 */

import { loadGoverning, stripFrontmatter } from "./governing.js";
import { loadPlaybook } from "./skills.js";

/** The library playbook that governs this agent. */
export const BUSINESS_CASE_PLAYBOOK = "business-case";
/** The file-managed operating contract (editable in the catalog like a playbook). */
export const BUSINESS_CASE_CONTRACT = "business-case";

export interface GuidelineSkill {
  name: string;
  body: string;
}
export interface BusinessCaseGuideline {
  playbook: string;
  skills: GuidelineSkill[];
  /** The operating contract, loaded from the library (`contracts/business-case.md`). */
  contract: string;
}

/** What governs this agent — surfaced so a route/UI can show (and link) it. */
export async function businessCaseGovernedBy(): Promise<{ playbook: string; skills: string[]; contract: string }> {
  const g = await loadBusinessCaseGuideline();
  return { playbook: BUSINESS_CASE_PLAYBOOK, skills: g.skills.map((s) => s.name), contract: BUSINESS_CASE_CONTRACT };
}

/** Load the business-case playbook, its method skills, and its operating contract from the library. */
export async function loadBusinessCaseGuideline(): Promise<BusinessCaseGuideline> {
  const [playbook, contract] = await Promise.all([
    loadGoverning("playbook", BUSINESS_CASE_PLAYBOOK),
    loadGoverning("contract", BUSINESS_CASE_CONTRACT),
  ]);
  const skillNames = loadPlaybook(playbook, BUSINESS_CASE_PLAYBOOK).skills;
  const bodies = await Promise.all(skillNames.map((name) => loadGoverning("skill", name)));
  const skills: GuidelineSkill[] = skillNames
    .map((name, i) => ({ name, body: bodies[i] ?? "" }))
    .filter((s) => s.body.trim() !== "");
  return { playbook, skills, contract };
}

/**
 * Compose the business-case agent's system prompt: the library guidance (playbook +
 * method skills) + the code-owned honesty contract. The contract is deliberately
 * redundant with the playbook — a value case's guardrails must survive an edited
 * playbook.
 */
export function businessCaseSystemPrompt(g: BusinessCaseGuideline): string {
  const skillBlocks = g.skills
    .map((s) => `=== SKILL: ${s.name} ===\n${stripFrontmatter(s.body)}`)
    .join("\n\n");

  return [
    "You are the business-case agent inside the Digitalization Portal. You draft a standardized business case (S3) from a demand and its requirements — baseline, value hypothesis, assumptions, cost — so the portfolio forum can decide at the G3 gate. You draft; a human decides.",
    "You operate STRICTLY within the playbook and skills below. Do not improvise beyond them.",
    "",
    `=== PLAYBOOK: ${BUSINESS_CASE_PLAYBOOK} ===`,
    g.playbook.trim() || "(playbook unavailable — say governance could not be loaded and produce no figure.)",
    "",
    skillBlocks,
    "",
    stripFrontmatter(g.contract) || "=== OPERATING CONTRACT ===\n(contract unavailable — governance could not be loaded; never invent a value figure and never state a committed confidence.)",
  ].join("\n");
}
