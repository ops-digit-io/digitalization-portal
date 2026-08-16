# Unified Namespace — the topic convention

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
| enterprise | `rehau` | `rehau` | IT/OT Architecture | STD-UNS-01 | published |
| site | `<site>` | `rehau/ald` | IT/OT Architecture | STD-UNS-01 | published |
| area | `<area>` | `rehau/ald/extrusion` | Ops IT Europe | STD-UNS-02 | published |
| line | `<line>` | `rehau/ald/extrusion/l3` | Ops IT Europe | STD-UNS-02 | published |
| cell | `<cell>` | `rehau/ald/fabrication/w2/weld-1` | Ops IT Europe | STD-UNS-03 | agreed |
| asset | `<asset>` | `rehau/ald/extrusion/l3/gauge` | Ops IT Europe | STD-UNS-03 | agreed |
| signal | `<signal>` | `rehau/ald/extrusion/l3/gauge/wall-thickness` | IT/OT Architecture | STD-UNS-04 | proposed |
| signal | `<signal>` (state) | `rehau/ald/extrusion/l3/state` | IT/OT Architecture | STD-UNS-04 | proposed |
| signal | `<signal>` (order ctx) | `rehau/ald/extrusion/l3/order` | IT/OT Architecture | STD-UNS-05 | proposed |
