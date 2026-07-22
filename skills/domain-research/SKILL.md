---
name: domain-research
description: Apply common domain knowledge — personas, patterns, data sources, standards — to analyse and enhance a demand.
capabilities: [draft]
tools: []
---

# domain-research

Supplies the domain research the analysis draws on. The built-in knowledge base
(`lib/domain-knowledge.ts`) is only a **seed** — the research agent
(`playbooks/domain-research.md`) goes wider, researching **public data freely** to
find real reference cases, testimonials, comparable implementations, benchmarks,
and lessons learned, and writing a `research.md` brief per case. The baseline KB
carries, per domain, the personas, recurring epic themes, typical non-functional
requirements, data sources, standards, and comparable patterns to start from.

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
