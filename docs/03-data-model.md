# 03 — Data Model

Every artifact is a markdown document. No YAML, no frontmatter, no JSON in the
use-case repositories. A person opening any file reads a document, not a
configuration.

## 3.1 Why markdown

| Property | Consequence |
|---|---|
| Readable by anyone | A plant supervisor can read a business case without knowing what a schema is |
| Readable by any AI | No parsing layer; the agent reads what the human reads |
| Diffs are meaningful | A pull request shows changed sentences, not changed indentation |
| No format expertise required | Contributors edit prose, not structure |
| Portable | Renders in any Git host, any editor, any static site generator |

### The trade-off, stated

Markdown is not machine-validatable. This is a real cost and is accepted
deliberately.

**What this changes:** the CI validation described in earlier drafts — gate
sequence enforcement, confidence-state checks, required-field presence — cannot
run in the use-case repository. There is no structured field for CI to read.

**Where enforcement moves:** the portal. Gate progression is checked against the
registry before a gate pull request is opened. The portal parses the markdown by
heading structure to extract state.

**What this weakens:**

- A direct repository edit bypasses portal checks entirely
- Portal compromise defeats gate-sequence enforcement
- Malformed artifacts are caught at read time, not at write time

**What survives:** gate passage still requires a human merge under CODEOWNERS.
That boundary is enforced by the repository platform, outside the portal's blast
radius, and it is the control that actually matters. A bypassed sequence check
produces a gate passed out of order — visible in the audit trail, correctable.
It does not produce an unapproved investment.

This is the right trade for an organization where the forum reviews merges
anyway and the fleet is measured in hundreds, not thousands. It would be the
wrong trade at ten thousand use cases with automated merge policies.

## 3.2 Parsing contract

The portal reads state from markdown by **heading structure and defined line
patterns**. This is a convention, not a schema — but it must be honoured or the
portal cannot render the board.

Three rules:

1. **State lives in `## State`**, as a definition list. This is the only section
   the portal parses for lifecycle state.
2. **Gates live in `## Gates`**, as a table with fixed column headers.
3. **Everything else is prose.** The portal displays it and the agent reads it;
   neither parses it.

Where the portal cannot parse a document, the use case renders on the board with
a `needs attention` marker rather than disappearing. Failing visibly is better
than failing silently.

## 3.3 Repository model

### Portal repository

```
portal/
├── app/                        application
├── lib/
│   ├── stages.ts               stage machine, transition table
│   ├── lanes.ts                lane taxonomy, triage rules
│   ├── rbac.ts                 capability resolution
│   ├── parse.ts                markdown state extraction
│   └── agent/                  tools, capability loader, playbook runner
├── registry/
│   ├── index.md                fleet state, one row per use case
│   ├── handovers.md            run-lane handover records
│   ├── rbac.md                 roles and group mapping
│   ├── plants.md               plant master
│   ├── domains.md              domain taxonomy
│   └── value-model.md          value categories
├── skills/                     agent skills, markdown
├── playbooks/                  agent playbooks, markdown
└── templates/                  artifact templates, markdown
```

The portal repository holds **no business content**.

### Use-case repository

One per Digital-Unit-owned use case. Named `uc-YYYY-NNNN-<slug>`.

```
uc-2026-0041-scrap-attribution/
├── README.md                   the canonical record — always present
├── intake/
│   ├── conversation.md         the original intake dialogue
│   └── sources.md              where the demand came from
├── business-case.md            S3
├── poc/
│   ├── evaluation.md           S4
│   └── evidence/               supporting files
├── pilot/
│   ├── kpi.md                  S5
│   └── adoption.md
├── scale/
│   └── template.md             S6
├── rollout/
│   ├── plan.md                 S7
│   └── completion.md
├── ops/
│   ├── runbook.md
│   ├── handover.md             G7 handover record
│   └── value-tracking.md       S8, appended each cycle
└── .github/CODEOWNERS          generated, plant- and lane-scoped
```

`README.md` rather than `demand.md`, so the repository landing page *is* the
canonical record. Anyone opening the repository sees the use case.

**Invariant.** A use-case repository is complete without the portal. The full
decision history is reconstructable from `git log` and the documents, with no
application dependency.

## 3.4 Identifiers

| Entity | Format | Example |
|---|---|---|
| Use case | `UC-YYYY-NNNN` | `UC-2026-0041` |
| Handover (run lane) | `HO-YYYY-NNNN` | `HO-2026-0112` |
| Repository | `uc-yyyy-nnnn-<slug>` | `uc-2026-0041-scrap-attribution` |
| Stage | `S1`–`S8` | `S4` |
| Gate | `G1`–`G7` | `G4` |

Sequence held as the highest identifier present in `registry/index.md`,
incremented on creation. Contention resolved by retry.

---

## 3.5 `README.md` — the canonical record

Present from creation. Grows as the use case advances.

````markdown
# UC-2026-0041 · Scrap attribution at shift granularity

## State

- **Stage:** S4
- **Lane:** transform
- **Status:** active
- **Plant:** DE-ALD
- **Domain:** quality
- **Level:** L2
- **Heat:** medium
- **Scale potential:** multi-plant
- **Created:** 2026-03-12
- **Intake:** complete

## Problem

Scrap is booked per shift but not attributed to a cause. Corrective action is
decided on the line supervisor's recollection rather than on record, so the same
causes recur without anyone noticing the pattern.

> Original (de): Wir buchen den Ausschuss pro Schicht, aber niemand weiss, woher
> er kommt.

## Current pain

Roughly two unattributed scrap events per shift.
*Source: requester estimate, not measured.*

## Desired outcome

Each scrap event carries a cause attribution available at shift handover.

## Proposed solution

The requester suggested a dashboard. Recorded for context; not binding on scope.

## Classification rationale

**Level L2** — the scrap recording sequence is unchanged; the attribution step
becomes faster.

**Heat medium** — meaningful rework reduction at one plant, effort bounded by
data that already exists.

## People

| Role | Person |
|---|---|
| Requester | <email> |
| Lead | <email> |
| Sponsor | <email> |
| Value owner | <email> |
| Business owner | <email> |
| Delivery lead | <email> |
| Run owner | *assigned at G7* |

## Gates

| Gate | Status | Date | By | Note |
|---|---|---|---|---|
| G1 Intake accepted | passed | 2026-03-14 | <email> | |
| G2 Prioritized | passed | 2026-03-20 | portfolio forum | lane confirmed |
| G3 Business case | passed | 2026-04-02 | <email> | business-case.md |
| G4 POC proven/stop | **open** | | | |
| G5 Pilot proven | pending | | | |
| G6 Scale readiness | pending | | | |
| G7 Rollout complete | pending | | | |

## Related

- UC-2026-0033 — related, shares cause-code taxonomy

## History

- 2026-03-12 — created via portal chat by <email>
- 2026-03-14 — G1 passed
- 2026-03-20 — G2 passed, lane confirmed as transform
- 2026-04-02 — G3 passed
````

### Parsing rules for this document

| Element | Rule |
|---|---|
| `## State` | Definition list, `- **Key:** value`. The only section parsed for state. |
| Stage | `S1`–`S8` |
| Status | `active`, `parked`, `killed`, `retired` |
| `## Gates` | Table, columns fixed: Gate, Status, Date, By, Note |
| Gate status | `passed`, `open`, `pending`, `killed`, `parked` |
| Everything else | Prose. Displayed and read; never parsed. |

### Parked state

When status is `parked`, the State section carries three additional lines:

```markdown
- **Status:** parked
- **Parked reason:** sponsor on extended leave
- **Parked since:** 2026-06-01
- **Review on:** 2026-09-01
```

---

## 3.6 `business-case.md` — S3

````markdown
# Business case · UC-2026-0041

## State

- **Confidence:** indicative
- **Version:** 2
- **Approved:** 2026-04-02
- **Approved by:** <email>
- **Review horizon:** 12 weeks
- **Review on:** 2026-06-25

> **Indicative.** Every figure below rests on assumption, not measurement.
> Committed figures require pilot evidence and are permitted from S5 onward.

## Scope

**In scope.** Scrap attribution for injection moulding lines at DE-ALD.

**Out of scope.** Assembly scrap. Supplier-caused defects.

**Global potential.** Approximately twelve plants run comparable injection
moulding processes. Directional only — no global figure is computed at this
stage.

## Baseline

**Metric.** Share of scrap bookings without a recorded cause.

**Value.** 0.62 over 2025-10-01 to 2026-03-01.

**Method.** Manual review of shift scrap bookings, sampled across three months.

**Source.** Plant quality records.

**Owner.** <email>

**Verified.** No — sampled estimate. Verification required before G5.

## KPI

### K1 · Unattributed scrap share

| | |
|---|---|
| Baseline | 0.62 |
| Target | 0.20 |
| Direction | decrease |
| Owner | <email> |
| Cadence | monthly |

**Measurement.** Share of scrap bookings carrying a cause code, computed over
the booking records for the period.

**Data source.** Plant quality records.

## Value

**Category.** Quality cost reduction.

**Annual gross.** EUR 180,000.

**Basis.** Rework hours avoided at the pilot plant, at loaded labour rate.

### Assumptions

| Assumption | Tested | Source |
|---|---|---|
| Rework rate falls proportionally with attribution rate | **No** | — |
| Loaded rate EUR 62/h | Yes | Plant controlling |

**Untested assumptions remain.** The proportionality assumption is the one this
case rests on and it has not been tested. If attribution redirects rework rather
than eliminating it, the figure falls materially.

### External anchors

Industry benchmark studies report rework reductions up to 50% for comparable
interventions. Recorded as a directional anchor only. Not applied to the figure
above.

## Cost

| | |
|---|---|
| Build estimate | EUR 45,000 |
| Annual run estimate | EUR 12,000 |
| Confidence | low |

## Success criteria

Set before POC work begins. The POC is measured against these and not against
criteria written afterwards.

**POC succeeds if:**
1. Cause attribution is achievable for more than 70% of scrap events from data
   that already exists
2. Attribution is available within 30 minutes of the event

**POC stops if:**
1. Attribution below 40% is achievable
2. New sensing hardware is required at more than one line

## Risks

| Risk | Severity | Owner |
|---|---|---|
| OT connectivity at DE-ALD not yet established | medium | <email> |
````

---

## 3.7 `poc/evaluation.md` — S4

````markdown
# POC evaluation · UC-2026-0041

## State

- **Completed:** 2026-05-14
- **Evaluator:** <email>
- **Recommendation:** continue
- **Advisory:** yes — the gate decision is separate

## Criteria

Measured against the success criteria recorded in `business-case.md`. Criteria
were not modified after work began.

### 1. Attribution achievable for more than 70% of events

**Outcome: met.** Measured 78%.
Evidence: `poc/evidence/attribution-rate.md`

### 2. Attribution available within 30 minutes

**Outcome: met.** Measured 8 minutes median.
Evidence: `poc/evidence/latency.md`

## Feasibility

| Dimension | Assessment |
|---|---|
| Technical | proven |
| Data | proven |
| Organizational | **untested** |

Organizational feasibility was not tested at POC. This is normal and becomes the
primary pilot question.

## Recommendation

**Continue to pilot.**

Attribution rate exceeds the threshold using data that already exists, so no new
instrumentation is required. The open question is whether shift teams will use
the attribution — which is an adoption question the POC could not answer.

## Learnings

Existing cause codes are used inconsistently across shifts. The pilot must
address code discipline, not only tooling. This was not anticipated at S3 and
changes what the pilot needs to test.
````

---

## 3.8 `pilot/kpi.md` — S5

````markdown
# Pilot KPI · UC-2026-0041

## State

- **Pilot site:** DE-ALD
- **Window:** 2026-06-01 to 2026-08-31
- **Confidence:** committed

## K1 · Unattributed scrap share

| | |
|---|---|
| Baseline | 0.62 — **verified** |
| Measured | 0.24 on 2026-08-31 |
| Target | 0.20 |
| Owner | <email> |

**Method.** Automated share computation over booking records for the window.

## Adoption

**Measured.** 81% of shifts recorded attribution activity.

**Method.** Usage records over the observation window.

Adoption is measured as use, not as availability. Sustained use in the final
third of the window was 79%, against 84% in the first third — a mild decay,
within the range that suggests habit rather than novelty.

## Business case update

**Confidence moves to committed.**

| | |
|---|---|
| Annual gross | EUR 142,000 |
| Indicative figure at S3 | EUR 180,000 |
| Variance | −21% |

**Why the variance.** The loaded-rate assumption held. The proportionality
assumption did not: attribution redirects rework rather than eliminating it, so
the reduction is real but smaller than assumed. This was the assumption flagged
untested at S3, and it is the one that moved.
````

---

## 3.9 `ops/handover.md` — G7

````markdown
# Run handover · UC-2026-0041

## State

- **Type:** run
- **From:** Digital Unit — <email>
- **To:** IT operations — <email>
- **Offered:** 2027-02-18
- **Accepted:** 2027-02-25
- **Accepted by:** <email>

## Package

| Item | Location |
|---|---|
| Runbook | `ops/runbook.md` |
| Service model | `ops/service-model.md` |
| Known issues | `ops/known-issues.md` |
| Monitoring | `ops/monitoring.md` |

## Retained by the Digital Unit

Execution transfers. Value accountability does not.

- Value tracking against the business case
- KPI oversight and cadence
- Variance escalation
- The decision to optimize or retire

**Value owner after handover:** <email>
**Review cadence:** quarterly

Without a named value owner surviving this handover, steady operations degrades
into unmonitored run and the business case is never tested. This field cannot be
empty.

## Acceptance

Accepted against the criteria in [06-handover](../../docs/06-handover.md). The
receiving party confirmed the runbook is executable by someone who was not on
the project.
````

---

## 3.10 `ops/value-tracking.md` — S8

Appended each review cycle. **Never rewritten.** New reviews go at the top so the
most recent is visible first.

````markdown
# Value tracking · UC-2026-0041

Baseline: `business-case.md` · Committed: `pilot/kpi.md`

---

## 2027-Q2 · reviewed 2027-07-08 by <email>

**Status: below target. Escalated.**

| | |
|---|---|
| K1 measured | 0.26 |
| K1 target | 0.20 |
| Projected annual | EUR 1,180,000 |
| Realized annualized | EUR 890,000 |
| Variance | **−25%** |

**Why.** Two plants deferred from the rollout, removing their contribution
entirely. At three further sites the cause-code taxonomy was not adopted because
local codes were already established — the scale template assumed taxonomy
adoption rather than mapping to existing codes.

**Action.** Escalated to sponsor and portfolio forum. The taxonomy-mapping gap is
a template defect, not an adoption failure, and should be fixed in the scale
package before further sites.

---

## 2027-Q1 · reviewed 2027-04-06 by <email>

**Status: on track.**

| | |
|---|---|
| K1 measured | 0.22 |
| Realized annualized | EUR 1,090,000 |
| Variance | −8% |

**Why.** Within tolerance. Rollout incomplete at two sites; contribution expected
to close the gap in Q2.
````

---

## 3.11 `registry/index.md` — fleet state

The portal's cache. Truth is each use case's `README.md`. Rebuilt by the
reconciler; safe to delete.

````markdown
# Portfolio registry

Generated by the reconciler. Do not edit by hand — changes are overwritten.

Last sync: 2026-07-22T09:14:00Z

| ID | Title | Stage | Lane | Status | Plant | Domain | Level | Heat | Sponsor | Value (proj) | Value (real) | Since |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| UC-2026-0041 | Scrap attribution at shift granularity | S4 | transform | active | DE-ALD | quality | L2 | medium | <email> | 180000 | — | 2026-04-02 |
| UC-2026-0042 | Tender preparation copilot | S3 | data_ai | active | ALL | procurement | L1 | high | <email> | 240000 | — | 2026-04-11 |
| UC-2026-0033 | Cause code harmonization | S8 | transform | active | DE-ALD | quality | L2 | low | <email> | 60000 | 71000 | 2026-01-30 |
````

---

## 3.12 `registry/handovers.md` — run lane

Run-lane demand receives no repository. It is recorded here and handed to IT.

````markdown
# Run-lane handovers

| ID | Title | Plant | Domain | Requester | Decided | By | External ref | Status |
|---|---|---|---|---|---|---|---|---|
| HO-2026-0112 | MES terminal loses session at shift change, line 4 | DE-ALD | production | <email> | 2026-04-11 | <email> | INC-88421 | handed over |

---

## HO-2026-0112

**Demand.** Operators must re-authenticate after every shift change, costing
several minutes per shift and causing missed bookings.

> Original (de): Das Terminal an Linie 4 wirft uns bei jedem Schichtwechsel raus.

**Pain.** Approximately five minutes per shift change. Requester estimate.

**Triage rationale.** Operational defect in a running system. No process change,
no cross-functional scope, no change intensity. Run lane.

**Handover.** Offered to IT service 2026-04-11 09:00, accepted 11:20 by <email>.
External reference INC-88421. The requester was informed and given the reference.

**Note.** Third comparable record for DE-ALD production this quarter. Flagged for
triage review — recurring run demand of the same shape is often an unrecognized
transform demand.
````

---

## 3.13 Templates

The portal materializes stage artifacts from templates in `portal/templates/`.
Each is the document above with values replaced by guidance:

```
templates/
├── use-case.md          → README.md at creation
├── business-case.md     → at G2 passage
├── poc-evaluation.md    → at G3 passage
├── pilot-kpi.md         → at G4 passage
├── pilot-adoption.md    → at G4 passage
├── scale-template.md    → at G5 passage
├── rollout-plan.md      → at G6 passage
├── handover.md          → at G6 passage
└── value-tracking.md    → at G7 passage
```

Template excerpt:

```markdown
## Baseline

**Metric.** <!-- The single metric that would move if this succeeded. -->

**Value.** <!-- Current value and the period it covers. At least one full
representative cycle — a single shift is not a baseline. -->

**Method.** <!-- How it was measured, reproducibly. "Estimated by the team" is a
placeholder, not a method. Where no measurement system exists, a documented
manual sample attested by the value owner is acceptable — say so. -->

**Verified.** <!-- Yes only if measured. Must be Yes before G5. -->
```

Guidance lives in HTML comments: visible to anyone editing the file, invisible
in the rendered view, and read by the agent as context.

## 3.14 Validation

With no schema, validation is portal-side and advisory-plus-visible rather than
blocking.

| Check | Where | On failure |
|---|---|---|
| State section parseable | Portal, on read | Use case marked `needs attention` on the board |
| Gate sequence | Portal, before opening a gate PR | Gate action refused with the reason |
| Confidence before S5 | Portal, before opening a G5 PR | Refused; explains committed requires pilot measurement |
| Baseline verified before G5 | Portal, before opening a G5 PR | Refused |
| Sponsor and value owner before G3 | Portal, before opening a G3 PR | Refused |
| Value owner after handover | Portal, before opening a G7 PR | Refused |
| Self-approval | Portal, at gate action | Refused |

**What is not caught:** a direct repository edit that sets an inconsistent state.
The reconciler detects it on the next sweep and flags the use case, but does not
prevent it.

**Why this is acceptable:** every gate still requires a human merge under
CODEOWNERS. An inconsistent state is visible, attributable, and correctable. An
unapproved investment is not possible, because approval is a merge and merges are
enforced by the repository platform.

A weekly digest lists use cases whose parsed state is inconsistent or
unparseable, so drift surfaces without anyone hunting for it.
