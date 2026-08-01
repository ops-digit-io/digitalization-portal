/**
 * `implementation-analysis` — Feature 2's agent tool. Built per request, bound to
 * the current portfolio rows, so the model calls it with just a horizon rather
 * than passing the whole dataset. Read-only (`view_board`).
 */

import type { AgentTool } from "../tools.js";
import type { RegistryRow } from "../../registry.js";
import { analyzePortfolio, type Horizon } from "../../analysis/portfolio.js";

export interface ImplementationAnalysisInput {
  horizon: Horizon;
  parallelism?: number;
  capacityPersonWeeks?: number;
}

/** Create the analysis tool bound to a snapshot of the portfolio. */
export function makeImplementationAnalysisTool(rows: readonly RegistryRow[]): AgentTool<ImplementationAnalysisInput, unknown> {
  return {
    name: "implementation-analysis",
    description:
      "Over a quarter or year, compute portfolio implementation workload (person-weeks) and business value that lands within the horizon, ranked by value-per-effort. Also returns workload/value broken down by lane and by stage, and — when a capacity is given — a concrete keep/defer plan that fits the person-week budget (value captured vs deferred). Read-only.",
    capability: "view_board",
    inputSchema: {
      type: "object",
      properties: {
        horizon: { type: "string", enum: ["quarter", "year"] },
        parallelism: { type: "number", description: "How many use cases run in parallel (team breadth)." },
        capacityPersonWeeks: { type: "number", description: "Team capacity over the horizon, for feasibility." },
      },
      required: ["horizon"],
    },
    run(input) {
      const opts: Parameters<typeof analyzePortfolio>[1] = { horizon: input.horizon };
      if (input.parallelism !== undefined) opts.parallelism = input.parallelism;
      if (input.capacityPersonWeeks !== undefined) opts.capacityPersonWeeks = input.capacityPersonWeeks;
      return analyzePortfolio(rows, opts);
    },
  };
}
