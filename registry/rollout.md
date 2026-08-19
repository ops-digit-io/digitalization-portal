# Rollout waves

The scaling half of the roadmap: a capability proven at a lead plant, sequenced
across the network. One row per wave × plant.

> **Ships EMPTY.** Nothing here is invented — a register seeded with plausible
> rows reads as fact within a week, and every finding it then produces is a
> finding about fiction. Fill it with the scaling waves: one row per wave ×
> plant, by hand here or through the portal where it can write. The columns
> are the contract.

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
