/**
 * Implementation-effort and horizon-value estimation (Feature 2).
 *
 * Transparent heuristics, stated rather than hidden — in the spirit of the value
 * model ("every figure names its basis"). The agent can refine these per use
 * case; this module is the defensible deterministic baseline the UI and the
 * portfolio analysis build on.
 *
 * Effort is person-weeks remaining to carry a use case from its current stage to
 * steady operations. Value within a horizon depends on WHEN it goes live: a use
 * case still in assessment realises nothing this quarter.
 */

import type { Stage } from "../types.js";
import type { RegistryRow } from "../registry.js";

/** Person-weeks to exit each stage (pass its gate). S8 has no exit. */
export const EFFORT_TO_EXIT: Record<Stage, number> = {
  S1: 0.5, S2: 1, S3: 2, S4: 4, S5: 6, S6: 5, S7: 8, S8: 0,
};
const STAGE_ORDER: Stage[] = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];

export const LEVEL_MULTIPLIER = { L1: 1.4, L2: 1.0 } as const;
export const HEAT_MULTIPLIER = { high: 1.15, medium: 1.0, low: 0.9 } as const;

/** Confidence discount applied to projected value, inferred from stage. */
export function stageConfidenceDiscount(stage: Stage | undefined): number {
  if (!stage) return 0.3;
  if (stage === "S8") return 1.0; // realized
  if (stage >= "S5") return 0.85; // committed (S5–S7)
  if (stage >= "S3") return 0.6; // indicative (S3–S4)
  return 0.3; // hypothesis (S1–S2)
}

/** Person-weeks remaining from the current stage through S7 exit (i.e. to go-live). */
export function remainingEffortWeeks(stage: Stage | undefined): number {
  if (!stage) return EFFORT_TO_EXIT.S1; // unknown → assume earliest
  const from = STAGE_ORDER.indexOf(stage);
  if (from < 0) return 0;
  let sum = 0;
  for (let i = from; i < STAGE_ORDER.length; i++) sum += EFFORT_TO_EXIT[STAGE_ORDER[i]!];
  return sum;
}

export interface EffortEstimate {
  /** Person-weeks of remaining implementation work (the workload). */
  effortWeeks: number;
  /** Calendar weeks until value begins (schedule = effort / parallelism). */
  goLiveWeeks: number;
}

export function estimateEffort(row: RegistryRow, parallelism = 1): EffortEstimate {
  const base = remainingEffortWeeks(row.stage);
  const level = row.level ? LEVEL_MULTIPLIER[row.level] : 1;
  const heat = row.heat ? HEAT_MULTIPLIER[row.heat] : 1;
  const effortWeeks = Math.round(base * level * heat * 10) / 10;
  const goLiveWeeks = row.stage === "S8" ? 0 : Math.round((effortWeeks / Math.max(1, parallelism)) * 10) / 10;
  return { effortWeeks, goLiveWeeks };
}

/** Annualised value the use case would run at once live, risk-discounted. */
export function riskedAnnualValue(row: RegistryRow): number {
  const annual = row.stage === "S8" && row.valueRealized !== undefined ? row.valueRealized : row.valueProjected;
  if (annual === undefined) return 0;
  return Math.round(annual * stageConfidenceDiscount(row.stage));
}

/** Value realised WITHIN a horizon (weeks), given the go-live schedule. */
export function horizonValue(row: RegistryRow, horizonWeeks: number, parallelism = 1): number {
  const { goLiveWeeks } = estimateEffort(row, parallelism);
  const liveWeeks = Math.max(0, Math.min(horizonWeeks, horizonWeeks - goLiveWeeks));
  const annual = riskedAnnualValue(row);
  return Math.round(annual * (liveWeeks / 52));
}
