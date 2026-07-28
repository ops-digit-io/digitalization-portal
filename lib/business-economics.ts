/**
 * Business-case ECONOMICS (decision-grade) — turns the value simulation's gross
 * bands and the case's cost model into the numbers a portfolio forum actually
 * decides on: net annual value, payback, ROI, a multi-year cumulative curve, and a
 * discounted NPV. Pure and deterministic (no `Date.now()`, no `Math.random()`), so
 * it replays in a trace and unit-tests exactly.
 *
 * Honesty carries through from the layers below: if the gross value is "to be
 * quantified" the bands are zero and every metric here is zero/undefined — the
 * economics never invent a return the case can't support. Cost that isn't estimated
 * is tracked as "no cost model", not silently assumed to be zero profit.
 *
 * Every figure is at most INDICATIVE (constraint #8) — a projection, never a
 * committed number. That lives in the confidence field on the case, not here.
 */

/** Default appraisal horizon (years) and discount rate for NPV. */
export const DEFAULT_HORIZON_YEARS = 5;
export const DEFAULT_DISCOUNT_RATE = 0.08;

export interface EconomicsInput {
  /** Annual gross value bands from the simulation (downside / expected / base). */
  grossP10: number;
  grossP50: number;
  grossP90: number;
  /** One-off build cost, when estimated. */
  buildCost?: number;
  /** Recurring annual run cost, when estimated. */
  annualRunCost?: number;
  /** Appraisal horizon in years (default 5). */
  horizonYears?: number;
  /** Discount rate for NPV (default 0.08). */
  discountRate?: number;
}

export interface EconomicsBand {
  /** Annual gross value in this band. */
  gross: number;
  /** Annual value net of the recurring run cost. */
  netAnnual: number;
}

export interface Economics {
  horizonYears: number;
  discountRate: number;
  /** Cost used in the arithmetic — 0 when not estimated (see hasCostModel). */
  buildCost: number;
  annualRunCost: number;
  /** True when a build or run cost was actually stated (not "to be estimated"). */
  hasCostModel: boolean;
  /** True when a gross value figure exists (else every metric is zero/undefined). */
  hasValue: boolean;
  p10: EconomicsBand;
  p50: EconomicsBand;
  p90: EconomicsBand;
  /** Years to recover the build cost from the expected (P50) net — undefined when it never pays back or there is no build cost to recover. */
  paybackYears?: number;
  /** Horizon return on the build investment, % — undefined without a build cost. */
  roiPercent?: number;
  /** Undiscounted net over the horizon on the expected case: H·netP50 − build. */
  cumulativeNet: number;
  /** Discounted net present value of the expected case over the horizon. */
  npv: number;
  /** Cumulative undiscounted net by year, index 0 = −build … index H. For a curve. */
  cumulativeByYear: number[];
  /** True when the expected case clears zero NPV over the horizon. */
  viable: boolean;
}

function nonNeg(n: number | undefined): number {
  return n !== undefined && Number.isFinite(n) && n > 0 ? n : 0;
}

function round(n: number): number {
  return Math.round(n);
}

/**
 * Compute the decision metrics. `grossP*` come straight from the value simulation;
 * cost comes from the parsed `## Cost` table. All figures are rounded to whole euros.
 */
export function computeEconomics(input: EconomicsInput): Economics {
  const horizonYears = input.horizonYears && input.horizonYears > 0 ? Math.floor(input.horizonYears) : DEFAULT_HORIZON_YEARS;
  const discountRate = input.discountRate !== undefined && input.discountRate >= 0 ? input.discountRate : DEFAULT_DISCOUNT_RATE;

  const buildCost = nonNeg(input.buildCost);
  const annualRunCost = nonNeg(input.annualRunCost);
  const hasCostModel = input.buildCost !== undefined || input.annualRunCost !== undefined;

  const band = (gross: number): EconomicsBand => ({ gross: round(gross), netAnnual: round(gross - annualRunCost) });
  const p10 = band(input.grossP10);
  const p50 = band(input.grossP50);
  const p90 = band(input.grossP90);
  const hasValue = p90.gross > 0;

  const netP50 = p50.netAnnual;

  // Payback: only meaningful when there is a build cost to recover and the expected
  // net is positive. Otherwise undefined (never a misleading 0 or ∞).
  const paybackYears = buildCost > 0 && netP50 > 0 ? Math.round((buildCost / netP50) * 100) / 100 : undefined;

  // Undiscounted cumulative net over the horizon, and the per-year curve.
  const cumulativeByYear: number[] = [round(-buildCost)];
  for (let year = 1; year <= horizonYears; year++) {
    cumulativeByYear.push(round(-buildCost + netP50 * year));
  }
  const cumulativeNet = cumulativeByYear[cumulativeByYear.length - 1]!;

  // ROI over the horizon on the build investment.
  const roiPercent = buildCost > 0 ? Math.round(((netP50 * horizonYears - buildCost) / buildCost) * 100) : undefined;

  // Discounted NPV: −build + Σ net/(1+r)^t.
  let npv = -buildCost;
  for (let year = 1; year <= horizonYears; year++) {
    npv += netP50 / Math.pow(1 + discountRate, year);
  }
  npv = round(npv);

  return {
    horizonYears,
    discountRate,
    buildCost,
    annualRunCost,
    hasCostModel,
    hasValue,
    p10,
    p50,
    p90,
    ...(paybackYears !== undefined ? { paybackYears } : {}),
    ...(roiPercent !== undefined ? { roiPercent } : {}),
    cumulativeNet,
    npv,
    cumulativeByYear,
    viable: hasValue && npv > 0,
  };
}
