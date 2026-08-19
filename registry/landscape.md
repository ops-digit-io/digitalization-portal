# System landscape

One row per plant × system. This is the **as-is** half of the IT/OT integration
roadmap: what runs in each plant, at which ISA-95 level, and how far its data has
travelled towards the Unified Namespace.

> Illustrative inventory, seeded to exercise the model end to end. Replace with
> the real per-site survey; the columns are the contract.

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
| DE-ALD | L4 | ERP | SAP | Orders, materials, costing | broker-published | REST | rehau/ald | Corporate IT | hourly | |
| DE-ALD | L3 | MES | Critical Manufacturing | Order execution, genealogy | broker-published | REST | rehau/ald | Ops IT Europe | live | |
| DE-ALD | L3 | Historian | AVEVA PI | Process data archive | uns-modelled | OPC-UA | rehau/ald | Ops IT Europe | live | |
| DE-ALD | L3 | UNS broker | HiveMQ | Namespace backbone | uns-modelled | MQTT | rehau/ald | Ops IT Europe | live | |
| DE-ALD | L2 | SCADA extrusion | Siemens WinCC | Line supervision | broker-published | OPC-UA | rehau/ald/extrusion | Ops IT Europe | live | |
| DE-ALD | L2 | SCADA fabrication | Ignition | Line supervision | broker-published | MQTT | rehau/ald/fabrication | Ops IT Europe | live | |
| DE-ALD | L1 | PLC extrusion line 3 | Siemens S7-1500 | Control | point-to-point | OPC-UA | rehau/ald/extrusion/l3 | Ops IT Europe | live | |
| DE-ALD | L1 | Coating line controller | Vendor black box | Control | none | none | | Ops IT Europe | on-request | Closed vendor system, no read interface offered |
| DE-ALD | L0 | Inline gauging | Sikora | Dimensional measurement | point-to-point | OPC-UA | rehau/ald/extrusion/gauge | Ops IT Europe | live | |
| DE-VIE | L4 | ERP | SAP | Orders, materials, costing | broker-published | REST | rehau/vie | Corporate IT | hourly | |
| DE-VIE | L3 | MES | Critical Manufacturing | Order execution | point-to-point | SQL | | Ops IT Europe | hourly | No broker on site — direct DB reads only |
| DE-VIE | L2 | SCADA extrusion | Siemens WinCC | Line supervision | point-to-point | OPC-UA | | Ops IT Europe | live | |
| DE-VIE | L1 | PLC extrusion line 1 | Siemens S7-300 | Control | none | none | | Ops IT Europe | on-request | Legacy CPU, no OPC-UA server, spare-part risk |
| SK-PUC | L4 | ERP | SAP | Orders, materials, costing | broker-published | REST | rehau/puc | Corporate IT | hourly | |
| SK-PUC | L3 | MES | In-house | Order execution | point-to-point | SQL | | Ops IT Europe | hourly | Bespoke schema, no documented API |
| SK-PUC | L3 | Historian | — | — | none | none | | Ops IT Europe | on-request | No historian on site — no process archive exists |
| SK-PUC | L2 | SCADA fabrication | Rockwell FactoryTalk | Line supervision | point-to-point | OPC-UA | | Ops IT Europe | live | |
| SK-PUC | L1 | PLC welding cell 2 | Rockwell ControlLogix | Control | point-to-point | OPC-UA | | Ops IT Europe | live | |
| SK-PUC | L0 | Weld quality sensor | Branson | In-process measurement | none | none | | Ops IT Europe | on-request | Data stays on the cell HMI, no export path |
| PL-BAR | L4 | ERP | SAP | Orders, materials, costing | broker-published | REST | rehau/bar | Corporate IT | hourly | |
| PL-BAR | L3 | MES | — | — | none | none | | Ops IT Europe | on-request | No MES — order execution on paper travellers |
| PL-BAR | L2 | SCADA extrusion | Siemens WinCC | Line supervision | file-export | CSV | | Ops IT Europe | daily | Nightly CSV drop to a file share |
| PL-BAR | L1 | PLC extrusion line 2 | Siemens S7-1200 | Control | none | none | | Ops IT Europe | on-request | Reachable only from the engineering laptop |
| HU-SZE | L4 | ERP | SAP | Orders, materials, costing | broker-published | REST | rehau/sze | Corporate IT | hourly | |
| HU-SZE | L3 | MES | Critical Manufacturing | Order execution | point-to-point | REST | | Ops IT Europe | hourly | |
| HU-SZE | L2 | SCADA fabrication | Ignition | Line supervision | point-to-point | MQTT | | Ops IT Europe | live | |
| RS-SUB | L4 | ERP | SAP | Orders, materials, costing | broker-published | REST | rehau/sub | Corporate IT | hourly | |
| RS-SUB | L2 | SCADA extrusion | Siemens WinCC | Line supervision | file-export | CSV | | Ops IT Europe | daily | |
| US-GRV | L4 | ERP | SAP | Orders, materials, costing | broker-published | REST | rehau/grv | Corporate IT | hourly | |
| US-GRV | L3 | MES | Critical Manufacturing | Order execution, genealogy | broker-published | REST | rehau/grv | Ops IT Americas | live | |
| US-GRV | L3 | UNS broker | HiveMQ | Namespace backbone | broker-published | MQTT | rehau/grv | Ops IT Americas | live | Topic tree not yet modelled to the standard |
| US-GRV | L2 | SCADA extrusion | Ignition | Line supervision | broker-published | MQTT | rehau/grv/extrusion | Ops IT Americas | live | |
| US-GRV | L1 | PLC extrusion line 5 | Allen-Bradley | Control | point-to-point | OPC-UA | | Ops IT Americas | live | |
| US-CUL | L4 | ERP | SAP | Orders, materials, costing | broker-published | REST | rehau/cul | Corporate IT | hourly | |
| US-CUL | L3 | MES | In-house | Order execution | file-export | CSV | | Ops IT Americas | daily | Export scheduled, not queryable |
| US-CUL | L2 | SCADA fabrication | Rockwell FactoryTalk | Line supervision | point-to-point | OPC-UA | | Ops IT Americas | live | |
| BR-SAO | L4 | ERP | SAP | Orders, materials, costing | broker-published | REST | rehau/sao | Corporate IT | hourly | |
| BR-SAO | L3 | MES | — | — | none | none | | Ops IT Americas | on-request | No MES |
| BR-SAO | L2 | SCADA extrusion | Vendor black box | Line supervision | none | none | | Ops IT Americas | on-request | OEM-locked line package, no data clause in contract |
| MX-CEL | L4 | ERP | SAP | Orders, materials, costing | broker-published | REST | rehau/cel | Corporate IT | hourly | |
| MX-CEL | L2 | SCADA fabrication | Ignition | Line supervision | file-export | CSV | | Ops IT Americas | daily | |
| CN-SUZ | L4 | ERP | SAP | Orders, materials, costing | broker-published | REST | rehau/suz | Corporate IT | hourly | |
| CN-SUZ | L3 | MES | Local vendor | Order execution | point-to-point | SQL | | Ops IT Asia | hourly | Vendor holds the schema; changes are chargeable |
| CN-SUZ | L3 | Historian | — | — | none | none | | Ops IT Asia | on-request | No process archive |
| CN-SUZ | L2 | SCADA extrusion | Siemens WinCC | Line supervision | point-to-point | OPC-UA | | Ops IT Asia | live | |
| CN-SUZ | L1 | PLC extrusion line 7 | Siemens S7-1500 | Control | none | none | | Ops IT Asia | on-request | Network segment not routable from the plant IT VLAN |
| CN-FOS | L4 | ERP | SAP | Orders, materials, costing | broker-published | REST | rehau/fos | Corporate IT | hourly | |
| CN-FOS | L3 | MES | Local vendor | Order execution | file-export | CSV | | Ops IT Asia | daily | |
| CN-FOS | L2 | SCADA fabrication | Local vendor | Line supervision | none | none | | Ops IT Asia | on-request | No documented interface, vendor unresponsive |
| IN-PUN | L4 | ERP | SAP | Orders, materials, costing | broker-published | REST | rehau/pun | Corporate IT | hourly | |
| IN-PUN | L3 | MES | — | — | none | none | | Ops IT Asia | on-request | No MES — greenfield candidate |
| IN-PUN | L2 | SCADA extrusion | Siemens WinCC | Line supervision | point-to-point | OPC-UA | | Ops IT Asia | live | |
