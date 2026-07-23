# Requirements · UC-2026-0072 · Digital shift handover for maintenance

> Auto-generated from the intake by the requirements-analysis agent on 2026-07-22. Draft — requirements are refined and prioritised by a human; nothing here passes a gate.

## Epics

| ID | Epic | Description |
|---|---|---|
| E1 | A structured digital handover that carries open issues, part | A structured digital handover that carries open issues, part status and half-done work across shifts. |
| E2 | Condition monitoring | Collect equipment signals that precede failure. |
| E3 | Predictive alerting | Flag a developing failure before it stops the line. |

## User stories

### E1 — A structured digital handover that carries open issues, part

- **US-1** _(must)_ — As a **maintenance technician**, I want a structured digital handover that carries open issues, part status and half-done work across shifts, so that the problem is prevented (Each handover takes 20–30 minutes and things still fall through).
  - Acceptance criteria:
    - Given the situation described, when the solution is in use, then the desired outcome is achieved: A structured digital handover that carries open issues, part status and half-done work across shifts.
    - Given a relevant event, when it occurs, then the responsible user is informed in time to act.
    - Given any produced figure, when it is shown, then its confidence state is visible (never presented as committed prematurely).

### E2 — Condition monitoring

- **US-2** _(should)_ — As a **reliability engineer**, I want condition monitoring in place, so that the solution is reliable and fits the workflow.
  - Acceptance criteria:
    - Given the required data (PLC / SCADA tags), when it is unavailable, then the user sees a clear degraded state rather than a wrong result.
    - Given a user action, when it is taken, then it is recorded so the run is auditable.

### E3 — Predictive alerting

- **US-3** _(should)_ — As a **maintenance planner**, I want predictive alerting in place, so that the solution is reliable and fits the workflow.
  - Acceptance criteria:
    - Given the required data (PLC / SCADA tags), when it is unavailable, then the user sees a clear degraded state rather than a wrong result.
    - Given a user action, when it is taken, then it is recorded so the run is auditable.

## Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Reliability | Missed-failure and false-alarm rates are within agreed bounds. |
| NFR-2 | Integration | Alerts flow into the CMMS as actionable work orders. |
| NFR-3 | Latency | Warning lead time is long enough to plan an intervention. |

## Assumptions

- The data sources (PLC / SCADA tags, CMMS, vibration / temperature sensors) are accessible and reliable enough.
- The affected users can adopt the change within their existing workflow.

## Risks

- Data quality or availability is insufficient for the desired signal.
- Adoption by the maintenance technician is not sustained after go-live.
- Integration effort with existing systems is underestimated.

## Open questions

- Who is the sponsor, and who is the value owner?
- Which standard applies, and what does it require (ISO 55000 (asset management))?

## Out of scope

- Roll-out to other plants (handled at the scale stage, S6).
- Changes to adjacent systems beyond the integration needed for this outcome.
