---
name: domain-research
description: Apply common domain knowledge — personas, patterns, data sources, standards — to analyse and enhance a demand.
capabilities: [draft]
tools: []
---

# domain-research

Supplies the "common domain research and knowledge" the requirements-analysis agent
applies when it reads a demand. Backed by the domain knowledge base
(`lib/domain-knowledge.ts`): for each manufacturing domain, the personas, recurring
epic themes, typical non-functional requirements, data sources, standards, and
comparable solution patterns.

## How to apply it

- **Classify the domain** from the demand, then load its knowledge.
- **Restate the problem in domain terms** and compare it to how this class of
  problem is commonly solved (the comparable patterns) — this is the enhancement.
- **Name the gaps.** What must the intake add to be actionable: a quantified
  baseline, frequency/scale, the process owner, the data sources, the applicable
  standard, the sponsor/value owner.
- **Ground the requirements.** Personas, data, standards, and patterns from the
  domain feed the epics, user stories, and NFRs — so the output is specific, not
  generic.

Adding or refining a domain is one entry in `lib/domain-knowledge.ts`.

## References

- [references/domains.md](references/domains.md) — the domains covered and what each carries.
