# UC-2026-0044 · Tool wear detection

## State

- **Stage:** S1
- **Lane:** unassigned
- **Status:** active
- **Plant:** DE-ALD
- **Domain:** maintenance
- **Tools:** AVEVA PI, Ignition, SAP PM, Senseye Predictive Maintenance
- **Level:** L2
- **Heat:** medium
- **Scale potential:** local
- **Created:** 2026-05-07
- **Since:** 2026-05-07
- **Intake:** complete

## Problem

> Original (DE): Werkzeuge fallen ohne Vorwarnung aus und stoppen die Linie.

Cutting tools fail without warning, stopping the line and scrapping the in-progress part.

## Current pain

Unplanned tool-change stops on the lead line; frequency not yet quantified (requester report, to be measured).

## Desired outcome

The line predicts a tool change before failure, converting an unplanned stop into a planned one.

## Proposed solution

Requester suggested vibration/spindle-load monitoring with a wear model — to be assessed, not binding.

## Classification rationale

L2 — a prediction makes an existing step more reliable. Heat medium pending feasibility — depends on signal availability.

## People

| Role | Person |
|---|---|
| Requester | maint.tech@example.com |

## Gates

| Gate | Status | Date | By | Note |
|---|---|---|---|---|
| G1 Intake accepted | open |  |  |  |
| G2 Prioritized | pending |  |  |  |
| G3 Business case | pending |  |  |  |
| G4 POC proven/stop | pending |  |  |  |
| G5 Pilot proven | pending |  |  |  |
| G6 Scale readiness | pending |  |  |  |
| G7 Rollout complete | pending |  |  |  |

## History

- 2026-05-07 — captured via portal intake (s1-intake playbook)

