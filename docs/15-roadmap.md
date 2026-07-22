# 15 — Roadmap and Open Decisions

## 15.1 Sequencing principle

Build the front door before the lifecycle. A portal that captures demand well and
orchestrates nothing is useful on day one. A portal that orchestrates eight
stages and captures no demand is useful never.

Two consequences: intake and triage precede gate machinery, and the AI layer is
added only after the non-AI path works — otherwise two systems are being debugged
at once.

## 15.2 Milestones

### M0 — Prerequisites

Not development work, but on the critical path. Start immediately; these have the
longest lead times in an enterprise setting.

| Item | Owner | Blocks |
|---|---|---|
| Identity provider app registration, redirect URI on final hostname | IT | All authenticated work |
| Repository organization and application identity | IT / DU | All repository work |
| Hosting account, EU region, custom domain | DU | Deployment |
| Model service access with reviewed processing terms | Procurement / Legal | AI layer |
| Works council engagement opened | HR | Production launch |

Development on M1 can proceed against a sandbox organization while these are in
flight.

**Exit:** identity registration approved, application identity installed.

---

### M1 — Template and validation

The enforcement layer, built first so every use case inherits it from creation.

- `uc-template` repository
- JSON Schema for `README.md` and every stage artifact ([03](03-data-model.md))
- CI: schema validation, gate sequence, confidence rule, role presence
- `CODEOWNERS` generation logic
- Registry schemas: `plants.md`, `domains.md`, `value-model.md`, `rbac.md`

**Exit:** a deliberately invalid `README.md` fails CI. A gate-skipping pull
request fails CI. A `confidence: committed` at S3 fails CI.

---

### M2 — Authentication and board

The trust chain, proven before any write path exists.

- OIDC login against the corporate directory
- Session with roles and plant scopes resolved from group claims
- `can()` implementation with scope and self-approval rules
- Read-only board rendering from a hand-seeded registry
- Use-case detail view

**Exit:** a user outside the portal groups receives 403. A gatekeeper scoped to
one plant sees, but cannot act on, another plant's use case.

---

### M3 — Intake and triage

The front door. First real value.

- Web form intake → `POST /api/intake`
- Use-case repository creation from template
- Registry write and reconciler
- Run-lane handover record and acceptance flow
- G1 and G2 gate pull requests
- Rejection with reason and reroute-to-backlog
- Park with reason and review date

**Exit:** a demand submitted through the form creates a valid repository, appears
on the board, and can be routed to either lane. A run-lane demand produces a
handover record accepted with an external reference.

---

### M4 — Lifecycle

Gate machinery for the full lifecycle.

- Stage machine with transition table and scaffold materialization
- G3–G7 gate pull requests
- Kill and archive
- Handover authoring and acceptance at G7
- Webhook-driven reconciliation on merge

**Exit:** a test use case traverses S1 to S8 end to end, with every gate a merged
pull request under code-owner approval, and every stage artifact materialized.

---

### M5 — AI read-only

Prove capability loading and authority scoping with no write risk.

- Agent route with session-scoped capability resolution
- Skill loader and frontmatter parsing
- `portfolio-analysis` skill; `portfolio-query` playbook
- Trace recording and trace viewer
- Kill switch, spend cap, rate limits

**Exit:** the agent answers portfolio questions within the user's visibility and
refuses beyond it. Traces are complete and replayable. The kill switch is tested
in production configuration.

---

### M6 — AI intake

The highest-value AI capability, and the reason for the whole layer.

- `intake-conversation`, `demand-classification`, `duplicate-detection`,
  `lane-proposal` skills
- `s1-intake` playbook with both confirmation checkpoints
- Injection wrapping and the injection evaluation set
- Chat interface, mobile-first

**Exit:** a demand described conversationally produces a valid, classified,
deduplicated use case. Every injection evaluation case passes.

---

### M7 — Channels and sweep

- `s1-intake-async` for mail and chat platform intake
- Tenant automation posting to the intake API
- `s2-triage-sweep` scheduled playbook
- Review-date and staleness digest

**Exit:** a demand raised in mail appears on the board with a clarification
request issued to the requester. The sweep produces reviewable proposals.

---

### M8 — Drafting

- `business-case-drafting`, `value-quantification`,
  `success-criteria-authoring` skills
- `s3-business-case` playbook
- `poc-evaluation` and `s4-poc-eval`

**Exit:** a drafted business case leaves unsupported figures marked as requiring
input rather than interpolated. A POC evaluation measures against recorded
criteria only.

---

### M9 — Value loop

- `kpi-specification`, `adoption-analysis`, `value-variance-analysis` skills
- `s8-value-review` scheduled playbook
- Portfolio value views separating pipeline, committed, and realized

**Exit:** a use case in steady operations publishes variance against its own
business case without anyone requesting it.

---

### M10 — Scale support

- `scale-templating`, `rollout-planning`, `handover-authoring` skills
- S6 and S7 playbooks

Built when use cases reach these stages, not before.

## 15.3 Dependency map

```
M0 ──▶ M1 ──▶ M2 ──▶ M3 ──▶ M4 ──▶ M10
                      │       │
                      ▼       ▼
                     M5 ──▶ M6 ──▶ M7
                              │
                              ▼
                             M8 ──▶ M9
```

M3 is the first milestone with standalone value. Everything before it is
foundation; everything after widens coverage.

## 15.4 Phase 1 portfolio context

The portal's first cohort will be the Phase 1 scope items. This matters for
sequencing because it determines which stages see traffic first.

| Item | Status | Portal implication |
|---|---|---|
| Predictive maintenance and quality, one lead plant | In Phase 1 | First use case through the full lifecycle; single-site avoids multi-plant gate complexity at M4 |
| Procurement process and tender copilot | In Phase 1 | Document and workflow based; low OT dependency, so baseline can be established without connectivity |
| Vision-based quality, supply chain, multi-plant scale-out, AI model factory, ESG radar | Sequenced | Enter as S1/S2 demands; exercise triage and backlog before gate machinery is stressed |
| Finance and admin, HR AI, digital products, full network rollout, standalone AI platform | Not Phase 1 | Should still be captured as parked demands with reasons, so the portfolio reflects what was deliberately deferred |

The last row is worth acting on: recording deliberate exclusions as parked
demands with stated reasons is cheap, and it prevents the same items being
re-raised repeatedly as though they had never been considered.

Every active item runs as one review-horizon value gate with a pre-agreed
baseline, a named KPI owner, and real kill authority. The portal's job is to make
that discipline mechanical rather than remembered.

## 15.5 Open decisions

Resolve before the milestone named. Each is a decision, not a design gap — the
spec is buildable without them, but the answer changes what gets built.

| # | Decision | Needed before | Consequence |
|---|---|---|---|
| 1 | Front door on the existing ticketing platform or purpose-built | M3 | Implementation path. The requirement is one visible front door and one triage logic, not one specific tool. |
| 2 | Joint-triage forum and cadence for regulatory and continuous-improvement lanes | M3 | G2 throughput and the DU/IT boundary in practice |
| 3 | Whether `local`-lane use cases require a named sponsor | M3 | Plant autonomy against portfolio discipline |
| 4 | Gatekeeper scope: per-plant, per-domain, or both | M2 | `rbac.md` shape and CODEOWNERS generation; expensive to retrofit |
| 5 | Multi-plant gate rule: all listed plants, or portfolio forum only | M4 | Whether one plant can commit another to rollout |
| 6 | Value categories centrally fixed or plant-configurable | M8 | If plants compute value differently, S8 variance is not comparable across the network |
| 7 | Loaded rate and cost-of-capital: single enterprise figure or per-plant | M8 | Comparability of effort and working-capital cases |
| 8 | Whether recovered availability counts where capacity is not binding | M8 | Admissibility of a large class of maintenance use cases |
| 9 | Whether POC is a valid entry for pre-qualified vendor solutions | M4 | S4 entry criteria |
| 10 | Whether a single-plant pilot is a sufficient proxy for global scaling | M10 | G5 and G6 criteria |
| 11 | OpEx / IT execution split at S7 | M10 | Handover record may need multi-party acceptance |
| 12 | Skills central or per-use-case override | M8 | Override array is reserved in the schema but unimplemented |
| 13 | AI Act classification field for AI-containing use cases | Before first AI use case at G3 | Schema addition; separate from the portal's own classification |

Decisions 4 and 6 are the two worth settling early despite their later
milestones — both are schema-shaping, and retrofitting either means migrating
every existing use case.

## 15.6 What would indicate this is working

Not delivery milestones. Portfolio behaviour.

1. Every active demand in the enterprise has an identifier in the portal.
2. Median time from intake to lane assignment is under five working days.
3. No use case reaches S5 without a named value owner and a verified baseline.
4. Every use case in steady operations publishes measured variance.
5. **Kill rate at G4 is non-zero.** A lifecycle that never kills is not testing
   anything, and this is the metric most likely to be quietly missing.
6. Run-lane volume is visible, and recurring run demand has been converted into
   at least one transform use case.
7. At least one business case has been revised downward on pilot evidence
   without the use case being killed — evidence that the estimation discipline is
   real rather than performed.
