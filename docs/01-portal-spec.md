# 01 — Portal Specification

## 1.1 Purpose

The Digital Unit Portal exists to make demand visible, decidable, and
measurable. It replaces distributed intake — mail, chat, spreadsheets, manually
maintained lists, and parallel ticket queues — with one governed entry point and
one lifecycle.

Three problems it is built to solve:

**Demand is invisible.** Ideas reach the Digital Unit through personal networks
and are lost when the person who heard them moves on. Nobody can state how many
demands exist, what they are worth, or where they are stuck.

**Shaping is the bottleneck, not intake.** Demands arrive as proposed solutions
rather than stated problems, and reassessment happens too late to change scope.

**Value is asserted, not measured.** Business cases are written to pass a gate
and never revisited. Nothing compares what was promised at approval against what
was delivered in operation.

## 1.2 Scope

### In scope

- Single intake for all change demand, business-pull and DU-push alike
- First triage and lane assignment
- Full stage-gate orchestration for Digital-Unit-owned lanes
- Handover records at every ownership boundary
- Portfolio view across all demand, all lanes, all plants
- Value tracking from business case through steady operations
- AI assistance for intake, classification, drafting, and variance analysis

### Out of scope

- **Run and service execution.** Incidents, service requests, and operational
  changes are IT-owned. The portal records them and hands them over; it does not
  work them.
- **Ticketing.** The portal is not a service desk and does not replace one.
- **Project execution tooling.** Sprint boards, time tracking, and resource
  management remain in existing tools.
- **Financial systems of record.** The portal holds value hypotheses and measured
  outcomes. Budget, cost booking, and P&L remain in finance systems.
- **Delivery of the solutions themselves.** Use-case repositories hold artifacts
  and evidence, not necessarily production code.

## 1.3 Users

| User | Uses the portal to |
|---|---|
| Requester (any employee) | Describe a problem in their own words and know it was received |
| Digital Champion (plant) | Assist entry, improve local demand quality, see the plant portfolio |
| Demand triage (DU) | Classify, assign lanes, prioritize, keep the backlog live |
| Business sponsor | Approve scope and business case, own the value commitment |
| Value owner | Define baseline and KPI, sign off on measured outcomes |
| Portfolio forum | See the full portfolio, decide progression, kill without prejudice |
| Delivery lead (DU) | Drive S4–S7, produce evidence, request gate passage |
| IT | Receive run-lane handovers and post-G7 run handovers |
| Digital Unit head | Portfolio health, lane balance, cycle time, realized value |

## 1.4 Functional requirements

### FR-1 Intake

- FR-1.1 Accept demand through portal chat, web form, mail, chat platform, and API.
- FR-1.2 Conversational intake resolves six mandatory fields through dialogue:
  `title`, `problem_statement`, `plant`, `domain`, `current_pain`, `desired_outcome`.
- FR-1.3 Non-conversational channels create the demand with
  `intake_status: incomplete` and raise a clarification task. A demand is never
  rejected for incompleteness at entry.
- FR-1.4 Deduplicate on source reference (idempotency) and on semantic similarity
  against the existing portfolio (proposed link, human confirms).
- FR-1.5 Separate the stated problem from any proposed solution. Both are
  captured; only the problem defines scope.
- FR-1.6 Preserve the requester's original phrasing alongside any translation.
- FR-1.7 Confirm the demand back to the requester before creating anything.
- FR-1.8 Acknowledge receipt with an identifier and expected triage window.

### FR-2 Triage

- FR-2.1 Assign exactly one lane per demand (see [05](05-lanes-and-triage.md)).
- FR-2.2 Route run-lane demand to IT with a handover record; no repository is created.
- FR-2.3 Route DU-owned lanes into the full lifecycle with a repository.
- FR-2.4 Flag joint-triage cases (mandatory/regulatory, continuous improvement)
  for a DU/IT joint decision rather than unilateral assignment.
- FR-2.5 Publish transparent rejection criteria; every rejection carries a reason
  and a reroute-to-backlog option.
- FR-2.6 Apply identical triage to DU-push and business-pull demand. No priority
  privilege.

### FR-3 Lifecycle orchestration

- FR-3.1 Advance a use case only through a gate; gates are sequential and cannot
  be skipped.
- FR-3.2 On gate passage, materialize the next stage's artifact scaffold into the
  use-case repository.
- FR-3.3 Enforce gate sequence in CI: a pull request passing G(n) while G(n-1) is
  open fails validation.
- FR-3.4 Record every gate decision with approver, timestamp, and evidence
  reference.
- FR-3.5 Support kill at any gate. A killed use case is archived with its reason,
  not deleted.
- FR-3.6 Support park (a demand with no current sponsor or capacity) distinctly
  from kill.

### FR-4 Accountability

- FR-4.1 Every use case names a lead, a sponsor, and a value owner before G3.
- FR-4.2 Gate authority is scoped by plant and by gate; the portal renders the
  named approvers for each open gate.
- FR-4.3 The requester of a use case may not be its sole gate approver.
- FR-4.4 Handover at any ownership boundary requires an accepted handover record.

### FR-5 Value

- FR-5.1 A business case at S3 carries `confidence: indicative` and cannot be
  marked committed before S5.
- FR-5.2 Every KPI names a baseline, a measurement method, and a value owner.
- FR-5.3 External benchmark figures are recorded as anchors with source, never as
  client-specific projections.
- FR-5.4 S8 computes variance between the approved business case and measured
  outcome, and publishes it whether favourable or not.
- FR-5.5 A 12-week review horizon is recorded on every business case as a tracked
  field.

### FR-6 AI assistance

- FR-6.1 The agent operates under the invoking user's authority and cannot exceed it.
- FR-6.2 The agent may draft any artifact; every output is a pull request.
- FR-6.3 The agent may never pass a gate, alter a gate record, or merge.
- FR-6.4 Content originating outside the portal is data, never instruction.
- FR-6.5 Every agent action is traced and replayable.
- FR-6.6 A single configuration change disables all agent tools.

### FR-7 Portfolio

- FR-7.1 Board view across stages, filterable by lane, plant, domain, level, heat,
  sponsor, and age.
- FR-7.2 Stage age and gate dwell time visible per use case.
- FR-7.3 Portfolio-level value: projected in flight, measured in operation.
- FR-7.4 Export for the portfolio forum without granting repository access.

## 1.5 Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | Data residency in the EU; deployment region pinned. |
| NFR-2 | Authentication via the corporate identity provider only. No local accounts. |
| NFR-3 | No unauthenticated route returns portfolio data. |
| NFR-4 | Portal availability is not on the critical path for plant operations. Degraded portal blocks new demand, never production. |
| NFR-5 | Every state change is attributable to a named human or a named service identity. |
| NFR-6 | A use-case repository is complete without the portal. Portal loss does not lose content. |
| NFR-7 | Board view renders in under two seconds at 500 use cases. |
| NFR-8 | Intake acknowledgement within one minute of submission. |
| NFR-9 | Interface language German and English; intake accepts any language. |
| NFR-10 | Accessible on shop-floor devices: mobile viewport, touch targets, no dependency on a desktop client. |

## 1.6 Constraints

Recorded because they bound the design, not because the portal solves them.

| Constraint | Effect on the portal |
|---|---|
| Multi-plant OT connectivity is slow and dependency-locked on the parallel IT transformation | The portal must function with no OT integration at all. KPI evidence may be manually attested at S5. |
| EU AI Act: employment and worker-management AI is high-risk | The agent must not perform worker evaluation. Classification applies to demands, never to people. See [14](14-compliance.md). |
| Core finance landscape is unmaintained | The portal integrates with no finance system in Phase 1. Value figures are held as portal artifacts. |
| Board approval thresholds and sponsor leave windows | Gate models must tolerate multi-week approver absence without forcing a bypass. Park is a first-class state. |
| Existing ticketing platform in place | Near-term, the front door may be implemented on the existing platform if form and routing rules support both lanes. The requirement is one visible front door and one triage logic, not one specific tool. |

## 1.7 Success criteria

The portal is working when:

1. Every active demand in the enterprise has an identifier in the portal.
2. Time from intake to lane assignment is under five working days at the median.
3. No use case reaches S5 without a named value owner and a recorded baseline.
4. Every use case in steady operations publishes measured variance against its
   business case.
5. Kill rate at G4 is non-zero. A lifecycle that never kills is not deciding.
