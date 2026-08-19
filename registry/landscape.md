# System landscape

One row per plant × system. This is the **as-is** half of the IT/OT integration
roadmap: what runs in each plant, at which ISA-95 level, and how far its data has
travelled towards the Unified Namespace.

> **Ships EMPTY.** Nothing here is invented — a register seeded with plausible
> rows reads as fact within a week, and every finding it then produces is a
> finding about fiction. Fill it with the per-site survey: one row per plant ×
> system, by hand here or through the portal where it can write. The columns
> are the contract.

This file is the OT half of ONE register: `/landscape` consolidates it with
`registry/tools.md`, with tools added in the portal (`landscape/tools.md`) and with
the tools use cases declare. A system that matches a registered tool becomes that
tool's installation here; a system that matches nothing becomes a row of its own —
running in a plant, in no application register.

A row with **no vendor and no role** records an ABSENCE ("no historian on site"),
not a system. It stays a per-plant gap and never becomes a tool.

**`Integration` is ordinal** — `none` → `file-export` → `point-to-point` →
`broker-published` → `uns-modelled`. Per-plant UNS maturity is *derived* from this
column (`lib/otx/landscape.ts`), never stored, so it cannot drift from the rows.

**`Interface` is what answers the funnel's K2.2 (`Interface-Zugänglichkeit`).**
`none` means a process engagement touching this system cannot get past the
diagnostics gate — see `lib/process/criteria.ts` and branch `Z1b`. Those systems
are the UNS backlog, ranked by how many engagements each one unblocks.

`Data owner` names a team. `Freshness` is the age of the newest data a consumer
can actually read: `live` (sub-minute) · `hourly` · `daily` · `on-request`.

| Plant | ISA-95 | System | Vendor | Role | Integration | Interface | UNS topic root | Data owner | Freshness | Barrier |
|---|---|---|---|---|---|---|---|---|---|---|
