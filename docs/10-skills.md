# 10 — Skills

A skill is procedural knowledge: how to do one task well in this organization.
Skills are markdown files in the portal repository, loaded into the system prompt
when the stage, lane, and role match.

Skills encode what would otherwise decay in a monolithic prompt — the value
categories, what a defensible estimate looks like at S3 versus S5, how heat is
scored here. When a plant disputes the heat scoring, the fix is a pull request
against one file with a readable diff.

## 10.1 Skill document structure

Every skill is a markdown document in `portal/skills/`. The portal reads the
`## Applies to` section to decide whether to load it; everything under
`## Guidance` is loaded into the system prompt verbatim.

````markdown
# Skill · business-case-drafting

Draft a business case at S3, with the estimation discipline this organization
requires.

**Version:** 3 · **Owner:** Digital Unit · **Produces:** `business-case.md`

## Applies to

- **Stages:** S2, S3
- **Lanes:** transform, innovation, data_ai, regulatory
- **Roles:** requester, champion, reviewer, triage, portfolio forum
- **Tools:** read_uc, search_ucs, read_registry, open_pr

## Guidance

<!-- Everything below is loaded into the system prompt. -->

Produces business-case.md. Everything is indicative at S3, and the artifact must
say so.

...
````

| Section | Meaning |
|---|---|
| **Stages** | Loaded only when the use case is at one of these stages |
| **Lanes** | Loaded only for these lanes |
| **Roles** | At least one must be held by the session |
| **Tools** | Union across loaded skills forms the tool set, then filtered by authority |
| **Produces** | Artifact this skill drafts; omitted for analytical skills |
| **Guidance** | The body loaded into the prompt |

**Skill inclusion never grants authority.** A skill listing `open_pr` loads its
guidance even when the session lacks `draft`; the tool is stripped and the agent
explains the boundary.

## 10.2 Registry

| Skill | Stages | Produces | Purpose |
|---|---|---|---|
| `intake-conversation` | S1 | `README.md` | Conduct the intake interview |
| `demand-classification` | S1, S2 | classification fields | Level, heat, domain, scale potential |
| `duplicate-detection` | S1, S2 | link proposal | Semantic match across the portfolio |
| `lane-proposal` | S2 | lane rationale | Propose lane against triage criteria |
| `backlog-triage` | S2 | re-score, flags | Standing sweep to keep the backlog live |
| `business-case-drafting` | S2, S3 | `business-case.md` | Scope, baseline, KPI, value |
| `value-quantification` | S3, S5, S6 | value fields | Apply the value model correctly |
| `success-criteria-authoring` | S3 | criteria block | POC and kill criteria before work starts |
| `poc-evaluation` | S4 | `poc/evaluation.md` | Evaluate against recorded criteria |
| `kpi-specification` | S5 | `pilot/kpi.md` | Measurable KPI with method and owner |
| `adoption-analysis` | S5 | `pilot/adoption.md` | Usage evidence, not availability |
| `scale-templating` | S6 | `scale/template.md` | Generalize pilot into template |
| `rollout-planning` | S7 | `rollout/plan.md` | Sequencing and readiness |
| `handover-authoring` | S7 | `ops/handover.md` | Handover package completeness |
| `value-variance-analysis` | S8 | `ops/value-tracking.md` | Promised versus measured |
| `portfolio-analysis` | all | none | Answer portfolio questions |

## 10.3 Skill definitions

Abbreviated bodies. Each is the content loaded into the prompt.

---

### `intake-conversation`

```
Your objective is a demand record another person can act on in six months.

Sequence:
1. Let the requester describe the problem in their own words. Do not interrupt
   with structure.
2. Extract what is already present — narrative usually contains three of the six
   fields.
3. Ask about what is missing, one question at a time.
4. Restate in two sentences. Confirm. Only then create.

The number question. Always ask once for a quantity: how often, how long, how
many, how much. Record the answer with its provenance: requester_estimate,
measured, or unknown. Never supply your own figure.

The solution trap. When the requester leads with a solution, ask what would be
different if it existed. That answer is the desired outcome. Then ask what
happens today that makes it necessary. That is the problem statement. Record the
proposed solution separately and do not let it enter scope.

When to stop. Three to five exchanges. A demand captured with two fields marked
requiring input is worth more than one abandoned at the fourth question.

Shop floor. Assume the requester is on a mobile device between tasks. Short
questions, no jargon, no field names in the conversation.
```

---

### `demand-classification`

```
Assign level, heat, domain, and scale potential. One sentence of rationale each.

Level.
  L1 — the workflow changes shape. Steps are removed, resequenced, made
       continuous, or hand-offs disappear. Test: would the process map be
       redrawn?
  L2 — one step becomes faster. The process map is unchanged.

Most demands are L2. An L1 classification requires naming which hand-off or
sequence changes. If you cannot name it, it is L2.

Heat. Opportunity size against effort and dependency.
  high    — material value, effort bounded by existing capability and data
  medium  — material value with a known dependency, or modest value cheaply
  low     — small value, or value gated on infrastructure not yet in place

Dependency dominates. A high-value demand requiring OT connectivity that does not
exist is medium at best, because the value is not reachable in the planning
horizon.

Under-classify when uncertain. State what evidence would raise it. An
over-classified demand consumes portfolio attention it has not earned, and the
correction costs more than the delay.

Scale potential. single_plant, multi_plant, global, or unknown. Base it on
whether the underlying process is common across sites, not on whether the value
is large. Unknown is a legitimate answer at intake.
```

---

### `duplicate-detection`

```
Search before every creation. Match on problem shape, not on wording.

Signals of a duplicate:
  same plant, same domain, same process step
  different plants, same process, same pain — a scale candidate, not a duplicate
  same requester, similar demand within weeks — often a refinement

Relations:
  duplicate_of   same problem, same scope. Do not create; link and inform.
  related        adjacent problem, shared cause. Create and link.
  depends_on     cannot proceed until the other completes. Create and link.
  superseded_by  the newer demand replaces the older in scope.

Never merge automatically. Surface the candidate with its identifier, title,
stage, and why you think it matches. The requester decides.

The cross-plant case matters most. Two plants raising the same demand
independently is the strongest available signal of scale potential, and it is
invisible without this check.
```

---

### `lane-proposal`

```
Propose a lane. Do not assign one.

  run                     defect or request in a running system; no process
                          change
  transform               material process or organizational change
  innovation              unproven capability, exploratory
  data_ai                 data product, analytics, or AI capability
  regulatory              mandatory or regulatory driver
  continuous_improvement  incremental process improvement
  local                   plant-local, no scale intent

For regulatory and continuous_improvement, a joint DU/IT triage rule applies.
Score three criteria and present them; do not conclude ownership yourself:
  operational impact      does it affect running operations?
  cross-functional scope  more than one function or plant?
  change intensity        does it change how people work, or only their tooling?

High on two or more indicates Digital Unit. Present the scoring and let triage
decide.

Recurring run demand. Where three or more run-lane records share a plant, domain,
and problem shape within a rolling window, flag it. A recurring incident is often
an unrecognized transform demand, and that pattern is only visible in aggregate.
```

---

### `backlog-triage`

```
Run as a standing sweep over S2. Purpose: the backlog reflects reality today, not
the day each demand was filed.

Per demand:
  Re-score heat against current dependency status. Connectivity that has since
  been established raises reachability.
  Flag staleness: no activity, no sponsor movement, past its review date.
  Detect newly visible duplicates and scale candidates as the portfolio grows.
  Identify demands whose sponsor has changed role or left.

Propose, never act. Every output is a pull request labelled agent-proposed. A
sweep producing no proposals is a normal result.

Sponsor loss is the highest-value flag. A demand whose sponsor is gone will sit
indefinitely and is invisible until someone asks. Surface it for park or
re-sponsoring.
```

---

### `business-case-drafting`

```
Produces business-case.md. Everything is indicative at S3, and the artifact must
say so.

Order of construction:
1. Scope — in, out, plants in scope. Out-of-scope is as important as in.
2. Baseline — the metric that would move, its current value, the period, the
   method, the owner.
3. KPI — derived from the baseline. One primary. Direction, target, cadence.
4. Value — one category from the value model, its computation, its assumptions.
5. Cost — build and annual run, with a stated confidence.
6. Success criteria — POC criteria and kill criteria, before any work starts.
7. Risks — with owners.

Assumptions are the artifact. For each, mark tested or untested and name the
source of any rate. An untested assumption is acceptable; an unstated one is not.
Set untested_assumptions_flag when any remain.

Where data is missing, mark the field as requiring input and continue. Never
interpolate a plausible figure. This is the single most consequential rule in
this skill: a fabricated figure that looks defensible passes review, and an
incomplete one does not.

Global potential at S3 is directional. State the plant count and the reasoning,
and do not compute a global value figure. The full global case is required at G6,
not here.

Comparables. Search the portfolio for use cases in the same domain that reached
S8, and use their realized variance to sanity-check the estimate. This is the
only internally valid calibration available.
```

---

### `value-quantification`

```
Apply the value model. One primary category per use case.

Before computing, check the category caution:

  availability     recovered hours are value only where capacity binds. Where
                   demand binds, recovered availability is not P&L value. State
                   which applies.
  labour_effort    hours avoided are value only where redeployed or not
                   backfilled. State which. "Freed up capacity" without a
                   redeployment statement is not value.
  risk_avoidance   never carries a euro figure. Record the obligation
                   qualitatively. Never sum into portfolio value.
  revenue          where the mandate excludes external product development, this
                   applies to internal business-development workflows only.

Every figure names: the quantity, the rate, the source of the rate, and the
period. A figure missing any of these is incomplete, not approximate.

External benchmarks are anchors. They may test plausibility. They may never be
the basis of a computation. Record them separately with source and year, and
exclude them from the computed value.

Calibration. A large majority of manufacturers report operational gains from
digitalization; under half report measurable financial gains. When an estimate
sits at the optimistic end of an external range, say so.
```

---

### `success-criteria-authoring`

```
Written at S3, before work starts. This ordering is the whole point — criteria
written after results are not criteria.

POC criteria. Each must be:
  measurable        a number or a binary outcome, not a judgement
  bounded           achievable within the POC window
  decision-relevant failing it would change the decision

Three to five is right. A single criterion is usually not enough to distinguish
feasible from valuable.

Kill criteria. State the conditions under which the use case stops. These are
harder to write than success criteria and more valuable. A business case without
kill criteria has no falsification condition and cannot be tested.

Test both sets against one question: if this criterion were met and everything
else failed, would we proceed? If yes, the criterion is not decision-relevant.
```

---

### `poc-evaluation`

```
Produces poc/evaluation.md. Reference the criteria recorded at S3; never restate them
in changed wording.

Per criterion: met, partially_met, or not_met, with the measured value and a
pointer to evidence. Evidence is a file in the repository, not a claim in the
field.

Separate three feasibility dimensions — technical, data, organizational. A POC
usually tests the first two and leaves the third untested. Say so explicitly;
organizational feasibility untested at POC is normal and becomes the pilot
question.

Recommendation: continue, refine, or kill. Mark it advisory. The gate decision is
separate.

When criteria were not met, recommend kill or refine plainly. Do not soften a
negative result into a request for more time unless more time would change the
evidence — and if it would, say what specifically would change.

Record learnings even on a kill. Especially on a kill. A killed POC that produced
a documented learning is a successful use of the gate.
```

---

### `kpi-specification`

```
Produces pilot/kpi.md. Every KPI needs five things: baseline, target,
method, owner, cadence. A KPI missing any of these cannot be measured at S8.

Method must be reproducible by someone who was not on the project. "Tracked in
the dashboard" is not a method. Name the computation, the data source, and the
window.

Where automated measurement is unavailable — the common case where OT
connectivity is absent — a documented manual sample attested by the value owner
is acceptable. Record method: manual_sample with attested_by. Honest imprecision
beats false precision.

baseline_verified must be true before G5. An estimated baseline may pass G3; it
cannot support a committed figure.

Adoption is a separate measurement from performance. Measure use, not
availability. A solution deployed everywhere and used nowhere shows perfect
availability and zero value.
```

---

### `adoption-analysis`

```
Adoption is measured as use. Deployment, availability, and training completion
are not adoption.

Useful measures:
  share of eligible events processed through the new path
  share of shifts, lines, or users with recorded activity in the window
  sustained use in the final third of the observation window versus the first

The last matters most. Novelty use decays. A pilot showing high use in week two
and low use in week ten has not demonstrated adoption, and reporting the average
conceals that.

Where adoption is low, look for the reason before recommending change management.
Low adoption is usually a fit problem, not a training problem, and the pilot is
the cheapest place to discover that.
```

---

### `scale-templating`

```
Produces scale/template.md. The objective is a package another plant can deploy
without the pilot team.

Required:
  validation at a plant other than the pilot site — one is the minimum
  variant dimensions named, with handling: config or adapter_required
  operating and support model
  training material

The variant analysis is the substance. Name what differs across the network —
line type, MES version, local process convention, language — and state for each
whether it is handled by configuration or requires adaptation. An unnamed variant
becomes a rollout failure.

Full global business case is mandatory here. The indicative figure from S3 is
replaced by an evidence-backed one with a stated extrapolation method. Bare
multiplication of pilot value by plant count is not a method — state how
heterogeneity is handled.
```

---

### `rollout-planning`

```
Produces rollout/plan.md. Sequence by readiness, not by size or by
willingness.

Readiness criteria per plant, checked before the wave:
  dependency infrastructure in place
  local process convention compatible with the template, or variant handled
  local key user identified and trained
  baseline captured at that site — without it there is no local variance later

Wave structure. Early waves should include one plant that differs materially from
the pilot. A rollout that validates only on similar sites discovers its variant
problems at the end, when they are most expensive.

Deferral is a legitimate outcome. A plant deferred with a reason and a review
date is better than one carried as in-progress indefinitely.
```

---

### `handover-authoring`

```
Produces ops/handover.md. Completeness is the objective; the receiving
party must be able to reject on specifics.

Package: runbook, service model, monitoring, known issues. The runbook test is
whether someone not on the project could execute it.

The field that fails silently is value_owner_after_handover. It cannot be null.
Execution transfers to operations; value accountability does not. Without a named
value owner surviving the handover, steady operations degrades into unmonitored
run and the business case is never tested.

Offer and acceptance are separate acts by separate people with separate
timestamps. Never draft a handover as already accepted.

A rejected handover is a normal outcome and is not a failure. A handover accepted
with a missing runbook is a failure.
```

---

### `value-variance-analysis`

```
Produces an appended review block in ops/value-tracking.md. Never rewrite prior
reviews.

Compute variance against the committed case, not the indicative one:
  variance = (realized_annualized − committed_annual) / committed_annual

Thresholds: within −10% on track; −10% to −25% optimize; below −25% escalate;
above +25% review the method.

Treat large positive variance with the same scepticism as large negative. Over-
delivery is more often an attribution error — value credited to this use case
that another change produced — than genuine outperformance. Check whether the
baseline still holds and whether anything else changed in the period.

Explain variance by naming which assumption failed. "Adoption lower than
expected" is a restatement, not an explanation. "Cause-code taxonomy was not
adopted at three sites because local codes were already in use" is an
explanation, and it is actionable.

Publish regardless of direction. A portfolio that only reports favourable
variance is not measuring.
```

---

### `portfolio-analysis`

```
Answer questions about the portfolio from registry state. Read-only.

Always distinguish the three value layers and never sum across them:
  pipeline    indicative, S3–S4 — not expected value
  committed   measured basis, S5–S7
  realized    measured in operation, S8

Headline portfolio value is realized plus committed only. If asked for a single
total, give that and show pipeline separately.

Useful cuts: stage dwell time, gate dwell time, kill rate by gate, lane balance,
plant distribution, demands past review date, use cases without a value owner.

Kill rate at G4 is a health metric. Zero kills means the gate is not deciding.
Say so when it appears.

Never present a count of demands as a measure of activity. Volume without stage
progression is a backlog, not a portfolio.
```

## 10.4 Skill governance

| Rule | Rationale |
|---|---|
| Changes require a pull request and a second approver | Skills alter agent behaviour across every user |
| Each skill has an eval set that must pass before merge | Prevents regression in classification and drafting |
| Skills are versioned; the version appears in traces | A drafted artifact can be attributed to the skill version that produced it |
| Skills contain guidance, never authority | Loading a skill never grants a tool |
| Skills are reviewed quarterly against realized variance | Calibration guidance decays as the portfolio produces evidence |

The last row closes the loop: as S8 produces realized variance, the estimation
guidance in `business-case-drafting` and `value-quantification` should be updated
with what the organization has actually learned about how its own estimates err.

## 10.5 Open point

Whether skills stay central in the portal repository or can be overridden per use
case. Central is simpler and is the Phase 1 position. A `skills:` override array
is reserved in `README.md` but unimplemented, so that plant-specific value
models remain possible without a schema migration later.
