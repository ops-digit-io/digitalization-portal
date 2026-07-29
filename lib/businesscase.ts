/**
 * Business-case FACTS + simulation. The facts the portfolio needs — confidence,
 * whether the baseline is verified, the annual gross and its category, the cost, and
 * the assumptions table — are projected from the structured model
 * (`lib/business-case-model.ts`), which parses the document via a real CommonMark/GFM
 * AST rather than regexes. This layer adds the numbers: assumption sensitivity (an
 * untested assumption is treated as materially load-bearing) and the value bands.
 * Never throws.
 */

import type { Confidence } from "./types.js";
import type { Assumption, SimulationInput, SimulationOutput } from "./simulation.js";
import { runValueSimulation } from "./simulation.js";
import { computeEconomics, type Economics } from "./business-economics.js";
import { parseBusinessCaseModel, parseEuro, type BusinessCaseModel } from "./business-case-model.js";

export interface BusinessCaseFacts {
  confidence?: Confidence;
  baselineVerified?: boolean;
  annualGross?: number;
  category?: string;
  /** One-off build cost from the ## Cost table, when a figure is stated. */
  buildCost?: number;
  /** Recurring annual run cost from the ## Cost table, when a figure is stated. */
  annualRunCost?: number;
  assumptions: Assumption[];
}

const DEFAULT_UNTESTED_SENSITIVITY = 0.35;
const DEFAULT_TESTED_SENSITIVITY = 0.05;

/** Project the structured model down to the facts the simulation and page consume. */
export function factsFromModel(model: BusinessCaseModel): BusinessCaseFacts {
  const facts: BusinessCaseFacts = {
    confidence: model.confidence,
    baselineVerified: model.baseline.verified,
    assumptions: model.assumptions.map((a) => ({
      name: a.name,
      tested: a.tested,
      sensitivity: a.tested ? DEFAULT_TESTED_SENSITIVITY : DEFAULT_UNTESTED_SENSITIVITY,
    })),
  };
  if (model.value.annualGross !== undefined) facts.annualGross = model.value.annualGross;
  if (model.value.category) facts.category = model.value.category;
  const build = parseEuro(model.cost.buildEstimate);
  if (build !== undefined) facts.buildCost = build;
  const run = parseEuro(model.cost.annualRunEstimate);
  if (run !== undefined) facts.annualRunCost = run;
  return facts;
}

/** Parse `business-case.md` to the facts the portfolio needs. Never throws. */
export function parseBusinessCase(markdown: string): BusinessCaseFacts {
  try {
    return factsFromModel(parseBusinessCaseModel(markdown));
  } catch {
    return { assumptions: [] };
  }
}

/** Build a simulation input from parsed facts (with an override for the base figure). */
export function toSimulationInput(facts: BusinessCaseFacts, baseOverride?: number): SimulationInput {
  return {
    baseAnnualGross: baseOverride ?? facts.annualGross ?? 0,
    assumptions: facts.assumptions,
  };
}

/** Parse a business case and run the value simulation in one step. */
export function simulateBusinessCase(markdown: string, baseOverride?: number): {
  facts: BusinessCaseFacts;
  simulation: SimulationOutput;
} {
  const facts = parseBusinessCase(markdown);
  const simulation = runValueSimulation(toSimulationInput(facts, baseOverride));
  return { facts, simulation };
}

/**
 * Full decision-grade read of a business case: the parsed facts, the value bands, and
 * the economics (net value, payback, ROI, multi-year NPV) the portfolio forum decides
 * on. One call for the review page. Honest throughout — no value → zeros.
 */
export function analyseBusinessCase(
  markdown: string,
  opts?: { horizonYears?: number; discountRate?: number },
): { facts: BusinessCaseFacts; simulation: SimulationOutput; economics: Economics } {
  const { facts, simulation } = simulateBusinessCase(markdown);
  const economics = computeEconomics({
    grossP10: simulation.p10,
    grossP50: simulation.p50,
    grossP90: simulation.p90,
    ...(facts.buildCost !== undefined ? { buildCost: facts.buildCost } : {}),
    ...(facts.annualRunCost !== undefined ? { annualRunCost: facts.annualRunCost } : {}),
    ...(opts?.horizonYears !== undefined ? { horizonYears: opts.horizonYears } : {}),
    ...(opts?.discountRate !== undefined ? { discountRate: opts.discountRate } : {}),
  });
  return { facts, simulation, economics };
}
