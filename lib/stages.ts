/**
 * Stage machine — the transition table (`docs/02-lifecycle.md`,
 * `docs/03-data-model.md §3.13`).
 *
 * This is an **extensibility seam** (see the build plan): stages, gates, and the
 * artifacts each gate materialises are expressed as data, so adding or changing
 * a stage artifact is a table edit, not a control-flow rewrite. The gate machine
 * (M4) and template materialisation read this table; they do not hard-code the
 * sequence.
 */

import { type Gate, type Stage, GATES, STAGES } from "./types.js";

export interface Transition {
  gate: Gate;
  from: Stage;
  to: Stage;
  /**
   * Artifact scaffolds materialised into the use-case repository when this gate
   * is passed (`docs/03-data-model.md §3.13`). Paths are relative to the repo root.
   */
  materializes: string[];
}

export const TRANSITIONS: readonly Transition[] = [
  { gate: "G1", from: "S1", to: "S2", materializes: [] },
  { gate: "G2", from: "S2", to: "S3", materializes: ["business-case.md"] },
  { gate: "G3", from: "S3", to: "S4", materializes: ["poc/evaluation.md"] },
  { gate: "G4", from: "S4", to: "S5", materializes: ["pilot/kpi.md", "pilot/adoption.md"] },
  { gate: "G5", from: "S5", to: "S6", materializes: ["scale/template.md"] },
  { gate: "G6", from: "S6", to: "S7", materializes: ["rollout/plan.md", "ops/handover.md"] },
  { gate: "G7", from: "S7", to: "S8", materializes: ["ops/value-tracking.md"] },
] as const;

/** The gate that must be passed to *enter* the given stage, or undefined for S1. */
export function entryGate(stage: Stage): Gate | undefined {
  return TRANSITIONS.find((t) => t.to === stage)?.gate;
}

/** The gate whose passage a use case in `stage` is working toward, or undefined for S8. */
export function exitGate(stage: Stage): Gate | undefined {
  return TRANSITIONS.find((t) => t.from === stage)?.gate;
}

/** The gate immediately preceding `gate` in sequence, or undefined for G1. */
export function predecessorGate(gate: Gate): Gate | undefined {
  const i = GATES.indexOf(gate);
  return i > 0 ? GATES[i - 1] : undefined;
}

/** The transition definition for a gate. */
export function transitionForGate(gate: Gate): Transition | undefined {
  return TRANSITIONS.find((t) => t.gate === gate);
}

/** Stage that immediately follows `stage`, or undefined for S8. */
export function nextStage(stage: Stage): Stage | undefined {
  const i = STAGES.indexOf(stage);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : undefined;
}
