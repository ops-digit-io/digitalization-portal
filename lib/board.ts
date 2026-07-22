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

import { STAGES, type Stage } from "./types.js";
import type { RegistryRow } from "./registry.js";
import { boardVisibility, toPublicSummary, type PublicSummary } from "./visibility.js";
import type { Session } from "./rbac.js";

export interface BoardCard extends PublicSummary {
  /** Whole days the use case has been in its current stage, or undefined if unknown. */
  daysInStage?: number;
}

export interface Board {
  columns: Record<Stage, BoardCard[]>;
  /** Use cases flagged needs-attention, surfaced separately for the board alert. */
  needsAttention: BoardCard[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(sinceIso: string | undefined, nowIso: string): number | undefined {
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
}

function matchesFilter(row: RegistryRow, filter: BoardFilter): boolean {
  if (filter.lane && row.lane !== filter.lane) return false;
  if (filter.plant && row.plant !== filter.plant) return false;
  if (filter.domain && row.domain !== filter.domain) return false;
  if (filter.heat && row.heat !== filter.heat) return false;
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
  const needsAttention: BoardCard[] = [];

  for (const row of rows) {
    if (boardVisibility(session, row) === "hidden") continue;
    if (!matchesFilter(row, filter)) continue;

    const card: BoardCard = toPublicSummary(row);
    const days = daysBetween(row.since, now);
    if (days !== undefined) card.daysInStage = days;

    if (row.needsAttention) needsAttention.push(card);
    // Only place in a column if the stage is known; unknown-stage cards still
    // surface via the needs-attention list rather than vanishing.
    if (row.stage) columns[row.stage].push(card);
  }

  return { columns, needsAttention };
}
