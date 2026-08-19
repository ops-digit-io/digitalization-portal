# Plant master

Plant codes used for scoping and CODEOWNERS. Edited by hand; a second approver is
not required (this is reference data, not authorization). Codes are `CC-SITE`
(ISO country + site abbreviation).

> **Ships EMPTY.** Nothing here is invented — a register seeded with plausible
> rows reads as fact within a week, and every finding it then produces is a
> finding about fiction. Fill it with the real site master: one row per plant,
> by hand here or through the portal where it can write. The columns are the
> contract.
>
> The live source of the dropdown values is `PLANTS` in `lib/demand.ts`, seeded
> into the admin-managed list in `lib/category-store.ts`. Keep the two in step;
> this file is the documented master and the one a human reads.

`Site role` drives rollout sequencing (`registry/rollout.md`): `lead` proves a
capability, `wave-1`/`wave-2` adopt it, `reference` is scoped out of waves.
`Ops IT owner` names a **team**, never a person — per-person load is out of
scope by design (`docs/14-compliance.md`).

| Code | Name | Country | Region | Site role | Ops IT owner | Notes |
|---|---|---|---|---|---|---|
