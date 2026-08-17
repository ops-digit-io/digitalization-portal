# Run-lane handovers

Run-lane demand receives no repository. It is recorded here and handed to
Operations IT Support (`docs/03-data-model.md §3.12`). One table row per handover,
with a prose block below carrying the demand, triage rationale, and the accepted
external reference.

> **This is a service, not a drop-off.** The run lane used to end here: a demand
> was classified `run`, a row was written, and nothing said who carried it or to
> what standard. `Service`, `Region`, `Team owner` and `Severity / SLA` make the
> lane an operated service with a team behind it — which is what the
> `service-catalog` section in Department OS describes and what `/handovers`
> renders.
>
> `Team owner` names a **team**, never a person. Per-person load is out of scope
> by design (`docs/14-compliance.md`, constraint #6): a gap here is a finding
> about the service, never about a colleague.

**Services** — the catalogue the run lane hands into:

- **OT connectivity** — a system or signal stopped reaching the namespace.
- **Shopfloor application** — MES/SCADA client faults, sessions, printing.
- **Access & identity** — accounts, roles, plant-floor authorisations.
- **Data quality** — a value arrives but is wrong, stale or mis-scaled.
- **Change request (small)** — a bounded change that needs no gate.

**Severity / SLA** — response, in plant local hours:

- `S1` production stopped — 30 min, 24×5 follow-the-sun
- `S2` production degraded — 2 h, regional hours
- `S3` single workplace — 1 working day, regional hours
- `S4` request / question — 3 working days, regional hours

| ID | Title | Plant | Domain | Service | Region | Team owner | Severity / SLA | Requester | Decided | By | External ref | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| HO-2026-001 | Historian stopped publishing line 3 | DE-ALD | ot_integration | OT connectivity | Europe | Ops IT Europe | S2 | Fertigung | 2026-06-11 | triage | INC-48213 | closed |
| HO-2026-002 | MES client cannot print travellers | SK-PUC | production | Shopfloor application | Europe | Ops IT Europe | S3 | Schichtleitung | 2026-06-19 | triage | INC-48377 | closed |
| HO-2026-003 | New shift needs plant-floor roles | US-GRV | hr | Access & identity | Americas | Ops IT Americas | S4 | HR Grove City | 2026-07-02 | triage | REQ-11902 | closed |
| HO-2026-004 | Extruder temperatures read 10× too high | CN-SUZ | quality | Data quality | Asia | Ops IT Asia | S2 | Qualität | 2026-07-15 | triage | INC-48901 | open |
| HO-2026-005 | Gauge offline after network change | DE-VIE | ot_integration | OT connectivity | Europe | Ops IT Europe | S1 | Fertigung | 2026-07-28 | triage | INC-49044 | closed |
| HO-2026-006 | Add a scrap reason code to the MES list | PL-BAR | quality | Change request (small) | Europe | Ops IT Europe | S4 | Qualität | 2026-08-04 | triage | REQ-12088 | open |

## HO-2026-004 — Extruder temperatures read 10× too high

**Demand.** Quality reported that extrusion-zone temperatures on line 7 arrive an
order of magnitude too high in the reports, making the process capability figures
unusable.

**Triage rationale.** Classified `run`, not `data_ai`: the value exists and is
being transported, so this is a defect in an operating service rather than a
change to the portfolio. It is a `Data quality` call at S2 — the process runs, the
evidence about it does not.

**Note for the roadmap.** The unit is missing from the payload because line 7
publishes point-to-point rather than through the namespace, so nothing enforces a
unit contract. `STD-UNS-04` (payload and units per signal) is the standard that
closes this class of defect, and it is still in draft. This handover is one
concrete instance of the cost.
