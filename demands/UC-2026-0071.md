# UC-2026-0071 · Predictive scrap alerts on the coating line

## State

- **Stage:** S1
- **Lane:** data_ai
- **Status:** active
- **Plant:** DE-ALD
- **Domain:** quality
- **Created:** 2026-06-30
- **Intake:** complete

## Problem

Coating defects are only caught at end-of-line inspection, after a full batch has run. By then the whole batch is often scrap.

## Current pain

Operators react to defects manually once inspection flags them. On a bad shift we scrap 40–60 parts before anyone adjusts the line. Roughly 2–3 such shifts a week.

## Desired outcome

An early signal from process telemetry that predicts a defect trend so the line can be adjusted before a batch is lost.

## Affected process

Coating line, quality inspection. Line operators and the shift quality lead.

## Frequency & scale

2–3 shifts per week with elevated scrap; ~150 parts/week lost.

## Constraints & context

Line PLC exposes temperature and viscosity tags. A prior manual SPC attempt was abandoned as too slow.

## People

| Role | Person |
|---|---|
| Requester | m.keller@example.com |
| Sponsor | <!-- required before G3 --> |
| Value owner | <!-- required before G3 --> |

## Gates

| Gate | Status | Date | By | Note |
|---|---|---|---|---|
| G1 Intake accepted | open | | | |
| G2 Prioritized | pending | | | |
| G3 Business case | pending | | | |
| G4 POC proven/stop | pending | | | |
| G5 Pilot proven | pending | | | |
| G6 Scale readiness | pending | | | |
| G7 Rollout complete | pending | | | |

## History

- 2026-06-30 — captured via portal intake (s1-intake playbook)
