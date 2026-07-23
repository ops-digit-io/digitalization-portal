/**
 * Multi-business-case implementation analysis (Feature 2).
 *
 * Answers: over the next quarter or year, what is the WORKLOAD (person-weeks of
 * implementation) and what is the BUSINESS VALUE (risk-discounted value that
 * actually lands within the horizon)? Ranks use cases by value per unit effort,
 * buckets workload and value onset over time, and — if a team capacity is given —
 * flags whether the plan fits.
 *
 * Deterministic and pure (`now`/horizon are inputs). The agent narrates this;
 * the arithmetic lives here.
 */

import type { RegistryRow } from "../registry.js";
import type { Stage } from "../types.js";
import { estimateEffort, horizonValue, riskedAnnualValue } from "./estimate.js";

export type Horizon = "quarter" | "year";
export const HORIZON_WEEKS: Record<Horizon, number> = { quarter: 13, year: 52 };

export interface AnalysisItem {
  id: string;
  title: string;
  stage?: Stage;
  effortWeeks: number;
  goLiveWeeks: number;
  /** Risk-discounted annual run-rate once live. */
  annualValue: number;
  /** Value landing within the horizon. */
  horizonValue: number;
  /** horizonValue per person-week of effort — the ranking signal. */
  valuePerEffort: number;
  /** True if it goes live within the horizon. */
  landsInHorizon: boolean;
}

export interface PeriodBucket {
  label: string;
  endWeek: number;
  /** Person-weeks of implementation work active in this bucket. */
  workloadPersonWeeks: number;
  /** Annualised value run-rate live by the end of this bucket. */
  valueRunRate: number;
}

export interface PortfolioAnalysis {
  horizon: Horizon;
  horizonWeeks: number;
  items: AnalysisItem[];
  ranked: AnalysisItem[];
  totals: {
    count: number;
    totalEffortWeeks: number;
    totalHorizonValue: number;
    landingCount: number;
  };
  timeline: PeriodBucket[];
  capacity?: {
    capacityPersonWeeks: number;
    utilization: number;
    feasible: boolean;
    overCommitmentWeeks: number;
  };
}

const ACTIVE = new Set(["active", undefined]);

/** Overlap of [0, goLive] with (start, end] as a fraction, for spreading effort. */
function effortInWindow(effort: number, goLive: number, start: number, end: number): number {
  if (goLive <= 0) return 0; // already live → no remaining build effort
  const lo = Math.max(0, start);
  const hi = Math.min(goLive, end);
  if (hi <= lo) return 0;
  return effort * ((hi - lo) / goLive);
}

export interface AnalyzeOptions {
  horizon: Horizon;
  parallelism?: number;
  /** Team capacity in person-weeks over the horizon, for feasibility. */
  capacityPersonWeeks?: number;
  /** Number of time buckets in the timeline (default 3 for quarter, 4 for year). */
  buckets?: number;
}

export function analyzePortfolio(rows: readonly RegistryRow[], opts: AnalyzeOptions): PortfolioAnalysis {
  const horizonWeeks = HORIZON_WEEKS[opts.horizon];
  const parallelism = opts.parallelism ?? 1;
  const active = rows.filter((r) => ACTIVE.has(r.status) && r.status !== "parked");

  const items: AnalysisItem[] = active.map((row) => {
    const { effortWeeks, goLiveWeeks } = estimateEffort(row, parallelism);
    const hv = horizonValue(row, horizonWeeks, parallelism);
    return {
      id: row.id,
      title: row.title,
      ...(row.stage ? { stage: row.stage } : {}),
      effortWeeks,
      goLiveWeeks,
      annualValue: riskedAnnualValue(row),
      horizonValue: hv,
      valuePerEffort: effortWeeks > 0 ? Math.round(hv / effortWeeks) : hv,
      landsInHorizon: goLiveWeeks <= horizonWeeks && riskedAnnualValue(row) > 0,
    };
  });

  const ranked = [...items].sort((a, b) => b.valuePerEffort - a.valuePerEffort);

  const totals = {
    count: items.length,
    totalEffortWeeks: Math.round(items.reduce((s, i) => s + i.effortWeeks, 0) * 10) / 10,
    totalHorizonValue: items.reduce((s, i) => s + i.horizonValue, 0),
    landingCount: items.filter((i) => i.landsInHorizon).length,
  };

  const bucketCount = opts.buckets ?? (opts.horizon === "quarter" ? 3 : 4);
  const bucketWeeks = horizonWeeks / bucketCount;
  const timeline: PeriodBucket[] = [];
  for (let b = 0; b < bucketCount; b++) {
    const start = b * bucketWeeks;
    const end = (b + 1) * bucketWeeks;
    const workload = items.reduce(
      (s, i) => s + effortInWindow(i.effortWeeks, i.goLiveWeeks, start, end),
      0,
    );
    const valueRunRate = items.reduce((s, i) => (i.goLiveWeeks <= end ? s + i.annualValue : s), 0);
    timeline.push({
      label: opts.horizon === "quarter" ? `Month ${b + 1}` : `Q${b + 1}`,
      endWeek: Math.round(end),
      workloadPersonWeeks: Math.round(workload * 10) / 10,
      valueRunRate,
    });
  }

  const analysis: PortfolioAnalysis = {
    horizon: opts.horizon,
    horizonWeeks,
    items,
    ranked,
    totals,
    timeline,
  };

  if (opts.capacityPersonWeeks !== undefined) {
    const cap = opts.capacityPersonWeeks;
    analysis.capacity = {
      capacityPersonWeeks: cap,
      utilization: cap > 0 ? Math.round((totals.totalEffortWeeks / cap) * 100) / 100 : 0,
      feasible: totals.totalEffortWeeks <= cap,
      overCommitmentWeeks: Math.max(0, Math.round((totals.totalEffortWeeks - cap) * 10) / 10),
    };
  }

  return analysis;
}
