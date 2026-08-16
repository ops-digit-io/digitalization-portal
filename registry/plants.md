# Plant master

Plant codes used for scoping and CODEOWNERS. Edited by hand; a second approver is
not required (this is reference data, not authorization). Codes are `CC-SITE`
(ISO country + site abbreviation).

> **Illustrative network.** `DE-ALD` and `SK-PUC` are the codes this deployment
> started with; the remaining rows model a worldwide plant network so the portal's
> scoping, waves and landscape can be exercised end to end. Replace them with the
> real site master before go-live — the codes are the contract, the names are not.
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
| DE-ALD | Aldingen | DE | Europe | lead | Ops IT Europe | Phase 1 lead plant (predictive maintenance & quality) |
| DE-VIE | Viechtach | DE | Europe | wave-1 | Ops IT Europe | |
| SK-PUC | Púchov | SK | Europe | wave-1 | Ops IT Europe | |
| PL-BAR | Baranowo | PL | Europe | wave-2 | Ops IT Europe | |
| HU-SZE | Székesfehérvár | HU | Europe | wave-2 | Ops IT Europe | |
| RS-SUB | Subotica | RS | Europe | reference | Ops IT Europe | Extrusion only — no MES in scope |
| US-GRV | Grove City | US | Americas | lead | Ops IT Americas | Regional lead for the Americas |
| US-CUL | Cullman | US | Americas | wave-1 | Ops IT Americas | |
| BR-SAO | São Paulo | BR | Americas | wave-2 | Ops IT Americas | |
| MX-CEL | Celaya | MX | Americas | wave-2 | Ops IT Americas | |
| CN-SUZ | Suzhou | CN | Asia | lead | Ops IT Asia | Regional lead for Asia |
| CN-FOS | Foshan | CN | Asia | wave-1 | Ops IT Asia | |
| IN-PUN | Pune | IN | Asia | wave-2 | Ops IT Asia | |
| ALL | All plants | — | — | reference | — | Enterprise-wide scope for cross-plant demand |
