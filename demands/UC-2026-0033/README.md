# UC-2026-0033 · Cause code harmonization

## State

- **Stage:** S8
- **Lane:** transform
- **Status:** active
- **Plant:** DE-ALD
- **Domain:** quality
- **Level:** L2
- **Heat:** low
- **Scale potential:** multi-plant
- **Created:** 2026-01-30
- **Since:** 2026-06-20
- **Intake:** complete

## Problem

> Original (EN): Every line uses different scrap cause codes, so nothing aggregates.

Scrap cause codes diverged per line over years, so defect data cannot be aggregated across lines or plants.

## Current pain

Cross-line quality analysis was impossible; harmonization was the prerequisite for UC-2026-0041.

## Desired outcome

One harmonized cause-code master in steady operation, enabling aggregated defect analytics.

## Proposed solution

A mapped, governed cause-code master with a migration of historical codes.

## Classification rationale

L2 — a foundational data step that unlocks downstream analytics. Heat low as a standalone, high as an enabler.

## People

| Role | Person |
|---|---|
| Requester | quality.eng@example.com |
| Lead | quality.eng@example.com |
| Sponsor | plant.quality@example.com |
| Value owner | controlling@example.com |

## Gates

| Gate | Status | Date | By | Note |
|---|---|---|---|---|
| G1 Intake accepted | passed | 2026-06-20 | plant.quality@example.com |  |
| G2 Prioritized | passed | 2026-06-20 | plant.quality@example.com |  |
| G3 Business case | passed | 2026-06-20 | plant.quality@example.com |  |
| G4 POC proven/stop | passed | 2026-06-20 | plant.quality@example.com |  |
| G5 Pilot proven | passed | 2026-06-20 | plant.quality@example.com |  |
| G6 Scale readiness | passed | 2026-06-20 | plant.quality@example.com |  |
| G7 Rollout complete | passed | 2026-06-20 | plant.quality@example.com |  |

## History

- 2026-01-30 — captured via portal intake (s1-intake playbook)
- 2026-02-14 — G1 accepted, triaged to transform
- 2026-03-30 — G3 business case approved
- 2026-05-18 — G5 pilot proven
- 2026-06-20 — G7 rollout complete, in steady ops
