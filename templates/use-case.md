# {{ID}} · {{title}}

<!-- The README IS the canonical record. Anyone opening the repository sees the
     use case. It grows as the use case advances; it is never replaced. -->

## State

<!-- The only section the portal parses for lifecycle state. Definition list,
     `- **Key:** value`. Keys are case-insensitive; unknown keys are preserved. -->

- **Stage:** S1
- **Lane:** <!-- run | regulatory | continuous_improvement | transform | innovation | data_ai | local. Assigned at triage. -->
- **Status:** active
- **Plant:** <!-- Plant code from registry/plants.md, or ALL for enterprise-wide. -->
- **Domain:** <!-- Domain from registry/domains.md. -->
- **Level:** <!-- L1 (workflow changes shape) or L2 (one step gets faster). -->
- **Heat:** <!-- high | medium | low — opportunity against effort. -->
- **Scale potential:** <!-- local | multi-plant | global. Directional at this stage. -->
- **Created:** {{date}}
- **Intake:** <!-- complete | incomplete. Incomplete raises a clarification task; never rejected at entry. -->

## Problem

<!-- The problem, stated independently of any proposed solution. Preserve the
     requester's original phrasing in a blockquote, with a translation if needed. -->

> Original ({{lang}}): {{original_text}}

## Current pain

<!-- The measurable cost today. Mark the source: measured, or requester estimate. -->

## Desired outcome

<!-- What is true when this succeeds. Outcome, not solution. -->

## Proposed solution

<!-- Any solution the requester proposed. Recorded for context; NOT binding on
     scope. The problem defines scope, not this. -->

## Classification rationale

<!-- Why this Level and this Heat. One sentence each. -->

## People

<!-- Accountability fields (record roles). Distinct from portal authorization.
     A named role here grants no merge rights. Sponsor and value owner must be
     named before G3. -->

| Role | Person |
|---|---|
| Requester | {{requester}} |
| Lead | <!-- named at S2 --> |
| Sponsor | <!-- named at S2, required before G3 --> |
| Value owner | <!-- named at S2, required before G3 --> |
| Business owner | <!-- named at S3 --> |
| Delivery lead | <!-- named at S4 --> |
| Run owner | *assigned at G7* |

## Gates

<!-- Fixed columns: Gate, Status, Date, By, Note. Gate status is one of
     passed | open | pending | killed | parked. The portal advances a gate only
     by pull request; it never merges. -->

| Gate | Status | Date | By | Note |
|---|---|---|---|---|
| G1 Intake accepted | open | | | |
| G2 Prioritized | pending | | | |
| G3 Business case | pending | | | |
| G4 POC proven/stop | pending | | | |
| G5 Pilot proven | pending | | | |
| G6 Scale readiness | pending | | | |
| G7 Rollout complete | pending | | | |

## Related

<!-- Links to related use cases, one per line: - UC-YYYY-NNNN — relationship. -->

## History

<!-- Append-only log of material events. -->

- {{date}} — created via portal by {{requester}}
