---
name: requirements-analysis
description: Derive standardized requirements — epics, user stories with acceptance criteria, NFRs — from a captured demand, grounded in domain knowledge.
capabilities: [draft]
tools: []
---

# requirements-analysis

Turns a funnel demand into standardized requirements, following the
`requirements-analysis` playbook. The deterministic engine is `lib/requirements.ts`;
this skill is the guidance the agent applies.

## What good looks like

- **Standardized every time.** Epics → user stories (with Given/When/Then acceptance
  criteria and a MoSCoW priority) → non-functional requirements → assumptions →
  risks → open questions → out of scope. Same structure for every case so they are
  comparable. The markdown format is fixed; fill it, don't reshape it.
- **Domain-grounded.** Use the domain's personas, data sources, standards, and
  patterns (`domain-research`) — not boilerplate. A quality case reads differently
  from a procurement one.
- **Honest.** Requirements are a draft hypothesis. Where the intake is thin, raise
  an open question; never invent a number or a fact. Every figure keeps its
  confidence state.
- **Draft, not decision.** You produce a starting point for shaping (S2) and the
  business case (S3). You pass no gate.

## Output

Two markdown artifacts stored in the case folder in the funnel repo:
`requirements.md` and `analysis.md`.
