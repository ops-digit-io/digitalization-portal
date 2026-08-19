# UC-2026-0039 · Energy baseline per line

## State

- **Stage:** S3
- **Lane:** transform
- **Status:** active
- **Plant:** SK-PUC
- **Domain:** energy
- **Tools:** Energy monitoring (Aldingen), UNS broker (HiveMQ), Power BI
- **Level:** L2
- **Heat:** low
- **Scale potential:** multi-plant
- **Created:** 2026-05-11
- **Since:** 2026-06-01
- **Intake:** complete

## Problem

> Original (SK): Nevieme, ktorá linka spotrebuje koľko energie.

Energy is metered at the building level, so per-line consumption — and therefore per-line efficiency — is unknown.

## Current pain

Energy is ~4% of plant cost at SK-PUC with no line-level attribution to target (utility bills).

## Desired outcome

Each line has an energy baseline and an alert when consumption drifts from it, enabling targeted efficiency work.

## Proposed solution

Sub-metering plus a baseline model per line; drift alerts to the line owner.

## Classification rationale

L2 — a new measurement makes an existing cost visible and steerable. Heat low — real but slower payback, needs sub-metering capex.

## People

| Role | Person |
|---|---|
| Requester | energy.mgr@example.com |
| Lead | facility.eng@example.com |
| Sponsor | plant.manager@example.com |
| Value owner | sk.controlling@example.com |

## Gates

| Gate | Status | Date | By | Note |
|---|---|---|---|---|
| G1 Intake accepted | passed | 2026-06-01 | plant.manager@example.com |  |
| G2 Prioritized | passed | 2026-06-01 | plant.manager@example.com |  |
| G3 Business case | open |  |  |  |
| G4 POC proven/stop | pending |  |  |  |
| G5 Pilot proven | pending |  |  |  |
| G6 Scale readiness | pending |  |  |  |
| G7 Rollout complete | pending |  |  |  |

## History

- 2026-05-11 — captured via portal intake (s1-intake playbook)
- 2026-05-20 — G1 accepted, triaged to transform
- 2026-06-01 — G2 prioritized
