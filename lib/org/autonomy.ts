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

// ------------------------------------------------- control surface (the OT axis)

/**
 * WHERE THE CONSEQUENCE LANDS — a second axis, orthogonal to the ladder.
 *
 * The ladder answers "how far may the agent go?". It does not answer "how far
 * does the result travel?", and for production those are different questions. An
 * agent at `execute-autonomously` that files a ticket and one that moves a
 * machine parameter sit on the same rung and are not the same risk.
 *
 * Deliberately NOT a sixth rung. A closed loop is not "more autonomous than
 * autonomous" — it is the same autonomy pointed at something physical. Adding a
 * rung would also break `authorityLadder()`'s ordering, `canRaiseTo`'s
 * thresholds, and fifteen already-translated `autonomy.*` keys across ten
 * locales, for a distinction that is not ordinal in the first place.
 *
 * Crossing the two axes yields the vocabulary the production world already uses,
 * derived rather than declared:
 *
 *   recommend             × setpoint = an operator assistance system
 *   execute-with-approval × setpoint = a SEMI-AUTONOMOUS control loop
 *   execute-autonomously  × setpoint = an AUTONOMOUS control loop
 */
export const CONTROL_SURFACES = ["advice", "record", "ticket", "setpoint"] as const;
export type ControlSurface = (typeof CONTROL_SURFACES)[number];

export interface SurfacePolicy {
  surface: ControlSurface;
  /** 0…3. Higher means the consequence travels further from the screen. */
  reach: number;
  label: string;
  /** One line: what actually changes in the world. */
  lands: string;
  /** The consequence is physical — it changes what a machine does. */
  physical: boolean;
}

const SURFACE: Record<ControlSurface, Omit<SurfacePolicy, "surface" | "reach">> = {
  advice: {
    label: "Advice",
    lands: "A human reads it. Nothing outside the conversation changes.",
    physical: false,
  },
  record: {
    label: "Record",
    lands: "A portal artifact changes — a draft, an analysis, a business case.",
    physical: false,
  },
  ticket: {
    label: "Ticket",
    lands: "A system of record changes — a work order, an incident, a maintenance call.",
    physical: false,
  },
  setpoint: {
    label: "Setpoint",
    lands: "A process parameter on a machine changes. Material is made differently.",
    physical: true,
  },
};

export const SURFACE_POLICY: Record<ControlSurface, SurfacePolicy> = Object.fromEntries(
  CONTROL_SURFACES.map((s, i) => [s, { surface: s, reach: i, ...SURFACE[s] }]),
) as Record<ControlSurface, SurfacePolicy>;

export function isControlSurface(v: unknown): v is ControlSurface {
  return typeof v === "string" && (CONTROL_SURFACES as readonly string[]).includes(v);
}

export function surfacePolicy(surface: ControlSurface): SurfacePolicy {
  return SURFACE_POLICY[surface];
}

/**
 * What a lane at `level` acting on `surface` IS, in the words the plant uses.
 * Returns undefined where the combination has no established name.
 */
export function loopKind(level: AuthorityLevel, surface: ControlSurface): string | undefined {
  if (surface !== "setpoint") return undefined;
  if (level === "recommend") return "operator assistance system";
  if (level === "execute-with-approval") return "semi-autonomous control loop";
  if (level === "execute-autonomously") return "autonomous control loop";
  return undefined;
}

/**
 * The three things a brief must carry before an agent may move a setpoint. These
 * are not paperwork: each answers a question the plant will ask on the first bad
 * shift, and "we'll work it out then" is not an answer at 3am.
 */
export interface SafetyCase {
  /** The bounded range the agent may move within — outside it, it may not act at all. */
  envelope: boolean;
  /** What the machine does when the agent stops. Silence is not a fallback. */
  fallback: boolean;
  /** The watched condition that halts the loop, and who is told. */
  abortCondition: boolean;
}

export interface SurfaceReadiness extends LaneReadiness {
  safety?: Partial<SafetyCase>;
}

const SAFETY_LABEL: Record<keyof SafetyCase, string> = {
  envelope: "a bounded envelope (the range it may move within)",
  fallback: "a named fallback (what the machine does when the agent stops)",
  abortCondition: "a watched abort condition (what halts the loop, and who is told)",
};

/** Which parts of the safety case are missing, in a stable order. */
export function missingSafetyCase(safety: Partial<SafetyCase> | undefined): (keyof SafetyCase)[] {
  const s = safety ?? {};
  return (["envelope", "fallback", "abortCondition"] as (keyof SafetyCase)[]).filter((k) => s[k] !== true);
}

/**
 * May a lane at `level` act on `surface`?
 *
 * Composed WITH `canRaiseTo`, never instead of it: the ladder still decides
 * whether the lane may act at all, and this only narrows further. So the rule
 * reads as one sentence — autonomy is earned per lane, a closed loop is earned
 * per surface.
 *
 * Non-acting rungs pass trivially: an agent that only drafts cannot move a
 * setpoint no matter what surface its brief names.
 */
export function canActOn(
  level: AuthorityLevel,
  surface: ControlSurface,
  ctx: SurfaceReadiness,
): { ok: boolean; reason?: string } {
  // The ladder first — it is the broader gate and its refusal is the honest one.
  const ladder = canRaiseTo(level, ctx);
  if (!ladder.ok) return ladder;

  // Nothing acts below execute-*, so no surface can be reached.
  if (!authorityPolicy(level).acts) return { ok: true };

  if (!surfacePolicy(surface).physical) return { ok: true };

  const missing = missingSafetyCase(ctx.safety);
  if (missing.length > 0) {
    const kind = loopKind(level, surface) ?? "control loop";
    return {
      ok: false,
      reason:
        `This lane would be ${a(kind)}: it moves a process parameter on a machine. ` +
        `Before it may, the agent brief must carry ${missing.map((m) => SAFETY_LABEL[m]).join(", ")}. ` +
        `A complete brief earns autonomy; it does not by itself earn a machine.`,
    };
  }
  return { ok: true };
}

function a(noun: string): string {
  return /^[aeiou]/i.test(noun) ? `an ${noun}` : `a ${noun}`;
}

/**
 * Set the control surface named in an agent-brief's "Control surface" section —
 * the mirror of `setAuthorityInBrief`, and read back by `controlSurfaceOf`.
 */
export function setControlSurfaceInBrief(source: string, surface: ControlSurface): string {
  const p = surfacePolicy(surface);
  const body = `_This lane acts on \`${surface}\`._ ${p.lands}`;
  const lines = (source ?? "").split(/\r?\n/);
  const isHeading = (l: string) => /^#{1,6}\s/.test(l);
  const start = lines.findIndex((l) => /^#{1,6}\s+.*(control surface|wirkfläche|steuerfläche)/i.test(l));
  if (start === -1) {
    const base = (source ?? "").replace(/\s*$/, "");
    return `${base}\n\n## Control surface\n\n${body}\n`;
  }
  let end = start + 1;
  while (end < lines.length && !isHeading(lines[end]!)) end++;
  return [...lines.slice(0, start + 1), "", body, "", ...lines.slice(end)].join("\n").replace(/\n{3,}/g, "\n\n");
}

/**
 * Read a brief's control surface back. Mirrors `authorityLevelOf` in
 * `scaffold.ts`, INCLUDING its ambiguity rule: exactly one distinct surface word
 * in the document resolves; two or none does not. Prose that mentions several
 * must not silently pick one.
 */
export function controlSurfaceOf(source: string | undefined): ControlSurface | null {
  const hits = new Set(
    [...(source ?? "").matchAll(/\b(advice|record|ticket|setpoint)\b/gi)].map((m) => m[1]!.toLowerCase()),
  );
  if (hits.size !== 1) return null;
  const only = [...hits][0]!;
  return isControlSurface(only) ? only : null;
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
