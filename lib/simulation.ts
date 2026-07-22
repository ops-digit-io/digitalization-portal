/**
 * Business-case value simulation engine (deterministic).
 *
 * This is the numeric core behind Feature 1. It is deterministic (no
 * `Math.random()` — that would break trace replay); a Monte-Carlo variant would
 * take an explicit seed recorded in the trace. The agent decides WHICH
 * assumptions matter and narrates the result; this function does the arithmetic.
 *
 * Every figure it produces is at most `indicative` — a simulation never yields a
 * committed figure (constraint #8).
 */

import type { Confidence } from "./types.js";

export interface Assumption {
  name: string;
  /** Fractional impact on the base figure if this assumption fails to hold (0–1). */
  sensitivity: number;
  tested: boolean;
}

export interface SimulationInput {
  baseAnnualGross: number;
  assumptions: Assumption[];
}

export interface SimulationDriver {
  name: string;
  impact: number;
  tested: boolean;
}

export interface SimulationOutput {
  confidence: Confidence;
  p10: number;
  p50: number;
  p90: number;
  /** Assumptions ranked by impact (tornado order), untested first. */
  drivers: SimulationDriver[];
  /** Ready-to-append markdown section for a draft pull request. */
  draftSection: string;
}

function round(n: number): number {
  return Math.round(n);
}

/**
 * Compute a downside/upside band. The downside compounds the sensitivities of the
 * UNTESTED assumptions (the ones the case actually rests on); the base case (P90)
 * assumes every assumption holds.
 */
export function runValueSimulation(input: SimulationInput): SimulationOutput {
  const base = input.baseAnnualGross;
  const untestedFactor = input.assumptions
    .filter((a) => !a.tested)
    .reduce((acc, a) => acc * (1 - Math.abs(a.sensitivity)), 1);

  const p10 = round(base * untestedFactor);
  const p50 = round(base * (1 - 0.5 * (1 - untestedFactor)));
  const p90 = round(base);

  const drivers: SimulationDriver[] = [...input.assumptions]
    .sort(
      (a, b) =>
        Number(a.tested) - Number(b.tested) || Math.abs(b.sensitivity) - Math.abs(a.sensitivity),
    )
    .map((a) => ({ name: a.name, impact: round(base * Math.abs(a.sensitivity)), tested: a.tested }));

  const fmt = (n: number): string =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  const draftSection = [
    "## Simulation",
    "",
    "> Drafted by the assistant. Review before merging. Figures are indicative — a",
    "> simulation never produces a committed figure.",
    "",
    "| Scenario | Annual gross |",
    "|---|---|",
    `| P10 (downside) | ${fmt(p10)} |`,
    `| P50 | ${fmt(p50)} |`,
    `| P90 (base) | ${fmt(p90)} |`,
    "",
    "### Assumption sensitivity (tornado)",
    "",
    "| Assumption | Impact | Tested |",
    "|---|---|---|",
    ...drivers.map((d) => `| ${d.name} | ${fmt(d.impact)} | ${d.tested ? "yes" : "**no**"} |`),
  ].join("\n");

  return { confidence: "indicative", p10, p50, p90, drivers, draftSection };
}
