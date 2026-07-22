/**
 * Shared domain types for the Digital Unit Portal.
 *
 * These enums are the vocabulary the whole system agrees on. They mirror the
 * markdown conventions in `docs/03-data-model.md`; the parser (`lib/parse.ts`)
 * validates raw markdown against them, and everything downstream consumes the
 * typed result. Enum *values* are the lowercase / canonical forms that appear in
 * the documents, so parsing is a case-insensitive match against these.
 */

/** Lifecycle stages S1–S8 (`docs/02-lifecycle.md`). */
export type Stage = "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8";
export const STAGES: readonly Stage[] = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];

/** Gates G1–G7. A use case advances only by passing the gate at its stage exit. */
export type Gate = "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
export const GATES: readonly Gate[] = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"];

/** Use-case status (`## State` → Status). */
export type Status = "active" | "parked" | "killed" | "retired";
export const STATUSES: readonly Status[] = ["active", "parked", "killed", "retired"];

/** Per-gate status (`## Gates` table → Status column). */
export type GateStatus = "passed" | "open" | "pending" | "killed" | "parked";
export const GATE_STATUSES: readonly GateStatus[] = [
  "passed",
  "open",
  "pending",
  "killed",
  "parked",
];

/** Lane taxonomy (`docs/05-lanes-and-triage.md §5.3`). Exactly one per demand. */
export type Lane =
  | "run"
  | "regulatory"
  | "continuous_improvement"
  | "transform"
  | "innovation"
  | "data_ai"
  | "local";
export const LANES: readonly Lane[] = [
  "run",
  "regulatory",
  "continuous_improvement",
  "transform",
  "innovation",
  "data_ai",
  "local",
];

/** Agentic-investment level (`docs/02-lifecycle.md §2.5`). */
export type Level = "L1" | "L2";
export const LEVELS: readonly Level[] = ["L1", "L2"];

/** Opportunity-vs-effort heat. */
export type Heat = "high" | "medium" | "low";
export const HEATS: readonly Heat[] = ["high", "medium", "low"];

/** Value confidence state (`docs/07-value-model.md §7.2`). */
export type Confidence = "hypothesis" | "indicative" | "committed" | "realized";
export const CONFIDENCES: readonly Confidence[] = [
  "hypothesis",
  "indicative",
  "committed",
  "realized",
];

/**
 * Record roles named on a use case (`docs/02-lifecycle.md §2.4`). These are
 * accountability fields, distinct from authorization roles in `lib/rbac.ts`.
 */
export type RecordRole =
  | "requester"
  | "lead"
  | "sponsor"
  | "value_owner"
  | "business_owner"
  | "delivery_lead"
  | "run_owner";
