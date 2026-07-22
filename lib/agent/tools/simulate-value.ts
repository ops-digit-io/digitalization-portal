/**
 * `simulate-value` — the build plan's worked example of an ADDITIVE capability
 * (business-case simulation), proving the extension seam: a substantial new tool
 * is one registry entry, no core change.
 *
 * It reads a business case's assumptions and produces a sensitivity band. Its
 * output is a DRAFT markdown section destined for a pull request — never a
 * committed figure. Bound to `draft`, so it can only run for a session that may
 * already draft. It merges nothing and passes no gate.
 *
 * Determinism note: no `Math.random()` here (it would break trace replay). The
 * band is a deterministic function of the inputs; a real Monte-Carlo variant
 * would take an explicit seed recorded in the trace.
 */

import type { AgentTool } from "../tools.js";
import type { Confidence } from "../../types.js";

export interface Assumption {
  name: string;
  /** Fractional downside/upside applied to the base figure if this assumption moves. */
  sensitivity: number;
  tested: boolean;
}

export interface SimulateValueInput {
  baseAnnualGross: number;
  assumptions: Assumption[];
}

export interface SimulateValueOutput {
  /** Always indicative or lower — a simulation never yields a committed figure. */
  confidence: Confidence;
  p10: number;
  p50: number;
  p90: number;
  /** Assumptions ranked by impact (tornado order), untested ones first. */
  drivers: { name: string; impact: number; tested: boolean }[];
  /** Ready-to-append markdown section for a draft pull request. */
  draftSection: string;
}

function round(n: number): number {
  return Math.round(n);
}

export const simulateValueTool: AgentTool<SimulateValueInput, SimulateValueOutput> = {
  name: "simulate-value",
  description:
    "Sensitivity band over a business case's assumptions. Output is a draft section, never a committed figure.",
  capability: "draft",
  run(input) {
    const base = input.baseAnnualGross;
    // Downside compounds the sensitivities of UNTESTED assumptions (the ones the
    // case actually rests on); upside is more modest.
    const untestedDownside = input.assumptions
      .filter((a) => !a.tested)
      .reduce((acc, a) => acc * (1 - Math.abs(a.sensitivity)), 1);
    const p10 = round(base * untestedDownside);
    const p50 = round(base * (1 - 0.5 * (1 - untestedDownside)));
    const p90 = round(base);

    const drivers = [...input.assumptions]
      .sort((a, b) => Number(a.tested) - Number(b.tested) || Math.abs(b.sensitivity) - Math.abs(a.sensitivity))
      .map((a) => ({ name: a.name, impact: round(base * Math.abs(a.sensitivity)), tested: a.tested }));

    const draftSection = [
      "## Simulation",
      "",
      "> Drafted by the assistant. Review before merging. Figures are indicative — a",
      "> simulation never produces a committed figure.",
      "",
      "| Scenario | Annual gross |",
      "|---|---|",
      `| P10 (downside) | ${p10} |`,
      `| P50 | ${p50} |`,
      `| P90 (base) | ${p90} |`,
      "",
      "### Assumption sensitivity (tornado)",
      "",
      "| Assumption | Impact | Tested |",
      "|---|---|---|",
      ...drivers.map((d) => `| ${d.name} | ${d.impact} | ${d.tested ? "yes" : "**no**"} |`),
    ].join("\n");

    return { confidence: "indicative", p10, p50, p90, drivers, draftSection };
  },
};
