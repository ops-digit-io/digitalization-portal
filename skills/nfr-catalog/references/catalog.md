# NFR category catalogue

For each category: what to ask, and an example of a **testable** NFR (with a threshold
or check). Adapt the numbers to the use case's stakes.

| Category | Ask | Example testable NFR |
|---|---|---|
| Security | Who may do what? Where do secrets live? | "All credentials are server-side; no secret is reachable from the browser." |
| Privacy | What personal data, and under what basis? | "Personal data is retained ≤ 90 days and erasable on request within 30 days." |
| Reliability | What happens when it fails? | "A failed job is retried 3× then escalated; nothing is silently dropped." |
| Availability | How much uptime does the use need? | "Service meets 99.5% monthly availability; RTO ≤ 4 h." |
| Performance | Fast enough for the task, at scale? | "p95 response < 2 s at 50 concurrent users." |
| Usability | Can the real user do the core task? | "A first-time user completes the core task unaided in < 3 min." |
| Accessibility | Meets the org standard? | "Conforms to WCAG 2.1 AA for all customer-facing screens." |
| Auditability | Can we trace and review? | "Every automated action and figure is logged with source and timestamp." |
| Compliance | Which regulations bind it? | "Emissions figures follow the GHG Protocol and reconcile to metered data." |
| Interoperability | Does it fit the estate? | "Integrates via the documented ERP API; no screen-scraping." |
| Operability | Can we run and update it? | "Health is monitored with alerting; a named team owns run-time." |
| Cost | What does it cost to run? | "Model inference cost ≤ €0.02 per query at expected volume." |

## Regulations / standards to check by domain

(From `domain-knowledge.ts` — confirm applicability per case.)

- **Quality:** ISO 9001, IATF 16949 (automotive).
- **Maintenance:** ISO 55000 (asset management).
- **Energy:** ISO 50001.
- **Safety:** ISO 45001.
- **Finance:** IFRS / local GAAP, internal controls (SOX-style).
- **HR / customer:** GDPR, local labour law, accessibility (WCAG).
- **Sustainability:** GHG Protocol, CSRD / ESRS, ISO 14001.
- **IT / data:** ISO 27001, internal data governance, GDPR where personal data.

## The load-bearing NFR test

For each use case, ask: *which one NFR, if unmet, kills it?* That NFR must have an
acceptance criterion. Examples: groundedness for RAG, false-accept bound for a safety-
critical vision check, idempotency for financial automation, data residency for a
personal-data assistant.
