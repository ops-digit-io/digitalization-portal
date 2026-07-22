# Intake & repository structure

How a demand enters the portal, where it lives, and when it earns its own
repository. This documents the decision: **one central intake repo for everything
taken in; a dedicated per-use-case repo only after the PoC stage.**

## The two repositories a demand touches

```
                 ┌─────────────────────────────────────────────┐
   intake  ─────▶│  du-demands  (ONE central repo)             │
  (s1-intake)    │                                             │
                 │  demands/UC-2026-0071.md   ← a markdown page │
                 │  demands/UC-2026-0072.md      per demand     │
                 │  demands/UC-2026-0073.md                     │
                 └─────────────────────────────────────────────┘
                        │  S1 → S2 → S3  (all in the central repo)
                        │
                        ▼  at the PoC stage (G3 passed → S4)
                 ┌─────────────────────────────────────────────┐
                 │  uc-2026-0071-predictive-scrap  (its OWN repo)│
                 │  README.md  poc/  business-case.md  …         │
                 └─────────────────────────────────────────────┘
                        │  S4 → … → S8  (in the dedicated repo)
```

### Why one central repo at intake

A demand at S1 is a paragraph of problem statement. Creating a whole Git
repository for every idea someone types in would leave the org with hundreds of
near-empty repositories, most of which are killed at G1–G3 and never build
anything. That is noise, not portfolio.

So **every demand taken in is one markdown page in one repository** (`du-demands`).
The whole early funnel — capture, shaping, assessment — is one legible repo of
markdown you can read top to bottom. A killed demand is one file with a killed
state, not an abandoned repository.

### Why a dedicated repo only after PoC

A repository earns its existence when there is something to build and evaluate. At
the **PoC stage** the use case acquires a spec, a scaffold, an artifact, an
evaluation — real deliverables under CODEOWNERS review. That is when it graduates
to its own `uc-YYYY-NNNN-<slug>` repository, created by the **PoC builder**
(`lib/poc/scaffold.ts` → `GitHost.createRepo`). The demand's markdown page becomes
that repository's `README.md`, unchanged in shape — which is why a demand uses the
same `## State` / `## Gates` structure a use-case README does (`lib/parse.ts`
reads both).

> Run-lane demand is the exception the lane taxonomy already handles: it gets a
> handover record and **no** repository, ever (`lib/lanes.ts`, `§5.3`).

## A demand is a markdown page (like a skill)

A demand is authored the same way a skill is — as a markdown page — not as a form
that serialises to JSON. `lib/demand.ts` defines the page; `demands/README.md`
describes the store.

## The intake is AI-guided but its output is deterministic

This is the load-bearing property. The intake (`/intake`, playbook `s1-intake`) is
AI-assisted so a non-technical requester can just describe the problem. But the
**artifact it produces is deterministic**: `buildDemand(meta, answers)` renders the
same sections in the same order every time, filling unanswered fields with a stable
placeholder. Same answers → byte-identical page.

The split is deliberate:

| Concern | Who does it | Determinism |
|---|---|---|
| Conduct the conversation, elicit answers | model (or the guided form offline) | may vary |
| Propose a lane / domain | `classifyDemand` — keyword rules | deterministic |
| **Render the demand page** | `buildDemand` — pure code | **byte-identical** |
| Save to the central repo | `saveDemand` | — |

The model never writes the artifact. It hands a clean set of answers to a pure
function. That is what makes the intake reproducible and reviewable, and why the
offline and live-model paths produce the identical page.

## Where the code lives

| Piece | File |
|---|---|
| Demand model — fields, deterministic `buildDemand`, `classifyDemand` | `lib/demand.ts` |
| Central store — list / read / save to `du-demands` | `lib/demands-store.ts` |
| Intake API — preview + save | `app/api/intake/route.ts` |
| Intake UI — guided, live preview, two checkpoints | `app/intake/page.tsx` |
| Demands list | `app/demands/page.tsx` |
| Playbook (the user interaction) | `playbooks/s1-intake.md` |
| Skills | `skills/intake-conversation/`, `skills/demand-classification/` |
| Graduation to a repo (PoC stage) | `lib/poc/scaffold.ts` |

## What does not happen at intake

- No repository is created. (The PoC builder does that later.)
- No gate is passed. A demand opens with **G1 open**; a human accepts it at triage.
- No lane is assigned. The classifier *proposes*; triage *decides*.
- Nothing is merged. The central repo is written directly (it is not a gated
  use-case repo); use-case gate PRs remain human-merged, unaffected by this path.
