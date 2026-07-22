/**
 * Gate enforcement (`docs/BUILD.md §Enforcement placement`,
 * `docs/03-data-model.md §3.14`).
 *
 * Because artifacts are unvalidated markdown, these checks run **in the portal,
 * before opening a gate pull request** — not in repository CI. This is the single
 * module the BUILD doc mandates: call it from the gate route AND from the
 * interface, so the button is disabled with exactly the reason the API returns.
 *
 * What this does NOT do: merge, or grant authority. Authority is `can()`
 * (`lib/rbac.ts`); the merge is a human act under CODEOWNERS. This module answers
 * only "is the use case in a state where opening this gate is permitted?".
 */

import { type Confidence, type Gate, type Stage, STAGES } from "./types.js";
import type { GateRow, ParsedUseCase, PeopleMap } from "./parse.js";
import { predecessorGate, transitionForGate } from "./stages.js";
import { confidencePermittedAtStage } from "./value.js";

export interface BusinessCaseFacts {
  confidence?: Confidence;
  /** `## Baseline` → Verified. Must be true before G5 (`§3.14`, §7.4). */
  baselineVerified?: boolean;
}

export interface GateCheckInput {
  readme: ParsedUseCase;
  /** Roles read from the `## People` table (`parsePeople`). */
  people?: PeopleMap;
  /** Parsed facts from `business-case.md`, where present. */
  businessCase?: BusinessCaseFacts;
  /** Value owner named on the G7 handover record (`ops/handover.md`). */
  handoverValueOwner?: string;
  /** The email of the person requesting the gate, for the self-approval rule. */
  actor?: string;
}

export type GateDecision =
  | { permitted: true }
  | { permitted: false; reason: string };

function refuse(reason: string): GateDecision {
  return { permitted: false, reason };
}

function gateStatus(gates: GateRow[], gate: Gate): GateRow | undefined {
  return gates.find((g) => g.id === gate);
}

/**
 * Decide whether a gate pull request may be opened for a use case.
 *
 * Checks (`§3.14`): gate sequence, sponsor+value owner before G3, baseline
 * verified before G5, confidence not committed before S5, value owner after
 * handover before G7, and self-approval.
 */
export function canOpenGate(target: Gate, input: GateCheckInput): GateDecision {
  const { readme, people = {}, businessCase = {}, handoverValueOwner, actor } = input;
  const gates = readme.gates;

  // A use case we can't read is not a use case we advance.
  if (readme.needsAttention) {
    return refuse(
      "This use case's state couldn't be read. Open it in GitHub to fix the format before requesting a gate.",
    );
  }

  const transition = transitionForGate(target);
  if (!transition) return refuse(`Unknown gate ${target}.`);

  // 1. Already-passed gate cannot be re-opened.
  const current = gateStatus(gates, target);
  if (current?.status === "passed") {
    return refuse(`${target} has already been passed.`);
  }

  // 2. Gate sequence: the predecessor must be passed.
  const prev = predecessorGate(target);
  if (prev) {
    const prevRow = gateStatus(gates, prev);
    if (prevRow?.status !== "passed") {
      return refuse(`${prev} must be passed before ${target}.`);
    }
  }

  // 3. Sponsor and value owner before G3.
  if (target === "G3") {
    if (!people.sponsor) return refuse("A named sponsor is required before G3.");
    if (!people.value_owner) return refuse("A named value owner is required before G3.");
  }

  // 4. Confidence must not be committed before S5, and baseline must be verified
  //    before G5. G5 is the S5→S6 transition; entering S5 happens at G4.
  if (target === "G5") {
    if (businessCase.baselineVerified !== true) {
      return refuse("The baseline must be verified before G5 (committed value requires pilot measurement).");
    }
  }
  if (businessCase.confidence === "committed") {
    // The stage the case currently sits in — committed is only valid from S5.
    const stage = readme.state.stage;
    if (stage && !confidencePermittedAtStage("committed", stage)) {
      return refuse("A business case cannot be marked committed before S5; committed requires pilot measurement.");
    }
  }

  // 5. Value owner must survive the handover before G7.
  if (target === "G7") {
    const survivingOwner = handoverValueOwner ?? people.value_owner;
    if (!survivingOwner) {
      return refuse("A value owner must be named on the handover before G7; steady operations needs an owner.");
    }
  }

  // 6. Self-approval: the requester may not be the (sole) approver of their own case.
  if (actor && people.requester && actor === people.requester) {
    return refuse("The requester may not approve their own use case. A second approver is required.");
  }

  return { permitted: true };
}

/**
 * Standalone confidence validation, usable on read (`§3.14` marks a use case with
 * an inconsistent committed-before-S5 state for the weekly drift digest).
 */
export function validateConfidence(
  stage: Stage | undefined,
  businessCase: BusinessCaseFacts,
): GateDecision {
  if (businessCase.confidence === "committed" && stage) {
    if (!confidencePermittedAtStage("committed", stage)) {
      return refuse(`Confidence "committed" is not permitted at ${stage}; it is valid only from S5.`);
    }
  }
  return { permitted: true };
}

/** Stage index helper for callers that need to compare stages. */
export function stageAtOrAfter(stage: Stage, floor: Stage): boolean {
  return STAGES.indexOf(stage) >= STAGES.indexOf(floor);
}
