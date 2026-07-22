# Metric definitions

Reference for `portfolio-analysis`. Derivations mirror `lib/analysis/*`.

| Metric | Definition | Source |
|---|---|---|
| Active count | Use cases not parked/killed/retired | `assembleBoard` |
| Days in stage | `now − since` (whole days) | `board.ts` |
| Workload | Person-weeks remaining to steady ops, level/heat-adjusted | `estimate.ts` |
| Horizon value | Risk-discounted annual value that lands within the horizon | `estimate.ts` |
| Value per effort | Horizon value ÷ effort weeks | `portfolio.ts` |
| Pipeline / committed / realized | Value by confidence layer (S3–4 / S5–7 / S8) | `07-value-model §7.9` |

Rules:
- Pipeline is never reported as expected value; portfolio value = committed + realized only.
- `risk_compliance` value never carries a euro figure and is never summed.
