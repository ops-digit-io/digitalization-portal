# Business case · UC-2026-0033

## State

- **Confidence:** realized
- **Version:** 1
- **Approved:** 2026-03-30
- **Approved by:** plant.quality@example.com
- **Review horizon:** 12 weeks
- **Review on:** 2026-06-22

> **Realized.** Figures below rest on pilot and steady-ops measurement.

## Scope

**In scope.** Harmonized cause-code master and historical migration for DE-ALD quality.

**Out of scope.** New defect taxonomies; other plants (next wave).

**Global potential.** Multi-plant — the master is designed to extend network-wide.

## Baseline

**Metric.** Share of scrap records mapped to the harmonized master.

**Value.** 0% aggregatable before; 98% mapped after rollout (quality system).

**Method.** Record-level mapping audit before vs. after migration.

**Source.** Quality/MES cause-code tables.

**Owner.** controlling@example.com

**Verified.** Yes

## Value

**Category.** cost_savings
**Annual gross.** €71,000
**Basis.** Realized: analyst time no longer spent reconciling codes plus faster cross-line correction, measured in steady ops.

### Assumptions

| Assumption | Tested | Source |
|---|---|---|
| Historical codes map to the new master without loss | Yes | migration audit |
| Lines adopt the master in daily bookings | Yes | post-rollout audit |

**Untested assumptions remain.** None material — the case is in steady operation and measured.

## Cost

| | |
|---|---|
| Build estimate | €28,000 |
| Annual run estimate | €3,000 |
| Confidence | high |

## Success criteria

**POC succeeds if:**
1. ≥95% of historical records map cleanly and lines book to the master.

**POC stops if:**
1. Mapping loses defect signal, or lines refuse the master.

## Risks

| Risk | Severity | Owner |
|---|---|---|
| Drift back to local codes over time | low | controlling@example.com |
