# 05 — Lanes and Triage

## 5.1 The non-negotiable rule

> One intake, multiple lanes, explicit handover rules.

All change demand enters through one shared front door. Triage then routes it
into run or strategic change lanes. Digital-Unit-push demand — for example the
global scaling of a proven plant solution — follows the same intake template, the
same triage, and the same gates, with **no bypass and no priority privilege**.

Without this rule the model creates a dual front-door conflict, which is the
condition the portal exists to remove. Two front doors with different rules is
worse than one badly designed front door.

## 5.2 Operating model context

The portal implements the **split model**: the Digital Unit leads strategic
change demand; IT owns run and service demand and operational capacity
management. Full demand enters through one shared front door and one shared
taxonomy. After first triage, ownership diverges.

This was selected over IT-led demand management (which preserves the current
pain — weak shaping of change demand, business experiencing IT as the gatekeeper
for transformation) and over a fully centralized enterprise demand office in the
Digital Unit (high duplication risk with IT, weak fit to the non-run boundary,
too heavy for a lean first phase).

The split model's known weaknesses are the ones this document must address:
it needs explicit lane definitions and handover rules from day one, boundary
friction with IT is likely during setup, and it fails without sponsor and
value-owner discipline.

## 5.3 Lane taxonomy

Every demand receives exactly one lane at first triage.

| Lane | Definition | Owner from first triage | Portal behaviour |
|---|---|---|---|
| `run` | Service requests, incidents, maintenance, operational changes | IT | Registry record + handover. No repository. |
| `regulatory` | Mandatory or regulatory-driven change | Joint triage rule | Repository if change intensity is material |
| `continuous_improvement` | Incremental process improvement | Joint triage rule | Repository if cross-functional or change-intensive |
| `transform` | Transformation with material process or organizational change | Digital Unit | Full lifecycle |
| `innovation` | New capability, unproven, exploratory | Digital Unit | Full lifecycle |
| `data_ai` | Data products, analytics, AI capability | Digital Unit | Full lifecycle |
| `local` | Plant-local, no scale intent | Plant, DU informed | Lightweight lifecycle (S1–S5 only) |

### Lane assignment rules

```
run                    → IT-owned from first triage
transform              → Digital-Unit-owned from first triage
innovation             → Digital-Unit-owned from first triage
data_ai                → Digital-Unit-owned from first triage
regulatory             → joint triage rule required
continuous_improvement → joint triage rule required
local                  → plant-owned, Digital Unit informed
```

**Joint triage rule.** For `regulatory` and `continuous_improvement`, lane
ownership is decided jointly by DU and IT against three criteria:

1. **Operational impact** — does the change affect running operations?
2. **Cross-functional scope** — does it span more than one function or plant?
3. **Change intensity** — does it change how people work, or only what tooling
   they use?

High on two or more → Digital Unit. Otherwise → IT.

**Escalation clause.** Any IT initiative with material change elements triggers
Digital Unit involvement even where IT remains delivery owner for parts of the
work. Involvement here means named participation in shaping and value
definition, not delivery ownership.

## 5.4 Demand flow

```
1. Full demand enters one shared front door
     Two entry routes — business pull and DU push — one portal, one intake template

2. First triage classifies the demand
     Lane assignment: run, regulatory, CI, transform, innovation, data/AI, local

3. Run demand routes to IT
     Service requests, incidents, maintenance, operational changes
     → registry record + handover, no repository

4. Strategic change routes to the Digital Unit
     Transformation, innovation, cross-functional improvement, pilot
     → use-case repository, full lifecycle

5. Qualified items enter portfolio and stage-gates
     Entry prioritization looks at global potential indicatively
     Full global case only before scale

6. Scaled solutions hand over to run
     Run ownership to IT after service acceptance
     Value tracking may stay with the Digital Unit
```

Steps 3 and 6 are the two ownership boundaries. Both require a handover record —
see [06](06-handover.md).

## 5.5 Triage procedure

Triage happens at G1 (accept) and G2 (lane confirm, prioritize, sponsor).

### At G1 — intake acceptance

Decided by intake authority (DU triage), within a target of two working days.

| Check | Action if failed |
|---|---|
| Six mandatory fields present or deferred | Raise clarification task; do not reject |
| Not a duplicate | Propose link; requester confirms |
| Problem stated independently of solution | Ask the requester to separate; agent assists |
| Within enterprise change scope | Route to correct owner with a reason |

Outcome: `accepted` or `routed_elsewhere`. Rejection at G1 is rare — the gate
tests whether the demand is *understandable*, not whether it is *worth doing*.

### At G2 — lane, priority, sponsor

Decided by the portfolio forum, on a fixed cadence.

| Check | Action if failed |
|---|---|
| Lane assignable under 5.3 | Escalate to joint triage |
| Named sponsor accepted | Hold; a demand without a sponsor cannot be prioritized |
| Named value owner accepted | Hold |
| Value hypothesis plausible | Reject with reason, or reroute to backlog |
| Ranked against backlog | — |

Outcome: `go`, `hold`, `park`, or `reject`.

## 5.6 Rejection discipline

Rejection is the highest-risk moment in the portal, because it is where a
requester decides whether the front door is real. Three requirements:

1. **Transparent criteria.** The criteria in 5.5 are published in the portal.
   A requester can see in advance what will be assessed.
2. **Reason, always.** Every rejection carries a written reason referencing a
   specific criterion. "Not prioritized" alone is not a reason.
3. **Reroute to backlog, not closure.** A rejected demand moves to the backlog
   in `parked` status with a review date, unless it is out of scope entirely. It
   remains searchable and can be revived when circumstances change.

A requester whose demand is rejected receives the reason, the reviewer, and the
route to challenge it.

## 5.7 Prioritization

At G2, entry prioritization uses **indicative global potential**. The full global
business case is required only before scale (G6). This is deliberate: requiring a
defensible global case at entry would either block the backlog or produce
fabricated numbers.

Ranking inputs:

| Input | Source | Weight |
|---|---|---|
| Value hypothesis | `README.md` | Primary |
| Heat (opportunity vs effort) | Classification | Primary |
| Scale potential | Classification | Secondary |
| Strategic alignment | Portfolio forum judgement | Secondary |
| Dependency readiness | Constraints (OT, IT transformation) | Gating |
| Sponsor commitment | Named and accepted | Gating |

Dependency readiness and sponsor commitment are gating rather than weighted: a
high-value demand with no sponsor or an unmet hard dependency is parked, not
ranked highly and then stalled.

## 5.8 Portfolio control

Every active item runs as one review-horizon value gate with a pre-agreed
baseline, a named KPI owner, and real kill authority. No scaling without proven
value.

The 12-week horizon is recorded on each business case as
`review.horizon_weeks` and tracked on the board as a dwell indicator. It is
tracked, not automatically enforced — a breached horizon surfaces on the
portfolio view for the forum to act on, rather than triggering an automatic
state change. The judgement of whether a delay is acceptable belongs to the
forum, not to a timer.

## 5.9 Digital-Unit push

DU push covers demand the Digital Unit originates: global scaling of a proven
plant solution, capability build, platform enablement.

Rules:
- Enters the same front door with the same intake template
- Receives the same triage and lane assignment
- Passes the same gates with the same approvers
- Carries no priority privilege at G2
- Requires a named business sponsor exactly as pull demand does

A DU-push item without a business sponsor is parked. This rule is what keeps the
Digital Unit from becoming a self-referential portfolio.

## 5.10 Open points

Recorded rather than resolved. These are governance decisions, not design gaps.

| Open point | Affects |
|---|---|
| Whether the front door sits on the existing ticketing platform or a purpose-built portal near-term | Implementation path, not the model |
| Exact joint-triage decision forum and its cadence | G2 throughput |
| Whether `local` lane use cases require a sponsor | Plant autonomy vs portfolio discipline |
| Whether POC is a valid entry point for pre-qualified vendor solutions | S4 entry criteria |
| Whether a local pilot is a sufficient proxy for global scaling | G5 criteria |
| OpEx / IT execution split at S7 | Accountability at rollout |
