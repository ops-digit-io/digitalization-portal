/**
 * Review-digest rules — which demands need a human to look at them, and why.
 *
 * PURE: `selectDigestItems(demands, now, config?)` takes normalized demand facts +
 * an injected `now` and returns the flagged items. No IO, no `Date.now()` — so it
 * is deterministic and unit-tested like `lib/board.ts` (frozen `NOW` + fixtures).
 *
 * Design principle (docs/05-lanes-and-triage.md): **surface, don't enforce** — the
 * digest flags; the forum judges. Reuses the board's staleness primitives.
 */

import { daysBetween, STALL_DAYS } from "../board.js";
import { STAGES, type Stage, type RecordRole } from "../types.js";

/** Why a demand is on the digest. */
export type DigestReason = "stalled" | "past_review" | "missing_owner" | "drift" | "parked_overdue";

export type Severity = "high" | "medium" | "low";

export interface Accountable {
  role: RecordRole;
  person: string;
}

/** Normalized per-demand facts the rules need (built by the service from git). */
export interface DigestDemand {
  id: string;
  title: string;
  stage?: Stage;
  lane?: string;
  plant?: string;
  status?: string; // active | parked | killed | retired
  /** ISO date the demand entered its current stage (or was created). */
  since?: string;
  /** ISO review date (from the demand State or its business case). */
  reviewOn?: string;
  /** True when the source README couldn't be parsed cleanly. */
  needsAttention?: boolean;
  /** Named accountable people from `## People` (role → person). */
  people: Partial<Record<RecordRole, string>>;
}

export interface DigestItem {
  id: string;
  title: string;
  stage?: Stage;
  lane?: string;
  plant?: string;
  reasons: DigestReason[];
  /** Days in the current stage. */
  ageDays?: number;
  /** Days past the review date (only when past_review). */
  overdueDays?: number;
  accountable: Accountable[];
  severity: Severity;
}

export interface DigestConfig {
  /** Stall threshold override; defaults to the board's STALL_DAYS (30). */
  stallDays?: number;
}

const SEVERITY_OF: Record<DigestReason, Severity> = {
  drift: "high",
  missing_owner: "high",
  past_review: "medium",
  stalled: "medium",
  parked_overdue: "low",
};
const SEVERITY_RANK: Record<Severity, number> = { high: 3, medium: 2, low: 1 };

function isActive(status?: string): boolean {
  return (status ?? "active") === "active";
}

/** Whole days `reviewOn` is in the past relative to `now` (>=0), else undefined. */
function overdueDays(reviewOn: string | undefined, nowIso: string): number | undefined {
  if (!reviewOn) return undefined;
  const r = Date.parse(reviewOn);
  const n = Date.parse(nowIso);
  if (Number.isNaN(r) || Number.isNaN(n)) return undefined;
  const days = Math.floor((n - r) / (24 * 60 * 60 * 1000));
  return days >= 0 ? days : undefined; // undefined = review date still in the future
}

/** The people to nudge for a demand — named owners first, then requester. */
function accountableFor(people: Partial<Record<RecordRole, string>>): Accountable[] {
  const order: RecordRole[] = ["sponsor", "value_owner", "requester", "lead", "business_owner", "delivery_lead", "run_owner"];
  const out: Accountable[] = [];
  for (const role of order) {
    const person = people[role]?.trim();
    if (person) out.push({ role, person });
  }
  return out;
}

/**
 * Flag the demands that need attention. One item per flagged demand, carrying every
 * reason that applies and the highest severity among them.
 */
export function selectDigestItems(demands: readonly DigestDemand[], nowIso: string, config: DigestConfig = {}): DigestItem[] {
  const stallDays = config.stallDays ?? STALL_DAYS;
  const items: DigestItem[] = [];

  for (const d of demands) {
    const reasons: DigestReason[] = [];
    const ageDays = daysBetween(d.since, nowIso);
    const overdue = overdueDays(d.reviewOn, nowIso);
    const stageIdx = d.stage ? STAGES.indexOf(d.stage) : -1;
    const atOrAfterS3 = stageIdx >= STAGES.indexOf("S3");

    // Drift: an unreadable record — highest priority, someone must fix the data.
    if (d.needsAttention) reasons.push("drift");

    // Stalled: active and sitting in its stage past the threshold.
    if (isActive(d.status) && ageDays !== undefined && ageDays > stallDays) reasons.push("stalled");

    // Past its review date (the 12-week business-case horizon, or any set review date).
    if (isActive(d.status) && overdue !== undefined) reasons.push("past_review");

    // Missing accountability once it's a real DU-owned case (G3+).
    if (isActive(d.status) && atOrAfterS3 && (!d.people.sponsor?.trim() || !d.people.value_owner?.trim())) {
      reasons.push("missing_owner");
    }

    // Parked but overdue for its re-review.
    if ((d.status ?? "") === "parked" && overdue !== undefined) reasons.push("parked_overdue");

    if (reasons.length === 0) continue;

    const severity = reasons.reduce<Severity>((max, r) => (SEVERITY_RANK[SEVERITY_OF[r]] > SEVERITY_RANK[max] ? SEVERITY_OF[r] : max), "low");
    items.push({
      id: d.id,
      title: d.title,
      ...(d.stage ? { stage: d.stage } : {}),
      ...(d.lane ? { lane: d.lane } : {}),
      ...(d.plant ? { plant: d.plant } : {}),
      reasons,
      ...(ageDays !== undefined ? { ageDays } : {}),
      ...(overdue !== undefined ? { overdueDays: overdue } : {}),
      accountable: accountableFor(d.people),
      severity,
    });
  }

  // Most urgent first, then longest-waiting.
  return items.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || (b.ageDays ?? 0) - (a.ageDays ?? 0));
}

export const REASON_LABEL: Record<DigestReason, string> = {
  stalled: "Stalled in stage",
  past_review: "Past review date",
  missing_owner: "Missing sponsor / value owner",
  drift: "Unreadable record",
  parked_overdue: "Parked past re-review",
};
