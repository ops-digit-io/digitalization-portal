# Value model

Confidence states and value categories. Mirrored in `lib/value.ts`. Currency: EUR.

> **Open decision #6.** Whether these categories are centrally fixed or
> plant-configurable is unresolved (`docs/07-value-model.md §7.10`). Until settled,
> they are treated as central so S8 variance is comparable across plants.

## Confidence states (`§7.2`)

| State | Permitted from | Basis |
|---|---|---|
| hypothesis | S1 | Requester intuition, unquantified |
| indicative | S3 | Baseline plus assumption, unmeasured |
| committed | S5 | Pilot-measured, extrapolated with stated method |
| realized | S8 | Measured in operation |

`committed` before S5 is refused portal-side (`lib/gates.ts`, `lib/value.ts`).

## Value categories (`§7.3`)

| Category | Computation | Euro figure | In portfolio value |
|---|---|---|---|
| quality_cost | quantity avoided × unit cost | yes | yes |
| availability | hours recovered × contribution per hour | yes | yes |
| labour_effort | hours avoided × loaded rate | yes | yes |
| material_energy_yield | quantity saved × unit price | yes | yes |
| working_capital | capital released × cost of capital | yes | yes |
| risk_compliance | qualitative | **never** | **never** |
| revenue | incremental revenue × margin | yes | yes |

One primary category per use case. `risk_compliance` never carries a euro figure
and is never summed into portfolio value.

## Aggregation (`§7.9`)

Headline portfolio value is **realized + committed only**. Indicative figures are
shown separately as pipeline. Risk-avoidance and external anchors are excluded.
