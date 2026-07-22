# 11 — Playbooks

A playbook is a versioned sequence of skill invocations, tool calls, and
checkpoints. Skills are *how*; playbooks are *when, in what order, and with what
approvals*.

Playbooks are markdown documents in `portal/playbooks/`. Changing how S3 drafting
works is a pull request with a reviewable diff — not a prompt edit in an admin
console. Because they are prose, a portfolio forum member can read a playbook and
understand what the agent will do, which is the point.

## 11.1 Document structure

Every playbook has the same four sections. The portal reads `## Trigger`,
`## Authority`, and `## Steps`; the rest is prose for humans.

````markdown
# Playbook · s3-business-case

Draft a business case for a use case at S3.

**Version:** 2

## Trigger

- **Stages:** S3
- **Lanes:** transform, innovation, data_ai, regulatory
- **Manual:** yes — invocable from the use-case page
- **Schedule:** none
- **Event:** none

## Authority

- **Roles:** requester, champion, reviewer, triage, portfolio forum
- **Identity:** invoking session

## Steps

### 1. Gather — skill `business-case-drafting`

Context: `README.md`, comparable use cases, value model, plant baseline.

### 2. Quantify — skill `value-quantification`

Inputs from step 1.

### 3. Criteria — skill `success-criteria-authoring`

Inputs from steps 1 and 2.

### 4. Propose — tool `open_pr`

Branch `agent/business-case`. Writes `business-case.md`. Label
`agent-proposed`.

### 5. Review — checkpoint `human_review`

Reviewers from CODEOWNERS. **Blocking.**

## Behaviour

**On failure:** halt and report.

**Idempotency:** use case + step + content hash. Re-running against unchanged
content produces no second pull request.
````

### Step syntax

The portal parses `### N. Name — <kind> \`<id>\`` where kind is `skill`, `tool`,
or `checkpoint`. Everything under the heading is the step's configuration, read
as prose by the runner and passed to the agent as context.

## 11.2 Checkpoint semantics

Checkpoints are the load-bearing control — where the playbook stops and a human
acts.

| Kind | Behaviour |
|---|---|
| `human_review` | Halts. Resumes on pull request closed. Merged → continue; closed → halt with reason. |
| `human_confirm` | Halts pending explicit confirmation in the interface. Used at intake before creation. |
| `notify` | Non-blocking. Sends and continues. |
| `gate` | **Terminal.** The playbook always ends here. |

The `gate` checkpoint is terminal by construction. A playbook that continued past
a gate would be a playbook that had passed one. Nothing in the runner can express
that.

## 11.3 Runner semantics

```
for each step:
    if checkpoint:
        persist state, emit trace, suspend
        (resume on webhook or user action)
    else:
        capabilities = capabilitiesFor(session, useCase, step.skill)
        result = agentTurn(capabilities, step, context)
        context = context + result.outputs
        trace.append(result)
```

- **Suspension is durable.** A halted playbook survives deployment. Resume is
  webhook-driven, not an in-memory timer.
- **Authority is re-resolved at every step.** A session that loses a capability
  mid-run cannot complete a step it could have started.
- **Every step is traced** ([08.8](08-ai-architecture.md#88-trace-model)).
- **Idempotent by key.** Re-running against unchanged content writes nothing new.

---

## 11.4 Defined playbooks

### `s1-intake` — conversational

````markdown
# Playbook · s1-intake

Conduct a conversational intake and create a use case.

## Trigger

- **Stages:** none — this playbook creates the use case
- **Manual:** yes
- **Event:** intake_received (channel: chat)

## Authority

- **Roles:** requester, champion, triage
- **Identity:** invoking session

## Steps

### 1. Converse — skill `intake-conversation`

Resolve the six mandatory fields through dialogue. Three to five exchanges.

### 2. Dedupe — skill `duplicate-detection`

Search the portfolio for demands addressing the same problem, plant, or process.

### 3. Duplicate decision — checkpoint `human_confirm`

**Condition:** a match was found.

Present the candidate with its identifier, title, and stage. Options: link to
existing, or create anyway. Linking halts the playbook.

### 4. Classify — skill `demand-classification`

Level, heat, domain, scale potential. One sentence of rationale each.

### 5. Lane — skill `lane-proposal`

Propose a lane with rationale. Does not assign.

### 6. Confirm — checkpoint `human_confirm`

Restate the demand in two sentences. **Blocking.** Nothing is created before
confirmation.

### 7. Create — tool `create_uc`

Idempotency key: channel + source reference.

### 8. Notify — checkpoint `notify`

To the plant triage group.

## Behaviour

Two confirmations before creation — duplicate resolution and demand restatement.
Both exist because creating a wrong use case is more expensive than one extra
exchange.
````

The highest-value playbook and the first to build.

---

### `s1-intake-async` — non-conversational channels

````markdown
# Playbook · s1-intake-async

Capture a demand arriving from mail, chat platform, or API.

## Trigger

- **Event:** intake_received (channels: mail, teams, api)

## Authority

- **Roles:** none — runs as `agent-scheduled`
- **Identity:** service

## Steps

### 1. Extract — skill `intake-conversation` (extract-only mode)

No dialogue is possible. Extract what the message contains; mark the rest.

### 2. Dedupe — skill `duplicate-detection`

### 3. Classify — skill `demand-classification`

### 4. Create — tool `create_uc`

Intake status is `complete` only if all six fields were extractable, otherwise
`incomplete`. Idempotency key: channel + source reference.

### 5. Clarify — checkpoint `notify`

**Condition:** intake incomplete.

To the requester, with what is missing.

## Behaviour

The demand is captured immediately and completed asynchronously. A demand held
at a blocking form until complete is a demand that is often never submitted.
````

---

### `s2-triage-sweep` — scheduled

````markdown
# Playbook · s2-triage-sweep

Keep the S2 backlog reflecting reality today, not the day each demand was filed.

## Trigger

- **Schedule:** weekdays, early morning

## Authority

- **Roles:** none — runs as `agent-scheduled`, draft capability only
- **Identity:** service

## Steps

### 1. Sweep — skill `backlog-triage`

Scope: all use cases at S2.

Re-score heat against current dependency status. Flag staleness, sponsor loss,
and demands past their review date.

### 2. Dedupe — skill `duplicate-detection`

Scope: all active use cases. Newly visible duplicates and scale candidates appear
as the portfolio grows.

### 3. Propose — tool `open_pr`

**Condition:** changes found.

Batched. Labels `agent-proposed`, `triage-sweep`.

### 4. Report — checkpoint `notify`

To DU triage.

## Behaviour

Proposes, never acts. A sweep producing no proposals is a normal result.

Becomes load-bearing rather than convenient once conversational intake removes
the friction a form previously imposed — intake volume rises and S2 becomes the
bottleneck.
````

---

### `s4-poc-eval`

````markdown
# Playbook · s4-poc-eval

Evaluate a proof of concept against its recorded criteria.

## Trigger

- **Stages:** S4
- **Manual:** yes

## Authority

- **Roles:** reviewer, triage, portfolio forum, champion

## Steps

### 1. Load criteria — tool `read_uc`

Read the success criteria section of `business-case.md`.

This is the first step deliberately: the evaluation cannot be written against
criteria invented afterwards.

### 2. Evaluate — skill `poc-evaluation`

Context: loaded criteria, `poc/evidence/`.

### 3. Propose — tool `open_pr`

Writes `poc/evaluation.md`. Label `agent-proposed`.

### 4. Review — checkpoint `human_review`

Reviewers from CODEOWNERS. **Blocking.**

### 5. Gate — checkpoint `gate` G4

**Terminal.** The playbook ends here. The gate decision belongs to named
approvers.
````

---

### `s5-kpi-spec`

````markdown
# Playbook · s5-kpi-spec

Specify pilot KPIs and move the business case to committed.

## Trigger

- **Stages:** S5
- **Manual:** yes

## Authority

- **Roles:** reviewer, triage, champion

## Steps

### 1. KPI — skill `kpi-specification`

Context: `business-case.md`.

### 2. Adoption — skill `adoption-analysis`

Context: `pilot/`.

### 3. Value — skill `value-quantification` (committed mode)

Committed figures are permitted from S5. The portal independently refuses a G5
gate action where confidence is committed before this stage.

### 4. Propose — tool `open_pr`

Writes `pilot/kpi.md`. Label `agent-proposed`.

### 5. Review — checkpoint `human_review`

**Blocking.**
````

---

### `s6-scale-template`

````markdown
# Playbook · s6-scale-template

Generalize a proven pilot into a deployable scale package.

## Trigger

- **Stages:** S6
- **Manual:** yes

## Authority

- **Roles:** reviewer, triage, portfolio forum

## Steps

### 1. Template — skill `scale-templating`

Context: `pilot/`, `business-case.md`.

### 2. Global case — skill `value-quantification` (global mode)

The full global business case is mandatory at G6. The indicative figure from S3
is replaced by an evidence-backed one with a stated extrapolation method.

### 3. Propose — tool `open_pr`

Writes `scale/template.md`. Label `agent-proposed`.

### 4. Review — checkpoint `human_review`

Reviewers from CODEOWNERS. **Blocking.**
````

---

### `s7-rollout-plan`

````markdown
# Playbook · s7-rollout-plan

Plan the rollout sequence and draft the run handover.

## Trigger

- **Stages:** S7
- **Manual:** yes

## Authority

- **Roles:** reviewer, triage, portfolio forum, IT liaison

## Steps

### 1. Plan — skill `rollout-planning`

Context: `scale/template.md`, `registry/plants.md`.

### 2. Handover — skill `handover-authoring`

Context: `ops/`.

### 3. Propose — tool `open_pr`

Writes `rollout/plan.md` and `ops/handover.md`.

### 4. Review — checkpoint `human_review`

**Blocking.**
````

---

### `s8-value-review` — scheduled

````markdown
# Playbook · s8-value-review

Compare measured outcomes against committed business cases across the portfolio.

## Trigger

- **Schedule:** quarterly

## Authority

- **Roles:** none — runs as `agent-scheduled`
- **Identity:** service

## Steps

### 1. Scope — tool `search_ucs`

All use cases at S8 with status active.

### 2. Analyze — skill `value-variance-analysis`

For each use case in scope. Context: `business-case.md`, `pilot/kpi.md`,
`ops/value-tracking.md`.

### 3. Propose — tool `open_pr`

For each result. Appends to `ops/value-tracking.md` — never rewrites prior
reviews. Label `agent-proposed`.

### 4. Escalate — checkpoint `notify`

**Condition:** variance below −25%.

To sponsor and portfolio forum.

### 5. Report — checkpoint `notify`

To DU value oversight, quarterly variance summary.

## Behaviour

The closed loop. Every use case in operation reports against its own business
case, on a cadence, without anyone remembering to ask.
````

---

### `run-lane-handover`

````markdown
# Playbook · run-lane-handover

Record a run-lane demand and hand it to IT.

## Trigger

- **Event:** lane_assigned (lane: run)

## Authority

- **Roles:** triage

## Steps

### 1. Record — tool `write_registry`

Appends a handover record to `registry/handovers.md`.

### 2. Offer — checkpoint `notify`

To IT service.

### 3. Accept — checkpoint `human_confirm`

Actor: IT liaison. **Requires an external reference.** **Blocking.**

Without the external reference the trail breaks at the boundary and the requester
cannot follow their demand.

### 4. Inform — checkpoint `notify`

To the requester, with the external reference and the IT contact.
````

---

### `portfolio-query` — free-form

````markdown
# Playbook · portfolio-query

Answer questions about the portfolio.

## Trigger

- **Manual:** yes
- **Stages:** any, or none

## Authority

- **Roles:** all authenticated roles

## Steps

### 1. Answer — skill `portfolio-analysis`

Tools: `search_ucs`, `read_registry`. Read-only.

## Behaviour

No pull request, no checkpoint. The default mode of the chat interface when no
use case is in context.
````

## 11.5 Governance

| Rule | Rationale |
|---|---|
| Playbook changes require a pull request and a second approver | Alters agent behaviour for every user |
| No playbook may reference a gate-passing tool | No such tool exists; a playbook referencing one fails to load |
| A `gate` checkpoint is always terminal | Structurally prevents a playbook advancing a use case |
| Every write step carries an idempotency key | Re-runs and webhook redelivery must not duplicate |
| Playbook version is recorded in every trace | An artifact is attributable to the playbook version that produced it |
| Scheduled playbooks run as `agent-scheduled` | Draft only; cannot create use cases or pass gates |

## 11.6 Build order

| Order | Playbook | Rationale |
|---|---|---|
| 1 | `portfolio-query` | Read-only. Proves capability loading, authority scoping, traces — no write risk. |
| 2 | `s1-intake` | Highest value. The L1 opportunity the lifecycle map identifies. |
| 3 | `run-lane-handover` | Completes the front door. Without it, run demand has no route. |
| 4 | `s1-intake-async` | Extends intake to mail and chat once the conversational path is proven. |
| 5 | `s2-triage-sweep` | Needed once intake volume rises. |
| 6 | `s3-business-case` | First drafting playbook; highest scrutiny. |
| 7 | `s8-value-review` | Closes the loop. Requires use cases to have reached S8. |
| 8 | S4–S7 playbooks | As use cases reach those stages. |

The ordering follows demand, not the stage sequence: nothing reaches S4 before S1
works, and S8 has no subjects until the first cohort completes rollout.
