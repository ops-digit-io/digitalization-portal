/**
 * PoC spec drafting (Feature 3, step 2: "create a spec with a human in the loop").
 *
 * The agent drafts this spec; a human reviews and approves it at a checkpoint
 * before any artifact is generated. Deterministic here (offline); in live mode the
 * model authors it. Either way it is a draft for human approval, never a decision.
 */

import type { UseCaseSeed } from "./scaffold.js";

export type ArtifactKind = "dashboard" | "app" | "mockup" | "report";

const KIND_LABEL: Record<ArtifactKind, string> = {
  dashboard: "operational dashboard",
  app: "lightweight web app",
  mockup: "clickable UI mockup",
  report: "analysis report",
};

export function draftPocSpec(seed: UseCaseSeed, kind: ArtifactKind, stackLabel?: string): string {
  const what = KIND_LABEL[kind];
  const builtAs = stackLabel ? `\n\n**Built as:** ${stackLabel}.` : "";
  return `# PoC spec · ${seed.id}${builtAs}

<!-- Drafted by the assistant. Review and approve before the artifact is built.
     The portal drafts; a human decides. -->

## Goal

Prove, quickly, whether ${seed.title.toLowerCase()} is feasible and valuable, by
building a ${what} for **${seed.plant}** (${seed.domain ?? "process"}).

## Problem it addresses

${seed.problem ?? "See README — the demand captured at intake."}

## Users

- Shift supervisor / process owner at ${seed.plant}
- Digital Unit delivery lead (evidence owner)

## Scope of the PoC

**In scope.** A ${what} that demonstrates the core signal using data that already
exists. No production integration; evidence only.

**Out of scope.** Production deployment, OT integration, and any change to the
system of record.

## What the ${kind} shows

- The headline metric and its current baseline
- Trend over a representative window
- Breakdown by the dimension that drives the problem

## Success criteria (measured, set before build)

1. The core metric is computable from existing data for more than 70% of cases.
2. A supervisor can read the current state in under 30 seconds.

## Kill criteria

1. The signal requires new sensing hardware at more than one line.
2. The metric cannot be computed without a system-of-record change.

## Deliverable

A self-contained ${what} committed to \`poc/\`, plus a short evidence note. Opened
as a pull request for review — the portal never merges.
`;
}
