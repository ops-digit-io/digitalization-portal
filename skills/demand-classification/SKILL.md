---
name: demand-classification
description: Propose a lane and domain for a captured demand, deterministically, as a suggestion for triage — never an assignment.
capabilities: [draft]
tools: []
---

# demand-classification

Proposes a lane and domain from the captured intake answers, for the
`confirm-understanding` checkpoint of `s1-intake`.

## Rules

- **Deterministic and stated.** The proposal comes from `classifyDemand`
  (`lib/demand.ts`) — keyword rules over the demand text, the same input always
  giving the same lane and domain, with a one-line rationale. A live model may
  phrase the readback, but the proposal it shows is this function's output, so the
  offline and online paths agree.
- **A suggestion, not a decision.** Triage confirms or overrides the lane at G1/G2.
  Until then the demand's lane is what the requester confirmed, or `unassigned`.
- **Lane taxonomy** is `lib/lanes.ts`: run, regulatory, continuous_improvement,
  transform, innovation, data_ai, local. When no keyword matches but there is text,
  default to `transform` (DU-owned change) and say so.

## Output

`{ lane, domain, rationale }` — shown at the checkpoint for the requester to
correct. Nothing here writes state or passes a gate.
