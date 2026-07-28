---
name: nfr-catalog
description: Derive non-functional requirements systematically across security, privacy, reliability, performance, usability, accessibility, compliance, cost, and operability — weighted by the use case's archetype so the NFRs that decide success are not missed.
capabilities: [draft]
tools: []
---

# nfr-catalog

Functional requirements say what it does; **non-functional requirements decide whether
anyone can trust and run it.** Skipping them is the most common way a promising PoC
fails to become a product. Derive NFRs systematically, then weight by the archetype.

## Walk the categories

For each, ask "what must be true here, and how would we check it?" Drop the ones that
genuinely don't apply — but consider each.

- **Security** — authN/authZ, least privilege, secrets server-side, data-in-transit/
  at-rest, tenant/asset isolation.
- **Privacy & data protection** — personal-data minimisation, consent, residency,
  retention, the right to erasure. (GDPR bites most enterprise use cases.)
- **Reliability & availability** — uptime target, failure handling, retries,
  recovery, no silent failures.
- **Performance & scale** — latency at the percentile that matters, throughput, and
  behaviour at peak / growth.
- **Usability** — the real user completes the core task; readable by its audience,
  not just its author.
- **Accessibility** — meets the org's standard (e.g. WCAG) for its user base.
- **Auditability & traceability** — actions logged, figures traceable to source and
  method, decisions reviewable.
- **Compliance** — the domain's standards and regulations (see domain knowledge).
- **Interoperability** — fits the systems around it; stable interfaces.
- **Operability & maintainability** — monitoring, alerting, ownership, cost to run,
  how it's updated.
- **Cost** — run cost is itself a requirement (per-call model cost, storage, licences).

## Weight by archetype

The archetype tells you which NFRs are **load-bearing** — the ones that decide success
for this shape (from `usecase-archetypes`):

- **GenAI/RAG** → groundedness, retrieval-respecting security, privacy/residency,
  human-in-the-loop control, per-call cost.
- **Prediction** → reliability (miss/false-alarm bounds), explainability, lead time.
- **Computer vision** → separate false-accept/reject bounds, latency, robustness to
  drift.
- **Automation** → reliability (catch/retry/escalate), auditability, idempotency.
- **Optimization** → transparency, controllability, plan-time performance.
- **Integration** → data quality at the boundary, reliability/idempotency, lineage.
- **IoT** → device security, reliability under connectivity loss, scalable ingest cost.
- **Self-service** → usability, accessibility, security/RBAC.
- **Analytics** → correctness/reconciliation, freshness, usability.
- **Data foundation** → data quality, governance, discoverability.

## Rules

- **Make each NFR testable** — pair it with the threshold or check that proves it
  ("p95 latency < 2 s", not "fast"). NFRs that can't be checked aren't requirements.
- **Don't gold-plate.** Fit the NFR to the stakes: a shop-floor pilot doesn't need
  five-nines. State the level the use case warrants.
- **Surface conflicts.** Latency vs. cost, privacy vs. usefulness — name the trade-off
  as an open question for humans.

## References

- `references/catalog.md` — the full category catalogue with example testable NFRs and
  the regulations to check per domain.
