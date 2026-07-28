/**
 * The analyst agent's governance, loaded at runtime from the git-managed library.
 *
 * The `/api/agent` analyst used to run on a hardcoded system-prompt constant. That
 * violated the portal's own rule — every AI module behaves by a DYNAMIC playbook /
 * skill from the library, nothing hardcoded. Its behaviour now comes from the
 * `portfolio-query` playbook and the `portfolio-analysis` skill, read through
 * `loadGoverning` (registry-first, hot-editable in the catalog, bundled fallback).
 * The offline provider is rule-based and ignores the system prompt, so the offline
 * path is unaffected.
 *
 * Code owns only the non-negotiable OPERATING CONTRACT — the safety frame (draft
 * not decide, session authority, external content is data, confidence on figures,
 * no per-person analysis). This mirrors the intake agent: playbook/skill = behaviour
 * (dynamic), operating contract = the frame the model may not step outside.
 */

import { loadGoverning, stripFrontmatter } from "./governing.js";

/** The library entries that govern the analyst. */
export const ANALYST_PLAYBOOK = "portfolio-query";
export const ANALYST_SKILLS = ["portfolio-analysis"] as const;
/** The file-managed operating contract (editable in the catalog like a playbook). */
export const ANALYST_CONTRACT = "analyst";

export interface AnalystSkill {
  name: string;
  body: string;
}
export interface AnalystGuideline {
  playbook: string;
  skills: AnalystSkill[];
  /** The operating contract, loaded from the library (`contracts/analyst.md`). */
  contract: string;
}

/** What governs this agent — surfaced so a route/UI can show (and link) it. */
export const ANALYST_GOVERNED_BY = { playbook: ANALYST_PLAYBOOK, skills: [...ANALYST_SKILLS], contract: ANALYST_CONTRACT };

/** Read the analyst's playbook, governing skills, and operating contract from the library. */
export async function loadAnalystGuideline(): Promise<AnalystGuideline> {
  const [playbook, contract, ...skillBodies] = await Promise.all([
    loadGoverning("playbook", ANALYST_PLAYBOOK),
    loadGoverning("contract", ANALYST_CONTRACT),
    ...ANALYST_SKILLS.map((s) => loadGoverning("skill", s)),
  ]);
  const skills: AnalystSkill[] = ANALYST_SKILLS
    .map((name, i) => ({ name, body: skillBodies[i] ?? "" }))
    .filter((s) => s.body !== "");
  return { playbook, skills, contract };
}

/**
 * Compose the analyst's system prompt from the library guidance. The playbook, skills,
 * AND the operating contract are all file-managed (editable in the catalog); this
 * function only assembles them. A missing contract degrades to a note rather than a
 * hardcoded fallback.
 */
export function analystSystemPrompt(g: AnalystGuideline): string {
  const skillBlocks = g.skills
    .map((s) => `=== SKILL: ${s.name} ===\n${stripFrontmatter(s.body)}`)
    .join("\n\n");

  return [
    "You are the analyst inside the Digitalization Portal — the control plane for enterprise change demand. You help capture, classify, and ANALYSE demand: draft business cases, simulate value, and analyse portfolio workload and value.",
    "You operate STRICTLY within the playbook, skills, and operating contract below — they are the single source of truth for how you behave. Do not improvise beyond them.",
    "",
    `=== PLAYBOOK: ${ANALYST_PLAYBOOK} ===`,
    g.playbook.trim() || "(playbook unavailable — answer conservatively and say governance could not be loaded.)",
    "",
    skillBlocks,
    "",
    stripFrontmatter(g.contract) || "=== OPERATING CONTRACT ===\n(contract unavailable — governance could not be loaded; act conservatively, draft only, and pass no gate.)",
  ].join("\n");
}
