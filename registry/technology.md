# Technology evaluation register

What has been looked at, what was tried, and — the part that matters — **what was
decided**. An evaluation whose verdict is not attached to a consequence is a blog
post; the consequence lives in `registry/rollout.md`, which may only scale a
technology whose `Status` here is `adopt`.

> **Ships EMPTY.** Nothing here is invented — a register seeded with plausible
> rows reads as fact within a week, and every finding it then produces is a
> finding about fiction. Fill it with the technology decisions actually taken,
> by hand here or through the portal where it can write. The columns are the
> contract.

> **One table per file.** `parseFirstTable` reads every `|`-prefixed line in the
> document and treats the first as the header, so a second table silently
> concatenates into the first. The register below must stay the only table here —
> which is why the ring definitions are a list.

`Status` rings, outermost first:

- **`assess`** — on the radar. Nobody has run it here.
- **`trial`** — being tried at a named plant, with named evidence.
- **`adopt`** — decided: the group default. **Only `adopt` may enter a rollout wave.**
- **`hold`** — deliberately not pursued now, with a reason. Not a failure, a decision.
- **`retire`** — was standard, is being removed. `Supersedes` names what replaced it.

The `hold` and `retire` rows are load-bearing. A register that only records what
was adopted cannot show that anything was ever declined, and "decides what
actually goes into rollout" is a claim about the declining as much as the
adopting.

`Evidence` points at a demand (`UC-…`) or a process engagement — the thing that
was actually measured. A row in `trial` or `adopt` with no evidence is an opinion.

| ID | Technology | Layer | Status | Trialled at | Evidence | Decision | Decided on | Decided by | Supersedes |
|---|---|---|---|---|---|---|---|---|---|
