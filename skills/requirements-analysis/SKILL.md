---
name: requirements-analysis
description: Derive standardized requirements — epics, user stories with acceptance criteria, NFRs — from a captured demand, grounded in domain knowledge.
capabilities: [draft]
tools: []
---

# requirements-analysis

Turns a funnel demand into standardized requirements for **any kind of digital use
case**, following the `requirements-analysis` playbook. The deterministic engine is
`lib/requirements.ts`; this skill is the spine the agent applies, orchestrating the
method skills below.

## Ground on both axes

Analyse every demand on two orthogonal axes — this is what generalises the Analyst:

- **Domain** (skill `domain-research`, `domain-knowledge.ts`) — the business context:
  personas, standards, systems of record, recurring themes.
- **Archetype** (skill `usecase-archetypes`) — the solution shape: analytics,
  prediction, vision, GenAI/RAG, automation, optimization, integration, IoT,
  self-service, data foundation. It supplies the feasibility questions, data
  prerequisites, load-bearing NFRs, and characteristic failure modes.

## The method skills, in order

`problem-framing` → classify domain → `usecase-archetypes` → `feasibility-assessment`
→ `stakeholder-mapping` → enhance → derive requirements with `acceptance-criteria`,
`nfr-catalog`, `risk-assumptions`, and `value-sizing`. The playbook sequences them;
each skill carries its technique in depth.

## What good looks like

- **Standardized every time.** Epics → user stories (with Given/When/Then acceptance
  criteria and a MoSCoW priority) → non-functional requirements → assumptions →
  risks → open questions → out of scope. Same structure for every case so they are
  comparable. The markdown format is fixed; fill it, don't reshape it.
- **Domain-grounded.** Use the domain's personas, data sources, standards, and
  patterns (`domain-research`) — not boilerplate. A quality case reads differently
  from a procurement one.
- **Checkable & stably-identified.** Epics, features (user stories), and acceptance
  criteria are what a human ticks off during a PoC or pilot, so give each a stable
  id and write acceptance criteria that are individually verifiable (one observable
  Given/When/Then each). The portal keys verification state to those ids and stores
  it on the demand, so it survives re-analysis.
- **Honest.** Requirements are a draft hypothesis. Where the intake is thin, raise
  an open question; never invent a number or a fact. Every figure keeps its
  confidence state.
- **Draft, not decision.** You produce a starting point for shaping (S2) and the
  business case (S3). You pass no gate.

## Output

Two markdown artifacts stored in the case folder in the funnel repo:
`requirements.md` and `analysis.md`. The portal renders `requirements.md` as a
checkmarkable board — epics and their features with a nested acceptance-criteria
checklist — and records PoC/pilot verification against each id on the demand itself.
