# Intake & repository structure

How a demand enters the portal, where it lives, and when it earns its own
repository. This documents the decision: **one central intake repo for everything
taken in; a dedicated per-use-case repo only after the PoC stage.**

## The two repositories a demand touches

```
                 ┌─────────────────────────────────────────────┐
   intake  ─────▶│  du-demands  (ONE central repo = the funnel)│
  (s1-intake)    │                                             │
                 │  demands/UC-2026-0071/       ← a case FOLDER │
                 │    README.md        the case record (intake)│
                 │    requirements.md  epics, user stories, NFRs│
                 │    analysis.md      domain analysis          │
                 │  demands/UC-2026-0072/ …                     │
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
| Intake API — preview + save (answers or raw markdown) | `app/api/intake/route.ts` |
| Intake turn API — one interview turn (live model or offline agent) | `app/api/intake/turn/route.ts` |
| Intake tools — chooser + Chat / Form / Markdown | `app/intake/{page,chat,form,md}` |
| Intake field set — one definition for all three tools | `INTAKE_FIELDS` in `lib/demand.ts` |
| Agent guideline (playbook) — how the agent behaves | `playbooks/s1-intake.md` |
| Deterministic agent — encodes the guideline | `lib/intake-agent.ts` |
| Guideline loader — playbook → live model system prompt | `lib/agent/intake-guideline.ts` |
| Interview guide — questions, intent, nudges | `skills/intake-conversation/references/interview.md` |
| Demands list | `app/demands/page.tsx` |
| Playbook (the user interaction) | `playbooks/s1-intake.md` |
| Skills | `skills/intake-conversation/`, `skills/demand-classification/` |
| Graduation to a repo (PoC stage) | `lib/poc/scaffold.ts` |

## The case format — a folder that covers everything

Every case is a **folder** in the funnel repo, in a defined format:

| File | What it is | Written by |
|---|---|---|
| `README.md` | The case record — the intake (State, Gates, the problem). The future use-case README. | intake tools (`buildDemand`) |
| `requirements.md` | Standardized requirements: epics → user stories (with Given/When/Then acceptance criteria + MoSCoW) → NFRs → assumptions → risks → open questions → out of scope. | requirements-analysis agent |
| `analysis.md` | Domain analysis & enhancement: refined problem, comparable patterns, gaps to fill, data sources, standards, personas. | requirements-analysis agent |
| `research.md` | Domain research brief: reference cases, testimonials, comparable implementations, benchmarks, standards, pitfalls, sources — from public data. | domain-research agent |

The formats are fixed in code (`lib/demand.ts`, `lib/requirements.ts`), so cases are
comparable and reproducible.

## Requirements analysis & enhancement (the second agent)

The **requirements-analysis agent** (`playbooks/requirements-analysis.md`) reads a
demand from the funnel and produces the two standardized artifacts above, grounded
in domain knowledge (`lib/domain-knowledge.ts`: personas, epic themes, NFRs, data
sources, standards, comparable patterns per domain). Deterministic offline engine
(`lib/requirements.ts`); the same playbook drives the live model. It enhances the
intake (naming the gaps — an unquantified baseline, missing owner, the applicable
standard) and derives the requirements. Draft only: it passes no gate and creates
no repository. The results commit to the case folder in the funnel, alongside the
demand.

### Domain research (not a fixed knowledge base)

The **domain-research agent** (`playbooks/domain-research.md`) is not limited to the
built-in knowledge base — that (`lib/domain-knowledge.ts`) is only a **seed and the
offline floor**. The agent researches **public data freely** to gather real
reference cases, testimonials, comparable implementations, benchmarks, standards,
and lessons learned for problems like this one, and writes `research.md`. Live, it
uses the model's web-search tool under the research playbook and cites its sources;
offline, a deterministic seed emits a genuine research *plan* plus the baseline,
honestly labelled as having no live sources (`lib/research.ts`,
`lib/agent/research-runner.ts`). External findings are treated as untrusted and are
anchors for the business case, never this case's committed value.

Flow: **intake → demand in the funnel → domain-research (research.md) →
requirements-analysis (analysis.md + requirements.md), all in the case folder.**

## What does not happen at intake

- No repository is created. (The PoC builder does that later.)
- No gate is passed. A demand opens with **G1 open**; a human accepts it at triage.
- No lane is assigned. The classifier *proposes*; triage *decides*.
- Nothing is merged. The central repo is written directly (it is not a gated
  use-case repo); use-case gate PRs remain human-merged, unaffected by this path.
