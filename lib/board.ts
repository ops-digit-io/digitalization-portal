/**
 * Board assembly (`docs/16-ui.md §16.5 Board`, `docs/12-architecture.md §12.9`).
 *
 * Turns registry rows into stage-columned board data, redaction-filtered
 * server-side (never client-side — NFR-3). Board cards carry only
 * portfolio-transparent fields; restricted content is never on a card.
 *
 * `daysInStage` is computed here from `since` against a caller-supplied `now`, so
 * this stays pure and deterministic (no `Date.now()` inside). Days in stage is
 * the field that makes stalling visible, so it is always present, never hidden.
 */

import { STAGES, type Stage, type Gate } from "./types.js";
import type { RegistryRow } from "./registry.js";
import { boardVisibility, toPublicSummary, type PublicSummary } from "./visibility.js";
import type { Session } from "./rbac.js";

export interface BoardCard extends PublicSummary {
  /** Whole days the use case has been in its current stage, or undefined if unknown. */
  daysInStage?: number;
  /** True when an active card has sat in its stage past the stall threshold. */
  stalled?: boolean;
  /** The gate this case is working toward (derived from its state). */
  targetGate?: Gate;
  /** Whether the case meets the criteria to open its next gate (viewer-independent). */
  nextGateReady?: boolean;
}

export interface BoardSummary {
  /** All visible cards after filtering (placed + needs-attention). */
  total: number;
  active: number;
  parked: number;
  killed: number;
  /** Active cards over the stall threshold. */
  stalled: number;
  needsAttention: number;
}

export interface Board {
  columns: Record<Stage, BoardCard[]>;
  /** Every visible card after filtering, for grouping by any dimension. */
  cards: BoardCard[];
  /** Use cases flagged needs-attention, surfaced separately for the board alert. */
  needsAttention: BoardCard[];
  summary: BoardSummary;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Days in a stage past which an active use case is flagged as stalled. */
export const STALL_DAYS = 30;

/** Whole days between an ISO instant and `now`; undefined if unparseable, clamped ≥ 0. */
export function daysBetween(sinceIso: string | undefined, nowIso: string): number | undefined {
  if (!sinceIso) return undefined;
  const since = Date.parse(sinceIso);
  const now = Date.parse(nowIso);
  if (Number.isNaN(since) || Number.isNaN(now)) return undefined;
  const days = Math.floor((now - since) / MS_PER_DAY);
  return days >= 0 ? days : 0;
}

function emptyColumns(): Record<Stage, BoardCard[]> {
  const cols = {} as Record<Stage, BoardCard[]>;
  for (const s of STAGES) cols[s] = [];
  return cols;
}

export interface BoardFilter {
  lane?: string;
  plant?: string;
  domain?: string;
  heat?: string;
  status?: string;
  /** Free-text search over id + title. */
  q?: string;
}

function matchesFilter(row: RegistryRow, filter: BoardFilter): boolean {
  if (filter.lane && row.lane !== filter.lane) return false;
  if (filter.plant && row.plant !== filter.plant) return false;
  if (filter.domain && row.domain !== filter.domain) return false;
  if (filter.heat && row.heat !== filter.heat) return false;
  if (filter.status && (row.status ?? "active") !== filter.status) return false;
  if (filter.q && !`${row.id} ${row.title}`.toLowerCase().includes(filter.q.toLowerCase())) return false;
  return true;
}

/**
 * Assemble the board for a session. Rows the session may not see are dropped
 * (confidential without view_all); everything else appears as a redacted card in
 * its stage column. `now` is the reference instant for stage-age (ISO string).
 */
export function assembleBoard(
  rows: readonly RegistryRow[],
  session: Session,
  now: string,
  filter: BoardFilter = {},
): Board {
  const columns = emptyColumns();
  const cards: BoardCard[] = [];
  const needsAttention: BoardCard[] = [];
  const summary: BoardSummary = { total: 0, active: 0, parked: 0, killed: 0, stalled: 0, needsAttention: 0 };

  for (const row of rows) {
    if (boardVisibility(session, row) === "hidden") continue;
    if (!matchesFilter(row, filter)) continue;

    const card: BoardCard = toPublicSummary(row);
    const days = daysBetween(row.since, now);
    if (days !== undefined) card.daysInStage = days;
    const status = row.status ?? "active";
    if (status === "active" && days !== undefined && days > STALL_DAYS) card.stalled = true;
    // Next-gate readiness is a derived, non-identifying signal (boolean + gate id) —
    // the same verdict the detail page shows any viewer, so portfolio-transparent.
    if (row.targetGate) card.targetGate = row.targetGate;
    if (row.nextGateReady) card.nextGateReady = true;

    cards.push(card);
    summary.total += 1;
    if (status === "active") summary.active += 1;
    if (status === "parked") summary.parked += 1;
    if (status === "killed") summary.killed += 1;
    if (card.stalled) summary.stalled += 1;

    if (row.needsAttention) { needsAttention.push(card); summary.needsAttention += 1; }
    // Only place in a column if the stage is known; unknown-stage cards still
    // surface via the needs-attention list rather than vanishing.
    if (row.stage) columns[row.stage].push(card);
  }

  return { columns, cards, needsAttention, summary };
}
