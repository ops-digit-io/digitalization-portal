# Rollout waves

The scaling half of the roadmap: a capability proven at a lead plant, sequenced
across the network. One row per wave × plant.

> Illustrative plan, seeded to exercise the model end to end.

**The invariant:** a wave may only scale a technology whose `Status` in
`registry/technology.md` is `adopt`. It is checked in `lib/otx/rollout.ts` and
asserted in its tests, because the whole point of the evaluation register is that
it gates this file. Scaling something nobody adopted is how a pilot becomes a
fleet of one-offs.

`State`: `not-started` · `scheduled` · `in-progress` · `live` · `on-hold`.
`Gate` reuses the funnel's vocabulary (`G1`–`G7`, `T0`–`T5`) rather than inventing
a parallel one. `Blocker` mirrors the Blocking-Point column the portfolio section
already requires — and where a blocker names a system, it is the same system
`/landscape` lists in the UNS backlog.

| Wave | Capability | Technology | Plant | State | Gate | Owner | Start | Live | Blocker |
|---|---|---|---|---|---|---|---|---|---|
| W1 | UNS backbone | TEC-002 | DE-ALD | live | G7 | Ops IT Europe | 2026-01-15 | 2026-03-10 | |
| W1 | UNS backbone | TEC-002 | US-GRV | in-progress | G6 | Ops IT Americas | 2026-04-01 | | Topic tree not yet modelled to STD-UNS-02 |
| W1 | UNS backbone | TEC-002 | CN-SUZ | scheduled | G5 | Ops IT Asia | 2026-09-01 | | |
| W1 | Shopfloor publish | TEC-001 | DE-ALD | live | G7 | Ops IT Europe | 2026-01-15 | 2026-03-10 | |
| W1 | Shopfloor publish | TEC-001 | US-GRV | in-progress | G6 | Ops IT Americas | 2026-04-01 | | |
| W1 | Namespace modelling | TEC-004 | DE-ALD | live | G7 | Architektur | 2026-01-15 | 2026-03-10 | |
| W1 | Namespace modelling | TEC-004 | US-GRV | in-progress | G6 | Architektur | 2026-04-01 | | Waiting on STD-UNS-03 leaving draft |
| W2 | UNS backbone | TEC-002 | DE-VIE | scheduled | G5 | Ops IT Europe | 2026-10-01 | | |
| W2 | UNS backbone | TEC-002 | SK-PUC | scheduled | G5 | Ops IT Europe | 2026-10-01 | | No historian on site — nothing to publish yet |
| W2 | UNS backbone | TEC-002 | US-CUL | not-started | G5 | Ops IT Americas | | | |
| W2 | UNS backbone | TEC-002 | CN-FOS | not-started | G5 | Ops IT Asia | | | SCADA has no documented interface, vendor unresponsive |
| W2 | Shopfloor publish | TEC-001 | DE-VIE | scheduled | G5 | Ops IT Europe | 2026-10-01 | | Extrusion line 1: S7-300 has no OPC-UA server |
| W2 | Shopfloor publish | TEC-001 | SK-PUC | scheduled | G5 | Ops IT Europe | 2026-10-01 | | |
| W2 | Edge gateway retrofit | TEC-005 | DE-VIE | scheduled | G5 | Ops IT Europe | 2026-10-01 | | |
| W2 | Edge gateway retrofit | TEC-005 | PL-BAR | not-started | G5 | Ops IT Europe | | | Extrusion line 2 reachable only from the engineering laptop |
| W2 | Edge gateway retrofit | TEC-005 | CN-SUZ | on-hold | G5 | Ops IT Asia | | | Extrusion line 7 network segment not routable from the plant IT VLAN |
| W3 | UNS backbone | TEC-002 | PL-BAR | not-started | G5 | Ops IT Europe | | | No MES — order context would be missing from the namespace |
| W3 | UNS backbone | TEC-002 | HU-SZE | not-started | G5 | Ops IT Europe | | | |
| W3 | UNS backbone | TEC-002 | BR-SAO | not-started | G5 | Ops IT Americas | | | OEM-locked line package, no data clause in the contract |
| W3 | UNS backbone | TEC-002 | MX-CEL | not-started | G5 | Ops IT Americas | | | |
| W3 | UNS backbone | TEC-002 | IN-PUN | not-started | G5 | Ops IT Asia | | | Greenfield — candidate to skip straight to the standard |
| W3 | Historian | TEC-007 | SK-PUC | not-started | G5 | Ops IT Europe | | | |
| W3 | Historian | TEC-007 | CN-SUZ | not-started | G5 | Ops IT Asia | | | |
