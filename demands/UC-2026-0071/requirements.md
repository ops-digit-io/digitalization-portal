# Requirements · UC-2026-0071 · Predictive scrap alerts on the coating line

> Auto-generated from the intake by the requirements-analysis agent on 2026-07-22. Draft — requirements are refined and prioritised by a human; nothing here passes a gate.

## Epics

| ID | Epic | Description |
|---|---|---|
| E1 | An early signal from process telemetry that predicts a | An early signal from process telemetry that predicts a defect trend so the line can be adjusted before a batch is lost. |
| E2 | Defect capture & classification | Record defects and cause codes consistently at source. |
| E3 | Root-cause analytics | Attribute scrap/rework to drivers and surface trends. |

## User stories

### E1 — An early signal from process telemetry that predicts a

- **US-1** _(must)_ — As a **line operator**, I want an early signal from process telemetry that predicts a defect trend so the line can be adjusted before a batch is lost, so that the problem is prevented (Operators react to defects manually once inspection flags them).
  - Acceptance criteria:
    - Given the situation described, when the solution is in use, then the desired outcome is achieved: An early signal from process telemetry that predicts a defect trend so the line can be adjusted before a batch is lost.
    - Given a relevant event, when it occurs, then the responsible user is informed in time to act.
    - Given any produced figure, when it is shown, then its confidence state is visible (never presented as committed prematurely).

### E2 — Defect capture & classification

- **US-2** _(should)_ — As a **shift quality lead**, I want defect capture & classification in place, so that the solution is reliable and fits the workflow.
  - Acceptance criteria:
    - Given the required data (MES), when it is unavailable, then the user sees a clear degraded state rather than a wrong result.
    - Given a user action, when it is taken, then it is recorded so the run is auditable.

### E3 — Root-cause analytics

- **US-3** _(should)_ — As a **quality engineer**, I want root-cause analytics in place, so that the solution is reliable and fits the workflow.
  - Acceptance criteria:
    - Given the required data (MES), when it is unavailable, then the user sees a clear degraded state rather than a wrong result.
    - Given a user action, when it is taken, then it is recorded so the run is auditable.

## Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Traceability | Every defect record is linked to batch, line, and shift. |
| NFR-2 | Latency | In-process signals arrive fast enough to correct the running batch. |
| NFR-3 | Data quality | Cause codes are validated against a controlled list. |

## Assumptions

- The data sources (MES, inspection system, SPC / process telemetry) are accessible and reliable enough.
- The affected users can adopt the change within their existing workflow.

## Risks

- Data quality or availability is insufficient for the desired signal.
- Adoption by the line operator is not sustained after go-live.
- Constraints noted at intake: Line PLC exposes temperature and viscosity tags. A prior manual SPC attempt was abandoned as too slow.

## Open questions

- Who is the sponsor, and who is the value owner?
- Which standard applies, and what does it require (ISO 9001, IATF 16949 (automotive))?

## Out of scope

- Roll-out to other plants (handled at the scale stage, S6).
- Changes to adjacent systems beyond the integration needed for this outcome.
