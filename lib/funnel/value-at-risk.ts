/**
 * Value at risk — pipeline value the portfolio may lose if it keeps waiting.
 *
 * A pipeline case (S3–S4) carries indicative `valueProjected` from its business
 * case. When such a case stalls (past `STALL_DAYS` in stage), that value is at
 * risk of evaporating — the opportunity ages out. This surfaces the number and the
 * cases behind it so a lead can act before it slips.
 *
 * Pure and deterministic (takes `now`, never reads the clock), computed over
 * `RegistryRow[]` — board cards deliberately don't carry `valueProjected` (it's
 * restricted content), so the sum stays on the server-side row model.
 */

import type { RegistryRow } from "../registry.js";
import { daysBetween, STALL_DAYS } from "../board.js";

/** Stages whose value is "pipeline" (indicative), matching the Value Cockpit. */
const PIPELINE_STAGES = new Set(["S3", "S4"]);

export interface AtRiskCase {
  id: string;
  title: string;
  stage?: RegistryRow["stage"];
  plant?: string;
  daysInStage?: number;
  valueProjected: number;
}

export interface ValueAtRisk {
  /** Total projected € across the at-risk cases. */
  total: number;
  cases: AtRiskCase[];
}

/**
 * Pipeline value (S3–S4, `valueProjected`) held in ACTIVE cases stalled past the
 * stall threshold, most valuable first.
 */
export function valueAtRisk(rows: readonly RegistryRow[], now: string): ValueAtRisk {
  const cases: AtRiskCase[] = [];
  for (const r of rows) {
    if (!r.stage || !PIPELINE_STAGES.has(r.stage)) continue;
    if ((r.status ?? "active") !== "active") continue;
    const value = r.valueProjected ?? 0;
    if (value <= 0) continue;
    const days = daysBetween(r.since, now);
    if (days === undefined || days <= STALL_DAYS) continue;
    cases.push({
      id: r.id,
      title: r.title,
      ...(r.stage ? { stage: r.stage } : {}),
      ...(r.plant ? { plant: r.plant } : {}),
      daysInStage: days,
      valueProjected: value,
    });
  }
  cases.sort((a, b) => b.valueProjected - a.valueProjected);
  return { total: cases.reduce((s, c) => s + c.valueProjected, 0), cases };
}
