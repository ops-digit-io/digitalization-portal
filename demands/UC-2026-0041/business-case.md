# Business case · UC-2026-0041

## State

- **Confidence:** indicative
- **Version:** 1
- **Approved:** 2026-05-06
- **Approved by:** plant.quality@example.com
- **Review horizon:** 12 weeks
- **Review on:** 2026-07-29

> **Indicative.** Every figure below rests on assumption, not measurement.

## Scope

**In scope.** Shift-resolved scrap attribution and the quality-cockpit Pareto for DE-ALD.

**Out of scope.** Automated corrective actions; other plants (directional only at S4).

**Global potential.** Multi-plant once cause codes are harmonized network-wide.

## Baseline

**Metric.** Scrap rate (% of throughput) attributable within 12h.

**Value.** 2.1% scrap, ~€180k of which is addressable by faster shift-level correction (FY25 controlling).

**Method.** MES scrap export reconciled to controlling scrap cost, 12 months.

**Source.** MES + controlling ledger.

**Owner.** controlling@example.com

**Verified.** No

## Value

**Category.** cost_savings
**Annual gross.** €180,000
**Basis.** Recovering ~1.0pp of addressable scrap on €8.6m throughput via faster shift-level correction.

### Assumptions

| Assumption | Tested | Source |
|---|---|---|
| Shift calendar maps cleanly to MES line ids | No | shift system |
| Corrective action within a shift reduces recurrence by ~25% | No | pilot target |

**Untested assumptions remain.** That faster attribution actually changes shift behaviour — the POC must show recurrence drops.

## Cost

| | |
|---|---|
| Build estimate | €35,000 |
| Annual run estimate | €6,000 |
| Confidence | medium |

## Success criteria

**POC succeeds if:**
1. Recurrence of the top-3 cause codes drops ≥15% on the pilot line over 6 weeks.

**POC stops if:**
1. No measurable change in recurrence, or attribution latency exceeds 24h.

## Risks

| Risk | Severity | Owner |
|---|---|---|
| Cause-code inconsistency masks true Pareto | medium | controlling@example.com |
