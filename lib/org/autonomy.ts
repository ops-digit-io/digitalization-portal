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

export interface AuthorityPolicy {
  level: AuthorityLevel;
  /** Position on the ladder, 0 (read-only) … 4 (execute-autonomously). */
  rank: number;
  label: string;
  /** One line: what an agent may do at this rung. */
  permits: string;
  /** The rung produces an ACTION (not just words) — the point where readiness matters. */
  acts: boolean;
  /** The action takes effect only after a human approves it. */
  requiresApproval: boolean;
}

const POLICY: Record<AuthorityLevel, Omit<AuthorityPolicy, "level" | "rank">> = {
  "read-only": {
    label: "Read-only",
    permits: "Observe and report only — no drafts, no actions.",
    acts: false,
    requiresApproval: false,
  },
  draft: {
    label: "Draft",
    permits: "Produce drafts for a human to take or discard. Nothing is persisted as final.",
    acts: false,
    requiresApproval: false,
  },
  recommend: {
    label: "Recommend",
    permits: "Propose a specific recommendation for a human to accept or reject.",
    acts: false,
    requiresApproval: false,
  },
  "execute-with-approval": {
    label: "Execute with approval",
    permits: "Prepare the action; it takes effect only after a human approves it.",
    acts: true,
    requiresApproval: true,
  },
  "execute-autonomously": {
    label: "Execute autonomously",
    permits: "Carry out the action within its guardrails, without step-by-step approval.",
    acts: true,
    requiresApproval: false,
  },
};

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
