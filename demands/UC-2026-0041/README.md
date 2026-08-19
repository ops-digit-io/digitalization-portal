# UC-2026-0041 · Scrap attribution at shift granularity

## State

- **Stage:** S4
- **Lane:** transform
- **Status:** active
- **Plant:** DE-ALD
- **Domain:** quality
- **Tools:** Critical Manufacturing MES, Power BI, Excel planning workbooks
- **Level:** L2
- **Heat:** medium
- **Scale potential:** multi-plant
- **Created:** 2026-04-02
- **Since:** 2026-05-06
- **Intake:** complete

## Problem

> Original (DE): Wir wissen erst am Monatsende, welche Schicht den Ausschuss verursacht hat.

Scrap is booked at month-end aggregate, so the shift and line that produced a defect batch can no longer be identified when the cost lands.

## Current pain

~2.1% scrap on €8.6m annual throughput at DE-ALD; root-cause meetings run on hearsay because attribution is not shift-resolved (measured, MES export).

## Desired outcome

Every scrap booking carries shift, line, and cause code within the same day, so corrective action reaches the shift that caused it.

## Proposed solution

Join MES scrap postings to the shift calendar and cause-code master; surface a shift-resolved Pareto in the quality cockpit.

## Classification rationale

L2 — one reporting step gets materially faster and finer. Heat medium — clear value, moderate data-join effort.

## People

| Role | Person |
|---|---|
| Requester | line.lead@example.com |
| Lead | quality.eng@example.com |
| Sponsor | plant.quality@example.com |
| Value owner | controlling@example.com |

## Gates

| Gate | Status | Date | By | Note |
|---|---|---|---|---|
| G1 Intake accepted | passed | 2026-05-06 | plant.quality@example.com |  |
| G2 Prioritized | passed | 2026-05-06 | plant.quality@example.com |  |
| G3 Business case | passed | 2026-05-06 | plant.quality@example.com |  |
| G4 POC proven/stop | open |  |  |  |
| G5 Pilot proven | pending |  |  |  |
| G6 Scale readiness | pending |  |  |  |
| G7 Rollout complete | pending |  |  |  |

## Related

- UC-2026-0033 — depends on, needs the harmonized cause codes to attribute scrap across lines

## History

- 2026-04-02 — captured via portal intake (s1-intake playbook)
- 2026-04-18 — G1 accepted, triaged to transform
- 2026-05-06 — G3 business case approved, POC started
