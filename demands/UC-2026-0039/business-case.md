# Business case · UC-2026-0039

## State

- **Confidence:** indicative
- **Version:** 1
- **Approved:** 
- **Approved by:** 
- **Review horizon:** 12 weeks
- **Review on:** 2026-08-24

> **Indicative.** Every figure below rests on assumption, not measurement.

## Scope

**In scope.** Per-line energy baseline and drift alerting for SK-PUC main lines.

**Out of scope.** Automated load shifting; enterprise energy trading.

**Global potential.** Multi-plant if the sub-metering pattern proves out.

## Baseline

**Metric.** kWh per unit produced, per line.

**Value.** ~€90k/year of addressable drift on the SK-PUC energy bill (facility estimate).

**Method.** Sub-meter sample over one production cycle vs. building-level bill.

**Source.** Utility meters + MES output counts.

**Owner.** sk.controlling@example.com

**Verified.** No

## Value

**Category.** cost_savings
**Annual gross.** €90,000
**Basis.** Cutting ~5% of a €1.8m line-energy bill by catching drift early.

### Assumptions

| Assumption | Tested | Source |
|---|---|---|
| Sub-metering capex is approved | No | capex plan |
| Drift is actionable within a shift | No | pilot target |

**Untested assumptions remain.** That drift alerts lead to action rather than being ignored.

## Cost

| | |
|---|---|
| Build estimate | €45,000 |
| Annual run estimate | €8,000 |
| Confidence | medium |

## Success criteria

**POC succeeds if:**
1. Two pilot lines show ≥5% energy-per-unit improvement over 8 weeks.

**POC stops if:**
1. Sub-metering data is too noisy to baseline, or no drift is actionable.

## Risks

| Risk | Severity | Owner |
|---|---|---|
| Sub-metering capex slips | low | sk.controlling@example.com |
