/**
 * `duplicate-scan` — a read-only agent tool that flags likely-duplicate demands
 * across the funnel, so two teams don't build the same thing. Built per request,
 * bound to the current portfolio rows (the factory pattern), and read-only
 * (`view_board`) — it opens nothing, merges nothing, decides nothing. Merging a
 * duplicate stays a human call.
 *
 * Complements the per-keystroke `intake/similar` (substring-only, at capture) with
 * a whole-funnel pairwise scan using the token-Jaccard helper in `lib/funnel`.
 */

import type { AgentTool } from "../tools.js";
import type { RegistryRow } from "../../registry.js";
import { findDuplicatePairs, type DuplicatePair } from "../../funnel/similarity.js";

export interface DuplicateScanInput {
  /** Minimum title similarity to report, 0–1. Defaults to 0.4. */
  threshold?: number;
  /** Max pairs to return. Defaults to 20. */
  limit?: number;
}

export interface DuplicateScanOutput {
  pairs: DuplicatePair[];
}

/** Create the duplicate-scan tool bound to a snapshot of the portfolio. */
export function makeDuplicateScanTool(rows: readonly RegistryRow[]): AgentTool<DuplicateScanInput, DuplicateScanOutput> {
  return {
    name: "duplicate-scan",
    description:
      "Scan the funnel for likely-duplicate demands by title similarity, so they can be merged before two teams build the same thing. Read-only — flags candidates, never merges.",
    capability: "view_board",
    inputSchema: {
      type: "object",
      properties: {
        threshold: { type: "number", description: "Minimum similarity 0–1 (default 0.4)." },
        limit: { type: "number", description: "Max pairs to return (default 20)." },
      },
    },
    run(input) {
      return { pairs: findDuplicatePairs(rows, input.threshold ?? 0.4, input.limit ?? 20) };
    },
  };
}
