# Unified Namespace — the topic convention

> **Ships EMPTY.** Nothing here is invented — a register seeded with plausible
> rows reads as fact within a week, and every finding it then produces is a
> finding about fiction. Fill it with the agreed namespace convention: one row
> per segment, by hand here or through the portal where it can write. The
> columns are the contract.

The **to-be** half of the IT/OT integration roadmap. `registry/landscape.md` says
where each system stands today; this file says what it is moving towards.

A Unified Namespace is not a broker — it is an agreed *grammar*. The grammar is
the deliverable; the broker is an implementation detail. So the naming convention,
its owner and its status live here, in git, where they can be reviewed.

**Path grammar**

```
rehau/<site>/<area>/<line>/<cell>/<asset>/<signal>
```

Every segment is lowercase, hyphen-separated, and stable for the life of the
asset. A segment is omitted only from the right — `rehau/ald/extrusion` is a valid
prefix, `rehau/ald//l3` is not.

`Status` is the strategy → scaling → implementation gradient of the roadmap:
`proposed` (drafted, not agreed) · `agreed` (signed off by the standards owner,
not yet in the plants) · `published` (at least one plant publishes to it and the
payload is contract-conformant).

`Standard ref` points at the entry in the Department OS `standards` section that
carries the payload spec and the waiver path.

| Level | Segment | Example topic | Owner | Standard ref | Status |
|---|---|---|---|---|---|
