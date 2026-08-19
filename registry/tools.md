# Tool landscape

Every application the company runs, across all functions — not only the plant
systems. `registry/landscape.md` is the OT deep-dive (plant × ISA-95 level, down
to the controller); this is the enterprise view that sits above it: what tool
serves which capability, who owns it, and where it is going.

> **Ships EMPTY.** Nothing here is invented — a register seeded with plausible
> rows reads as fact within a week, and every finding it then produces is a
> finding about fiction. Fill it with the real application register, by hand
> here or through the portal where it can write. The columns are the contract.

The columns below are the contract.

This file is the CURATED master, not the whole register: `/landscape` consolidates
it with the plant systems in `registry/landscape.md`, with tools added in the
portal (`landscape/tools.md` — same columns, same parser) and with the tools use
cases declare. Everything that behaves like a tool ends up in one list, because
every tool is a risk and a cost whether or not somebody filed it here.

**One table per file.** `parseFirstTable` reads every `|`-prefixed line in the
document and treats the first as the header, so a second table would silently
concatenate. The definitions below are lists for that reason.

`Capability` is the spine, and it is what makes the findings possible: two tools
in one capability at one scope is a **redundancy**, and a capability nobody
serves is a **gap**. Keep the vocabulary tight — a capability invented per tool
makes every tool unique and every finding disappear.

`Lifecycle` is the TIME model, the decision already taken about each tool:

- **`evaluate`** — under assessment, not yet in service.
- **`invest`** — the strategic answer for its capability. Extend it.
- **`tolerate`** — fit for purpose, no further investment. Leave alone.
- **`migrate`** — being replaced; `Notes` should name the successor.
- **`eliminate`** — decided to go. Still here is the finding, not the plan.

`Integration` is ordinal, mirroring the OT landscape's column so the two views
read the same way: `isolated` → `file-export` → `point-to-point` → `api` →
`hub` (through the integration platform).

`Scope`: `global` · `regional` · `plant` · `local`.
`Hosting`: `saas` · `private-cloud` · `on-prem` · `edge`.
`Criticality`: `critical` (production or books stop) · `important` · `standard` · `low`.
`Users` is an approximate headcount, used to weight findings — a redundancy
between two tools with four users each is not the same problem as one between
two tools with two thousand.

`Annual cost` is the run cost in EUR per year — licence, hosting and support, as
controlling books it. It is what turns a finding into a number. An EMPTY cell is
not zero: nobody has costed the tool, which is its own finding (*unbudgeted*) and
one of the risk factors the surface scores.

`Business owner` and `IT owner` name **teams**, never people (constraint #6). A
row missing either is shadow IT, and that is exactly what the surface reports.

| ID | Tool | Vendor | Capability | Domain | Scope | Hosting | Lifecycle | Integration | Business owner | IT owner | Users | Criticality | Annual cost | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
