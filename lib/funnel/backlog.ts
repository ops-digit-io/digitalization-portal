/**
 * Backlog ordering — the S2 (shaping) queue a lead triages next.
 *
 * Pure and deterministic (takes `now`, never reads the clock) so it is unit-tested
 * without a store, the same discipline as `assembleBoard`. A backlog is not "every
 * demand" — it is the cases actively being shaped (stage S2, still active), ranked
 * by opportunity (heat) and then by how long they have waited, so the hottest,
 * longest-waiting case sits on top.
 */

import type { RegistryRow } from "../registry.js";
import { daysBetween } from "../board.js";

/** Heat → sort weight (lower sorts first). Unknown/absent heat sinks to the bottom. */
const HEAT_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export interface BacklogItem {
  row: RegistryRow;
  /** Whole days in stage against the supplied `now`, or undefined if unknown. */
  daysInStage?: number;
  /** 1-based position after ranking. */
  rank: number;
}

/**
 * The prioritized shaping backlog: S2 + active rows, ranked by heat (high→low) then
 * days-in-stage (oldest first within a heat band).
 */
export function orderBacklog(rows: readonly RegistryRow[], now: string): BacklogItem[] {
  return rows
    .filter((r) => r.stage === "S2" && (r.status ?? "active") === "active")
    .map((r) => ({ row: r, daysInStage: daysBetween(r.since, now) }))
    .sort((a, b) => {
      const ha = HEAT_RANK[a.row.heat ?? ""] ?? 3;
      const hb = HEAT_RANK[b.row.heat ?? ""] ?? 3;
      if (ha !== hb) return ha - hb;
      return (b.daysInStage ?? 0) - (a.daysInStage ?? 0);
    })
    .map((item, i) => ({ ...item, rank: i + 1 }));
}
