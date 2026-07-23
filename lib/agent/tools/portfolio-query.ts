/**
 * `portfolio-query` — the M5 read-only agent tool (`docs/15-roadmap.md` M5).
 *
 * Answers portfolio questions from the registry, within the session's visibility.
 * Bound to `view_board`, so the agent sees exactly what the user sees — no more.
 * Read-only: it opens nothing, merges nothing, decides nothing.
 */

import type { AgentTool } from "../tools.js";
import type { RegistryRow } from "../../registry.js";
import { assembleBoard, type BoardFilter } from "../../board.js";

export interface PortfolioQueryInput {
  rows: readonly RegistryRow[];
  /** Reference instant for stage-age (ISO). */
  now: string;
  filter?: BoardFilter;
}

export interface PortfolioQueryOutput {
  total: number;
  byStage: Record<string, number>;
  needsAttention: number;
}

export const portfolioQueryTool: AgentTool<PortfolioQueryInput, PortfolioQueryOutput> = {
  name: "portfolio-query",
  description: "Summarise the portfolio within the caller's visibility (read-only).",
  capability: "view_board",
  run(input, ctx) {
    const board = assembleBoard(input.rows, ctx.session, input.now, input.filter ?? {});
    const byStage: Record<string, number> = {};
    let total = 0;
    for (const [stage, cards] of Object.entries(board.columns)) {
      byStage[stage] = cards.length;
      total += cards.length;
    }
    return { total, byStage, needsAttention: board.needsAttention.length };
  },
};
