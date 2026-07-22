/**
 * Lane taxonomy and triage routing (`docs/05-lanes-and-triage.md`).
 *
 * Extensibility seam: lanes are data. Adding a lane is a table entry plus a
 * routing rule; the only hard branch downstream is repository-or-not (the run
 * lane gets a handover record and no repository).
 */

import { type Lane } from "./types.js";

export type LaneOwner = "IT" | "DU" | "joint" | "plant";
export type RepositoryPolicy = "none" | "conditional" | "always";
export type LifecycleScope = "none" | "S1-S5" | "full";

export interface LaneDef {
  id: Lane;
  /** Ownership from first triage. */
  owner: LaneOwner;
  /** Whether a use-case repository is created. */
  repository: RepositoryPolicy;
  /** How far through the eight stages this lane runs. */
  lifecycle: LifecycleScope;
  /** Requires the DU/IT joint-triage decision (`§5.3`) rather than unilateral assignment. */
  jointTriage: boolean;
}

export const LANE_DEFS: readonly LaneDef[] = [
  { id: "run", owner: "IT", repository: "none", lifecycle: "none", jointTriage: false },
  { id: "regulatory", owner: "joint", repository: "conditional", lifecycle: "full", jointTriage: true },
  { id: "continuous_improvement", owner: "joint", repository: "conditional", lifecycle: "full", jointTriage: true },
  { id: "transform", owner: "DU", repository: "always", lifecycle: "full", jointTriage: false },
  { id: "innovation", owner: "DU", repository: "always", lifecycle: "full", jointTriage: false },
  { id: "data_ai", owner: "DU", repository: "always", lifecycle: "full", jointTriage: false },
  { id: "local", owner: "plant", repository: "always", lifecycle: "S1-S5", jointTriage: false },
] as const;

export function laneDef(lane: Lane): LaneDef | undefined {
  return LANE_DEFS.find((l) => l.id === lane);
}

/** Run-lane demand receives a handover record and no repository (`§5.3`). */
export function isRunLane(lane: Lane): boolean {
  return lane === "run";
}

/** Whether a use-case repository should exist for a lane that has been assigned. */
export function requiresRepository(lane: Lane): boolean {
  const def = laneDef(lane);
  // `conditional` lanes get a repository once triage confirms material change
  // intensity; at assignment time we provision one so evidence has a home.
  return def !== undefined && def.repository !== "none";
}
