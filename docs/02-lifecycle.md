# 02 — Lifecycle: Demand to Steady Operations

Eight stages, seven gates. A use case occupies exactly one stage. It moves only
by passing the gate at its stage exit.

```
S1 ─G1─ S2 ─G2─ S3 ─G3─ S4 ─G4─ S5 ─G5─ S6 ─G6─ S7 ─G7─ S8
```

## 2.1 Stage summary

| Stage | Name | Exit gate | Gate decision |
|---|---|---|---|
| S1 | Demand identification | G1 | Intake accepted |
| S2 | Demand shaping | G2 | Prioritized and sponsored |
| S3 | Assess & scope | G3 | Business case approved |
| S4 | Proof of concept | G4 | POC proven / stop |
| S5 | Pilot / local rollout | G5 | Pilot proven / scale |
| S6 | Scale enablement | G6 | Scale readiness — global templates approved |
| S7 | Global rollout | G7 | Rollout complete — run owner and cadence assigned |
| S8 | Steady operations & value tracking | — | No gate |

## 2.2 Stage definitions

---

### S1 — Demand identification

**Objective.** Capture the demand, the problem, and an initial value hypothesis.

**Entry.** Any employee submits through the shared front door, by any channel.

**Core activities.** Submit idea; define problem; identify sponsor and value
owner candidates; classify lane.

**Deliverable.** Intake record — `README.md` with problem statement and initial
value hypothesis.

**Accountability.** Lead: business (pull) or DU (push). Value owner named for
both routes. IT informed where relevant.

**Exit — GATE 1: intake accepted.** Authority: intake authority (DU triage).

Criteria:
- Six mandatory fields present or explicitly deferred
- Not a duplicate of an existing use case
- Problem is stated independently of any proposed solution
- Falls within the Digital Unit mandate, or is routed to the correct owner

**Risk carried.** Front-door logic must hold. Instant feedback on obvious
submission gaps is required to avoid the ticket-queue experience the portal
exists to replace.

---

### S2 — Demand shaping

**Objective.** Triage, classify, rank before delivery starts.

**Entry.** Accepted intake record only.

**Core activities.** Intake review; completeness check; lane assignment;
prioritization; sponsor identification.

**Deliverable.** Prioritized list, taxonomy assignment, shortlist decision.

**Accountability.** Lead: DU. Confirm: business. Decide: sponsor or portfolio
forum.

**Exit — GATE 2: prioritized and sponsored.** Authority: portfolio forum.

Criteria:
- Lane assigned and, for joint-triage categories, jointly agreed
- Named sponsor accepted the role
- Named value owner accepted the role
- Ranked against the current backlog
- Decision recorded: go, hold, or reject

**Risk carried.** Dual front-door logic with IT must stay unambiguous. Rejection
may frustrate requesters; mitigate with transparent criteria, feedback, and
reroute-to-backlog rather than silent closure.

---

### S3 — Assess & scope

**Objective.** Commit sponsor, KPI logic, baseline, scope, path, and indicative
global potential.

**Entry.** Prioritized item only.

**Core activities.** Confirm process, baseline, KPI owner, governance path,
success criteria. Draft the business case.

**Deliverable.** Scope note; KPI baseline; business case; resourcing view.

**Accountability.** Business owns process and value. DU owns setup. IT consulted
and controls integration path.

**Exit — GATE 3: business case approved.** Authority: sponsor and governance
approval.

Criteria:
- Baseline recorded with measurement method and data source
- At least one KPI with owner, unit, and target
- Business case marked `confidence: indicative` — global potential is directional
- Success criteria for POC defined *before* the POC starts
- Kill criteria defined
- 12-week review date recorded

**Risk carried.** Business case at entry uses indicative global potential. This
must be visible on the artifact, not implied. Detail is deliberately incomplete
at this gate.

---

### S4 — Proof of concept

**Objective.** Test whether the solution is feasible, fast enough.

**Entry.** Approved scoped initiative.

**Core activities.** Build test solution; run experiment; measure early impact.

**Deliverable.** POC result — feasibility and value evidence, recommendation.

**Accountability.** DU owns delivery and product governance. Business validates.
IT supports as needed.

**Exit — GATE 4: POC proven / stop.** Authority: evidence-based call.

Criteria:
- Measured against the success criteria set at G3, not against criteria written afterwards
- Feasibility demonstrated or refuted
- Explicit recommendation: continue, refine, or kill
- Where the concept fails, the kill is recorded with what was learned

**Risk carried.** The evidence threshold must be agreed and held. Vendor-based
POCs create speed pressure; the question of whether POC is a valid entry point
for pre-qualified vendor solutions remains open.

---

### S5 — Pilot / local rollout

**Objective.** Prove value in one domain with real adoption evidence.

**Entry.** Proven concept.

**Core activities.** Deploy in one site or domain; manage adoption; confirm fit.

**Deliverable.** Pilot result; adoption evidence; updated value case.

**Accountability.** DU leads pilot governance. Business owns UAT and adoption. IT
consulted.

**Exit — GATE 5: pilot proven / scale.** Authority: business and DU, jointly.

Criteria:
- KPI measured against the G3 baseline over a defined observation window
- Adoption evidence — usage, not availability
- Business case updated; figures may move from `indicative` to `committed`
- Local run model identified

**Risk carried.** A pilot must precede scaling. Whether a local pilot is a valid
proxy for global scaling is a live question — a single-plant result does not
automatically generalize across a heterogeneous plant network.

---

### S6 — Scale enablement

**Objective.** Build global templates and a reusable scale package under DU
governance.

**Entry.** Scale-approved pilot.

**Core activities.** Produce global templates, blueprint, standards, reusable
assets.

**Deliverable.** Global templates; scale package; scale-readiness pack.

**Accountability.** Lead: DU (scale enablement and templates). IT consulted on
standards.

**Exit — GATE 6: scale readiness — global templates approved.** Authority: global
template approval body.

Criteria:
- Template validated against at least one plant other than the pilot site
- Plant-variant handling documented
- Operating and support model defined
- Full global business case mandatory at this gate — the indicative figure from G3
  is replaced by an evidence-backed one

**Risk carried.** Scale criteria must be locked before this gate is used in
anger. Focusing on the largest plants may be sufficient as a global proxy;
this remains to be confirmed.

---

### S7 — Global rollout

**Objective.** Execute rollout with operational excellence and IT execution,
keeping DU scale governance intact.

**Entry.** Approved templates and accepted scale package.

**Core activities.** Roll out across sites and regions; OpEx and IT execute; DU
tracks value and governs.

**Deliverable.** Rollout completion record; run-readiness confirmation; handover
pack.

**Accountability.** Execute: DU / OpEx / IT (split to be confirmed).
Accountable for scale governance and value: DU. Run acceptance: IT.

**Exit — GATE 7: rollout complete — run owner and cadence assigned.**

Criteria:
- Rollout complete against the plant list, or remaining sites explicitly deferred
- Run-readiness criteria met
- Named run owner accepted the handover record
- Value-tracking cadence agreed

**Risk carried.** The OpEx/IT execution split must be confirmed. DU governance
must not become hollow after G5 — accountability for value has to survive the
transfer of execution.

---

### S8 — Steady operations & value tracking

**Objective.** Transfer a stable run; keep value tracking against baseline.

**Entry.** Scaled solution in run.

**Core activities.** Track KPI cadence; escalate gaps; optimize or retire.

**Deliverable.** Runbook or service model; KPI pack; periodic value review.

**Accountability.** IT owns stable solution operations where applicable. DU
retains value oversight. Business tracks outcomes.

**Exit.** None. A use case leaves S8 only by retirement, which is recorded with a
reason and a final value statement.

**Risk carried.** Post-handover product ownership and the durability of DU
accountability remain open. Without a named value owner surviving the handover,
S8 degrades into unmonitored run.

---

## 2.3 Gate mechanics

A gate is a pull request against the use-case repository. The pull request:

1. Sets `gates.G<n>.status` to `passed`, `killed`, or `parked`
2. Sets `stage` to the next stage
3. Adds the next stage's artifact scaffold

Merge authority is enforced by `CODEOWNERS`, generated from the use case's plant
and lane. The portal opens the pull request; it never merges it.

CI blocks a pull request that:
- Passes G(n) while G(n-1) is not passed
- Sets a stage inconsistent with the gate being passed
- Marks a business case `committed` before S5
- Omits a required field for the target stage

### Non-progression outcomes

| Outcome | Meaning | Effect |
|---|---|---|
| **Pass** | Criteria met | Advance to next stage |
| **Hold** | Criteria not yet met, work continues | Stage unchanged, reason recorded |
| **Park** | No sponsor, no capacity, or blocked by dependency | Stage unchanged, `parked: true`, excluded from active portfolio, re-review date set |
| **Kill** | Will not proceed | Repository archived, reason and learning recorded, remains searchable |

Kill is a successful outcome of a gate. A portfolio with no kills at G4 is not
testing anything.

## 2.4 Accountability model

Roles are recorded as fields on the use case. They are distinct from portal
authorization roles ([04](04-rbac.md)) — being named sponsor does not by itself
grant merge rights, and holding merge rights does not make someone the sponsor.

| Role | Named at | Responsibility |
|---|---|---|
| Requester | S1 | Stated the problem; consulted on scope changes |
| Lead | S2 | Drives the use case through the lifecycle |
| Sponsor | S2 | Owns the decision to invest; approves G3 |
| Value owner | S2 | Owns the baseline, the KPI, and the measured result |
| Business owner | S3 | Owns the process being changed |
| Delivery lead | S4 | Owns build and evidence |
| Run owner | S7 | Accepts operational responsibility |

Rule: the requester may not be the sole approver of any gate on their own use
case.

## 2.5 Where the lifecycle turns agentic

Classification per stage, used to target AI investment rather than to describe
capability.

| Level | Meaning |
|---|---|
| **L1** | Agentic organisation — the workflow changes shape: sequence, capacity, hand-offs |
| **L2** | AI-enhanced step — one task gets faster; the workflow is unchanged |

| Stage | Level | Opportunity | AI role |
|---|---|---|---|
| S1 | L1 · high | Always-on intake, no ticket queue | Conversational intake, classification, deduplication |
| S2 | L1 · high | Standing triage keeps a live backlog | Continuous re-scoring, staleness detection, merge proposals |
| S3 | L2 · medium | Business-case drafting, indicative only | Draft from demand plus comparables |
| S4 | L2 · medium | Rapid build and eval | Draft evaluation and continue/stop recommendation |
| S5 | L2 · medium | Adoption and KPI telemetry | Draft KPI spec, summarize adoption evidence |
| S6 | L2 · low | Template generation | Generalize pilot artifacts into templates |
| S7 | L2 · low | Rollout orchestration and deviation | Sequence plan, flag deviation from template |
| S8 | L1 · high | Autonomous value tracking as standing service | Scheduled variance analysis against business case |

**Strategy.** Reshape the front end (S1–S2) and steady state (S8) as agentic
workflows. Treat the middle stages as step-enhancement until the front end
proves out.

The rationale is that S1, S2, and S8 are where work is currently *not done* —
demand goes uncaptured, backlogs go stale, value goes unmeasured. Agentic
capability there creates work that did not previously exist. In S3–S7 the work is
already being done by people; AI makes it faster but does not change who decides.
