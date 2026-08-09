/**
 * The autonomy ladder — the framework's payoff, made operational.
 *
 * A lane's `agent-brief` names an `authority_level` on the five-rung ladder. This module
 * turns that word into a policy (what an agent may do at each rung) and a GUARDRAIL: you
 * may not raise a lane to a rung that ACTS (`execute-*`) until its agent-brief is written
 * down — scope, guardrails, escalation and a named human. That is the framework's rule,
 * verbatim: "raise autonomy one lane at a time, only after that lane's context is
 * written." Autonomy is earned per lane, never granted to a department.
 *
 * Pure and dependency-light, so both the policy and the guardrail are unit-tested and
 * the reader (UI) and the writer (authoring) share one definition.
 */

import { AUTHORITY_LEVELS, type AuthorityLevel } from "./model.js";

/** Visual tone per rung — muted at the bottom, warmer as the agent gets more freedom. */
export type RungTone = "muted" | "info" | "recommend" | "warn" | "act";

export interface AuthorityPolicy {
  level: AuthorityLevel;
  /** Position on the ladder, 0 (read-only) … 4 (execute-autonomously). */
  rank: number;
  /** Friendly name for people — e.g. "Execute with approval". */
  label: string;
  /** One plain sentence: what the agent does at this rung. */
  summary: string;
  /** Where the human stays in control — the "You: …" line. */
  human: string;
  /** One line: what an agent may do at this rung (fuller than `summary`). */
  permits: string;
  /** The rung produces an ACTION in the real world (not just words) — where readiness matters. */
  acts: boolean;
  /** The action takes effect only after a human approves it. */
  requiresApproval: boolean;
  /** Consistent colour for the widget and the legend. */
  tone: RungTone;
}

const POLICY: Record<AuthorityLevel, Omit<AuthorityPolicy, "level" | "rank">> = {
  "read-only": {
    label: "Read-only",
    summary: "Looks and reports. It never writes anything.",
    human: "You do all the work; the agent just informs you.",
    permits: "Observe and report only — no drafts, no actions.",
    acts: false,
    requiresApproval: false,
    tone: "muted",
  },
  draft: {
    label: "Draft",
    summary: "Writes a draft for you. Nothing is saved or sent.",
    human: "You decide what to do with the draft — keep it or bin it.",
    permits: "Produce drafts for a human to take or discard. Nothing is persisted as final.",
    acts: false,
    requiresApproval: false,
    tone: "info",
  },
  recommend: {
    label: "Recommend",
    summary: "Proposes a specific next step and argues for it.",
    human: "You accept or reject each recommendation.",
    permits: "Propose a specific recommendation for a human to accept or reject.",
    acts: false,
    requiresApproval: false,
    tone: "recommend",
  },
  "execute-with-approval": {
    label: "Execute with approval",
    summary: "Prepares the real action, but it waits for your yes.",
    human: "You approve before anything takes effect.",
    permits: "Prepare the action; it takes effect only after a human approves it.",
    acts: true,
    requiresApproval: true,
    tone: "warn",
  },
  "execute-autonomously": {
    label: "Execute autonomously",
    summary: "Carries out the action on its own, inside its guardrails.",
    human: "You're notified, not asked — the guardrails are your control.",
    permits: "Carry out the action within its guardrails, without step-by-step approval.",
    acts: true,
    requiresApproval: false,
    tone: "act",
  },
};

/** Tailwind classes per tone — a dot colour and a soft badge, for the widget + legend. */
export const RUNG_TONE: Record<RungTone, { dot: string; badge: string }> = {
  muted: { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  info: { dot: "bg-sky-500", badge: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300" },
  recommend: { dot: "bg-violet-500", badge: "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300" },
  warn: { dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" },
  act: { dot: "bg-rose-500", badge: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300" },
};

/** The tone for a level string, defaulting to muted for an unknown/absent level. */
export function toneFor(level: string | null | undefined): RungTone {
  return level && isAuthorityLevel(level) ? POLICY[level].tone : "muted";
}

export function authorityRank(level: AuthorityLevel): number {
  return AUTHORITY_LEVELS.indexOf(level);
}

/** The policy for a level — what an agent may do there. */
export function authorityPolicy(level: AuthorityLevel): AuthorityPolicy {
  return { level, rank: authorityRank(level), ...POLICY[level] };
}

/** The whole ladder, bottom rung first — for the ladder widget. */
export function authorityLadder(): AuthorityPolicy[] {
  return AUTHORITY_LEVELS.map(authorityPolicy);
}

/** The rung one step up / down, or null at the ends. */
export function nextLevel(level: AuthorityLevel): AuthorityLevel | null {
  const i = authorityRank(level);
  return i >= 0 && i < AUTHORITY_LEVELS.length - 1 ? AUTHORITY_LEVELS[i + 1]! : null;
}
export function prevLevel(level: AuthorityLevel): AuthorityLevel | null {
  const i = authorityRank(level);
  return i > 0 ? AUTHORITY_LEVELS[i - 1]! : null;
}

export function isAuthorityLevel(v: unknown): v is AuthorityLevel {
  return typeof v === "string" && (AUTHORITY_LEVELS as readonly string[]).includes(v);
}

/**
 * The agent-brief completeness a lane must reach before autonomy may ACT. Set to 100
 * deliberately: a scaffolded-but-unfilled brief already scores high on structure alone
 * (the headings are present), so a lower bar would wave an empty brief through. Full
 * completeness is the proxy for "actually filled in" — above all the NAMED HUMAN (the
 * agent-brief's owner), without which an executing agent is a masterless tool.
 */
export const EXECUTE_READINESS = 100;

export interface LaneReadiness {
  /** The agent-brief is present and scored. */
  agentBriefPresent: boolean;
  /** The agent-brief's completeness score, 0..100. */
  agentBriefScore: number;
}

/**
 * May this lane be raised to `target`? The guardrail that makes the ladder safe:
 * - read-only / draft: always (nothing acts, nothing to earn).
 * - recommend: the agent-brief must exist (there must be a brief to recommend from).
 * - execute-*: the agent-brief must be complete (≥ EXECUTE_READINESS) — scope, authority,
 *   guardrails, escalation and a named human all written down — because at these rungs the
 *   agent acts, and it must not act on a brief nobody finished.
 */
export function canRaiseTo(target: AuthorityLevel, ctx: LaneReadiness): { ok: boolean; reason?: string } {
  const rank = authorityRank(target);
  if (rank <= authorityRank("draft")) return { ok: true };
  if (!ctx.agentBriefPresent) {
    return { ok: false, reason: "Write the agent brief first — there must be a brief before a lane can recommend or act." };
  }
  if (rank >= authorityRank("execute-with-approval") && ctx.agentBriefScore < EXECUTE_READINESS) {
    return {
      ok: false,
      reason: `The agent brief must be complete (≥ ${EXECUTE_READINESS}%: scope, authority, guardrails, escalation, a named human) before autonomy may execute. It is at ${ctx.agentBriefScore}%.`,
    };
  }
  return { ok: true };
}

// ------------------------------------------------------------- brief rewrite

/**
 * Set the authority level named in an agent-brief's "Authority level" section — the
 * single source the reader parses back (`authorityLevelOf`). Pure. Replaces the section
 * body with exactly one named level (so the parse is unambiguous), or appends the section
 * if the brief has none.
 */
export function setAuthorityInBrief(source: string, level: AuthorityLevel): string {
  const body = `_This lane runs at \`${level}\`._ ${authorityPolicy(level).permits}`;
  const lines = (source ?? "").split(/\r?\n/);
  const isHeading = (l: string) => /^#{1,6}\s/.test(l);
  const start = lines.findIndex((l) => /^#{1,6}\s+.*authorit/i.test(l));
  if (start === -1) {
    const base = (source ?? "").replace(/\s*$/, "");
    return `${base}\n\n## Authority level\n\n${body}\n`;
  }
  let end = start + 1;
  while (end < lines.length && !isHeading(lines[end]!)) end++;
  const rebuilt = [...lines.slice(0, start + 1), "", body, "", ...lines.slice(end)];
  return rebuilt.join("\n").replace(/\n{3,}/g, "\n\n");
}

export { AUTHORITY_LEVELS, type AuthorityLevel };
