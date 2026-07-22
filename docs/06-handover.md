# 06 — Handover

Two ownership boundaries in the model, both requiring an accepted handover
record. An unaccepted handover is not a handover; it is an assumption.

| Boundary | When | From | To |
|---|---|---|---|
| Run-lane handover | At first triage | Portal / DU triage | IT |
| Run handover | At G7 | Digital Unit | IT operations |

## 6.1 Run-lane handover

Run demand enters the shared front door, is classified at triage, and routes to
IT. The portal creates **no repository**. It records the demand in the registry
and produces a handover record.

### Rationale

Creating a use-case repository for every service request would flood the fleet
with objects that never advance past S2 and would blur the boundary the split
model depends on. But discarding run demand at the door would mean the portal
cannot answer "how much demand does the enterprise actually generate?" — which is
one of the three problems it exists to solve.

Registry-only is the middle position: the demand is counted, its routing is
auditable, and the requester gets one identifier to follow, while execution
happens entirely in IT's own system.

### Record

Appended to `portal/registry/handovers.md`. See
[03.12](03-data-model.md#312-registryhandoversmd--run-lane) for the full
document shape.

Each record carries: identifier, title, plant, domain, requester, the demand and
its original phrasing, quantified pain with its provenance, the triage rationale,
the receiving IT queue, offer and acceptance timestamps, the accepting person,
and the external reference.

### Rules

- The registry record is **terminal** in the portal. The portal does not track
  resolution, SLA, or closure — those live in IT's system.
- `external_ref` is required at acceptance. Without it, the trail breaks at the
  boundary and the requester cannot follow their demand.
- The requester receives the external reference and the IT contact.
- **Return path.** If IT determines during work that the demand carries material
  change elements, it is returned with `status: returned` and re-enters triage at
  G1 with the run-lane record linked as a source. Returned demand is not a new
  demand.
- Run-lane records are counted in portfolio volume metrics but never in the
  stage-gate portfolio.

### Aggregation signal

Repeated run-lane records with the same problem shape are a demand signal, not
noise. The portal flags clusters — same plant, same domain, three or more records
in a rolling window — for triage review. A recurring incident is often an
unrecognized transform-lane demand.

## 6.2 Run handover at G7

The transfer of a scaled solution into steady operations. This is the handover
where value accountability is most likely to be lost, so the record is
correspondingly stricter.

### Record

See [03.9](03-data-model.md#39-handoverrun-handoveryml--g7) for the schema.

### Acceptance criteria

IT operations accepts only when all are true:

| Criterion | Evidence |
|---|---|
| Runbook exists and is executable by someone not on the project | `ops/runbook.md`, reviewed by receiving party |
| Service model defined — support tiers, response expectations, escalation | `ops/service-model.md` |
| Monitoring in place with defined alerting | `ops/monitoring.md` |
| Known issues documented with workarounds | `ops/known-issues.md` |
| Rollout complete or remaining sites explicitly deferred | `rollout/completion.md` |
| Named run owner identified and briefed | `ops/handover.md` — To |
| Value owner named for the post-handover period | `ops/handover.md` — Value owner after handover |

The last criterion is the one that fails silently in most organizations. G7
cannot pass with `value_owner_after_handover: null` — enforced in CI.

### What the Digital Unit retains

Execution transfers. Value accountability does not.

| Retained by DU | Transferred to IT |
|---|---|
| Value tracking against the business case | Incident response |
| KPI oversight and cadence | Change management for the running solution |
| Variance escalation | Capacity and availability |
| Decision to optimize or retire | Patching and lifecycle maintenance |

This split is what prevents DU governance becoming hollow after G5. The risk is
real and named in the process model: without retained value oversight, S8
degrades into unmonitored run and nobody ever learns whether the business case
was true.

### Rejection

IT may reject a handover. A rejected handover:
- Records the failing criteria
- Returns the use case to S7 with `gates.G7.status: open`
- Does not restart the rollout

Rejection is expected occasionally and is not a failure of the process. A
handover accepted despite a missing runbook is a failure of the process.

## 6.3 Handover state machine

```
offered ──accepted──▶ handed_over
   │
   ├──rejected──▶ returned to previous stage, criteria recorded
   │
   └──returned──▶ (run lane only) re-enters G1 triage
```

No handover skips `offered`. The portal does not permit a record created directly
in `handed_over` state — the offer and the acceptance must be separate acts with
separate timestamps and separate actors.

## 6.4 Open point

The OpEx / IT execution split at S7 is unconfirmed. Until it is settled, the
handover record names IT operations as the receiving party by default, with
OpEx recorded as a co-executing party where applicable. When the split is
confirmed, the receiving-party field may need to become a list rather than a
single org, and acceptance may need to be multi-party.
