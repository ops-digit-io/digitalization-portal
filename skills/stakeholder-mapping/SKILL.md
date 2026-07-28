---
name: stakeholder-mapping
description: Identify the personas, the accountable owner, and who must adopt a digital use case for it to deliver value — feeding user-story personas and the sponsor/value-owner roles — always in aggregate, never ranking or profiling individuals.
capabilities: [draft]
tools: []
---

# stakeholder-mapping

A use case delivers value only if real people use it and someone owns the outcome.
Map the stakeholders so the requirements are written for the right personas and the
accountability is explicit.

## Who to identify

- **Primary persona** — whose daily job the solution changes. User stories lead with
  this role. (From domain knowledge, refined to the case.)
- **Secondary personas** — others who touch it (approver, downstream consumer,
  administrator).
- **Sponsor** — accountable for the outcome and the value; funds and unblocks. Required
  before the business-case gate (G3).
- **Value owner** — accountable that the promised value is actually realised and
  measured at pilot.
- **Affected / adopting group** — the people who must change how they work. Adoption
  risk lives here.
- **Governance stakeholders** — security, privacy, compliance, works council where
  personal data or working practices are involved.

## For each persona, capture

- their **goal** in this context (the job to be done, their angle on it);
- their **pain** today;
- what **"better"** looks like for them (seeds the story benefit);
- their **adoption risk** — would they actually use it, and what would stop them.

## Map to the artifacts

- Personas → the `As a <persona>` in each user story.
- Sponsor / value owner → the People roles on the demand (named before G3).
- Adoption risks → the risk register and the operational-readiness feasibility check.

## Guardrails (hard)

- **Aggregate only. Never analyse, rank, score, or profile individuals.** Personas are
  roles, not people. This is a non-negotiable portal rule.
- Where personal data or working conditions are in scope, name the governance
  stakeholder (privacy, works council) as a required reviewer — don't design around
  them.
- Don't invent stakeholders to pad the map; name the ones the demand actually implies
  and flag unknowns as open questions ("who owns the alert response?").
