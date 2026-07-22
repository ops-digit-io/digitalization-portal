# 07 — Value Model

## 7.1 Principle

Value is measured, not asserted. A business case is a hypothesis with a
falsification date, not a document written to pass a gate.

Three rules follow:

1. **Every figure names its basis.** A number without a stated basis and an
   assumption list is not admissible in a business case.
2. **Indicative and committed are different objects.** They are never presented
   in the same register, and the transition between them requires measurement.
3. **Variance is published regardless of direction.** A portfolio that only
   reports favourable variance is not measuring.

## 7.2 Confidence states

| State | Permitted from | Basis | Used for |
|---|---|---|---|
| `hypothesis` | S1 | Requester intuition, unquantified | Triage ranking only |
| `indicative` | S3 | Baseline plus assumption, unmeasured | G3 approval, entry prioritization |
| `committed` | S5 | Pilot-measured, extrapolated with stated method | G5 onward, global case at G6 |
| `realized` | S8 | Measured in operation | Variance reporting |

`confidence: committed` is rejected in CI before S5. This is the single most
important enforcement in the value model, because the failure mode it prevents —
an indicative figure quoted downstream as though it were measured — is how
portfolios lose credibility.

## 7.3 Value categories

Defined in `portal/registry/value-model.md`.

| Category | Computation | Requires | Caution |
|---|---|---|---|
| Quality cost | quantity avoided × unit cost | baseline rate, unit cost source | — |
| Availability | hours recovered × contribution per hour | baseline downtime, contribution margin source | Recovered hours are value only where capacity is the binding constraint. Where demand binds, they are not P&L value. |
| Labour effort | hours avoided × loaded rate | baseline hours, loaded rate source | Effort reduction is value only where hours are redeployed or not backfilled. State which applies. |
| Material and energy yield | quantity saved × unit price | baseline consumption, price source | — |
| Working capital | capital released × cost of capital | baseline capital, cost of capital rate | — |
| Risk and compliance | qualitative | risk statement | **Never carries a euro figure.** Recorded qualitatively with the obligation it satisfies. Never summed into portfolio value. |
| Revenue | incremental revenue × margin | volume basis, margin source | Where the mandate excludes external product development, applies to internal business-development workflows only. |

Currency: EUR.

### Category rules

- One primary category per use case. Secondary effects are noted in the
  business case narrative but not summed.
- `risk_avoidance` never carries a euro figure in portfolio aggregation. Summing
  compliance obligations into value inflates the portfolio and is the most common
  way stage-gate portfolios become untrustworthy.
- The `caution` fields are not advisory. Each names a condition under which the
  computation produces a number that is arithmetically correct and economically
  false. The business case must state which side of the condition it is on.

## 7.4 Baseline discipline

No KPI without a baseline. No baseline without a method.

A baseline section in `business-case.md` carries: the metric, its current value
and unit, the period it covers, the method by which it was measured, the source
system or record, the named owner, and whether it is verified.

Verified means measured, not estimated. It must be true before G5.

| Requirement | Rule |
|---|---|
| Period | At least one full representative cycle. A single shift is not a baseline. |
| Method | Reproducible by someone else. "Estimated by the team" is a placeholder, not a method. |
| Verification | `verified: true` requires measurement from a system of record or a documented sample. |
| Timing | The baseline is fixed at G3, before the intervention. A baseline established after the change is not a baseline. |
| Verification deadline | `baseline_verified: true` is required before G5. An unverified baseline may pass G3 but cannot support a committed figure. |

**Where OT connectivity does not exist** — which is the common case in Phase 1 —
the baseline may be established by documented manual sampling, attested by the
value owner. This is explicitly permitted. It is recorded as
`method: manual_sample` with `attested_by`, and it is honest about its precision
rather than pretending to measurement it does not have.

## 7.5 External benchmarks

Benchmark figures from consulting studies and industry surveys are **anchors**,
never projections. They are recorded in a separate field and never enter the
computed value.

Anchors appear under an **External anchors** heading in the business case,
each with its claim, source, year, and an explicit note that it is directional
and not applied to the computed figure.

Rules:
- An anchor may inform whether an internal estimate is plausible.
- An anchor may never be the basis of an internal estimate.
- Anchors are always attributed with source and year.
- Anchors are excluded from portfolio value aggregation.

The relevant base rate for calibration: a large majority of manufacturers report
operational gains from digitalization, while under half report measurable
financial gains. Any business case projecting financial value should be read
against that gap, not against the operational-gain figure.

## 7.6 Indicative to committed

The transition happens at S5, on pilot measurement.

```
indicative (S3)                     committed (S5)
──────────────                      ──────────────
baseline, estimated                 baseline, verified
assumption-based                    measurement-based
single-plant or extrapolated        pilot-measured
untested assumptions flagged        assumptions tested or restated
global potential directional        per-plant value measured, scaling stated
```

The pilot must record variance against the indicative figure and explain it:

The pilot records the committed figure, the indicative figure it replaces, the
variance between them, and an explanation naming which assumption moved. See
[03.8](03-data-model.md#38-pilotkpimd--s5) for the document shape.

A pilot that matches its indicative figure exactly is more suspicious than one
that misses it. The variance explanation is the artifact of interest, because it
is where the organization learns how its own estimation errs.

## 7.7 Scaling method

At G6 the global case is mandatory and must state its extrapolation method
explicitly.

| Method | When valid |
|---|---|
| `per_plant_measured` | Value measured at two or more plants; mean applied with stated variance |
| `volume_scaled` | Pilot value scaled by production volume; requires the value driver to be volume-proportional |
| `headcount_scaled` | For effort-reduction cases; requires comparable process organization |
| `site_class_scaled` | Plants grouped by class; pilot value applied within class only |

Bare multiplication of pilot value by plant count is not an accepted method. The
plant network is heterogeneous; the extrapolation must state how it handles that.

**Open point.** Whether the largest plants are a sufficient proxy for global
scaling is unresolved. Until it is, `site_class_scaled` with an explicit class
definition is the safer default.

## 7.8 Variance at S8

Every use case in steady operations publishes variance on a defined cadence,
default quarterly.

```
variance = (realized_annualized − committed_annual) / committed_annual
```

| Variance | Status | Action |
|---|---|---|
| ≥ −0.10 | On track | None |
| −0.10 to −0.25 | Below target | Optimize; documented plan |
| < −0.25 | Materially below | Escalate to sponsor and portfolio forum |
| > +0.25 | Materially above | Review method; over-delivery usually means the baseline or the attribution is wrong |

Positive variance receives the same scrutiny as negative. A use case reporting
value far above its committed case is more often a measurement artifact than an
outperformance, and treating it as good news is how portfolios accumulate
fictional value.

### Retirement

A use case may be retired from S8 when the value has decayed to zero, the process
it served no longer exists, or the solution has been superseded. Retirement
records a final value statement — cumulative realized value and the reason for
retirement. Retired use cases remain searchable.

## 7.9 Portfolio aggregation

| Layer | Includes | Excludes |
|---|---|---|
| Pipeline value | `indicative` figures, S3–S4 | Not reported as expected value |
| Committed value | `committed` figures, S5–S7 | — |
| Realized value | Measured, S8 | — |
| Portfolio value | Realized + committed | Indicative, risk-avoidance, external anchors |

Headline portfolio value is **realized plus committed only**. Indicative figures
are shown separately as pipeline, clearly labelled. This is the difference
between a portfolio statement that survives audit and one that does not.

## 7.10 Open points

| Open point | Effect |
|---|---|
| Whether value categories are centrally fixed or plant-configurable | If plants compute value differently, S8 variance across plants is not comparable |
| Loaded rate and cost-of-capital sources — single enterprise figure or per-plant | Affects comparability of `labour_effort` and `working_capital` cases |
| Whether recovered availability counts where capacity is not binding | Determines admissibility of a large class of maintenance use cases |
| Integration with finance systems for realized value | Phase 1 holds value figures as portal artifacts only; no finance system integration |
