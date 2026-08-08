/**
 * `gate-readiness` — an additive, read-only agent tool for the use-case owner's
 * daily question: *"is this case ready for its next gate, and if not, what is
 * still missing?"*
 *
 * `canOpenGate` (`lib/gates.ts`) is the single authority on whether a gate PR may
 * be opened, but it short-circuits on the FIRST blocker — good for the gate route,
 * unhelpful for someone trying to get ready. This tool reuses that same authority
 * for the verdict and, in addition, enumerates every criterion for the next gate
 * as a met / missing / n-a checklist, so the owner sees the whole picture at once.
 *
 * Read-only by construction: it parses the markdown it is given and computes a
 * report. It opens nothing, merges nothing, and passes no gate — bound to `draft`,
 * the same non-deciding capability as `simulate-value`. The parsers it uses never
 * throw, so a malformed case yields a "fix the state first" report, never an error.
 */

import type { AgentTool } from "../tools.js";
import type { Gate, Stage } from "../../types.js";
import { parseUseCase, parsePeople } from "../../parse.js";
import { parseBusinessCase } from "../../businesscase.js";
import { canOpenGate } from "../../gates.js";
import { exitGate, predecessorGate } from "../../stages.js";
import { confidencePermittedAtStage } from "../../value.js";

const GATE_LABELS: Record<Gate, string> = {
  G1: "Intake accepted",
  G2: "Prioritized",
  G3: "Business case",
  G4: "POC proven/stop",
  G5: "Pilot proven",
  G6: "Scale readiness",
  G7: "Rollout complete",
};

export type CriterionStatus = "met" | "missing" | "n/a";

export interface ReadinessCriterion {
  criterion: string;
  status: CriterionStatus;
  detail: string;
}

export interface GateReadinessInput {
  /** The use case's README markdown (the `## State` / `## Gates` / `## People` record). */
  readme: string;
  /** The case's `business-case.md`, when one exists — needed for the G5 baseline check. */
  businessCase?: string;
}

export interface GateReadinessOutput {
  stage?: Stage;
  targetGate?: Gate;
  targetGateLabel?: string;
  /** The authoritative verdict from `canOpenGate` (first blocker only). */
  permitted: boolean;
  /** The first blocking reason, when not permitted. */
  blockingReason?: string;
  /** The full picture: every criterion for the target gate, independently evaluated. */
  checklist: ReadinessCriterion[];
  summary: string;
}

function met(criterion: string, detail: string): ReadinessCriterion {
  return { criterion, status: "met", detail };
}
function missing(criterion: string, detail: string): ReadinessCriterion {
  return { criterion, status: "missing", detail };
}
function na(criterion: string, detail: string): ReadinessCriterion {
  return { criterion, status: "n/a", detail };
}

export const gateReadinessTool: AgentTool<GateReadinessInput, GateReadinessOutput> = {
  name: "gate-readiness",
  description:
    "Assess whether a use case is ready for its next lifecycle gate. Returns the authoritative permit verdict plus a met/missing checklist of every criterion for that gate. Read-only — opens nothing, passes no gate.",
  capability: "draft",
  inputSchema: {
    type: "object",
    properties: {
      readme: { type: "string", description: "The use case's README markdown (State, Gates, People)." },
      businessCase: { type: "string", description: "The case's business-case.md markdown, if it has one." },
    },
    required: ["readme"],
  },
  run(input) {
    const uc = parseUseCase(input.readme);
    const people = parsePeople(input.readme);
    const bcFacts = input.businessCase ? parseBusinessCase(input.businessCase) : undefined;
    const stage = uc.state.stage;

    // An unreadable case is not advanceable — say exactly that, don't error.
    if (uc.needsAttention || !stage) {
      return {
        ...(stage ? { stage } : {}),
        permitted: false,
        checklist: [
          missing(
            "State is readable",
            "The `## State` section couldn't be read. Fix the stage/format before assessing gate readiness.",
          ),
        ],
        summary: "This case's state can't be read — fix the `## State` section before requesting any gate.",
      };
    }

    // The next gate: the one currently open, else the exit gate of the current stage.
    const openGate = (["G1", "G2", "G3", "G4", "G5", "G6", "G7"] as Gate[]).find(
      (g) => uc.gates.find((x) => x.id === g)?.status === "open",
    );
    const targetGate = openGate ?? exitGate(stage);

    if (!targetGate) {
      return {
        stage,
        permitted: false,
        checklist: [na("Next gate", `${stage} is a terminal stage — there is no further gate to open.`)],
        summary: `${stage} has no further gate; the case has completed its lifecycle.`,
      };
    }

    const decision = canOpenGate(targetGate, {
      readme: uc,
      people,
      ...(bcFacts ? { businessCase: { confidence: bcFacts.confidence, baselineVerified: bcFacts.baselineVerified } } : {}),
    });

    const checklist: ReadinessCriterion[] = [];

    // Sequence: the predecessor gate must be passed.
    const prev = predecessorGate(targetGate);
    if (prev) {
      const passed = uc.gates.find((x) => x.id === prev)?.status === "passed";
      checklist.push(
        passed
          ? met(`${prev} passed`, `${prev} (${GATE_LABELS[prev]}) is passed, so ${targetGate} is in sequence.`)
          : missing(`${prev} passed`, `${prev} (${GATE_LABELS[prev]}) must be passed before ${targetGate}.`),
      );
    } else {
      checklist.push(na(`Predecessor gate`, `${targetGate} is the first gate; no predecessor is required.`));
    }

    // Gate not already passed.
    const alreadyPassed = uc.gates.find((x) => x.id === targetGate)?.status === "passed";
    checklist.push(
      alreadyPassed
        ? missing(`${targetGate} not yet passed`, `${targetGate} has already been passed — nothing to open.`)
        : met(`${targetGate} open to request`, `${targetGate} has not been passed yet.`),
    );

    // G3: sponsor and value owner named.
    if (targetGate === "G3") {
      checklist.push(
        people.sponsor
          ? met("Sponsor named", `Sponsor: ${people.sponsor}.`)
          : missing("Sponsor named", "A named sponsor is required before G3."),
      );
      checklist.push(
        people.value_owner
          ? met("Value owner named", `Value owner: ${people.value_owner}.`)
          : missing("Value owner named", "A named value owner is required before G3."),
      );
    }

    // G5: baseline verified.
    if (targetGate === "G5") {
      const verified = bcFacts?.baselineVerified === true;
      checklist.push(
        verified
          ? met("Baseline verified", "The business-case baseline is marked Verified: yes.")
          : missing(
              "Baseline verified",
              input.businessCase
                ? "The business-case baseline is not yet verified (Verified: yes required before G5)."
                : "No business-case.md provided — the baseline must be verified before G5.",
            ),
      );
    }

    // Confidence must not be committed before S5 (a consistency check at any gate).
    if (bcFacts?.confidence === "committed") {
      const ok = confidencePermittedAtStage("committed", stage);
      checklist.push(
        ok
          ? met("Confidence consistent", `Confidence "committed" is permitted at ${stage}.`)
          : missing(
              "Confidence consistent",
              `The business case is marked "committed" at ${stage}; committed is only valid from S5.`,
            ),
      );
    }

    // G7: a value owner must survive into steady ops.
    if (targetGate === "G7") {
      checklist.push(
        people.value_owner
          ? met("Value owner for run", `Value owner: ${people.value_owner} carries into steady operations.`)
          : missing("Value owner for run", "A value owner must be named on the handover before G7."),
      );
    }

    const label = GATE_LABELS[targetGate];
    const summary = decision.permitted
      ? `${stage} → ${targetGate} (${label}): ready to request. All ${checklist.length} criteria met.`
      : `${stage} → ${targetGate} (${label}): not ready — ${decision.permitted === false ? decision.reason : ""}`;

    return {
      stage,
      targetGate,
      targetGateLabel: label,
      permitted: decision.permitted,
      ...(decision.permitted ? {} : { blockingReason: decision.reason }),
      checklist,
      summary,
    };
  },
};
