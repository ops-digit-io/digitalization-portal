# Technology evaluation register

What has been looked at, what was tried, and — the part that matters — **what was
decided**. An evaluation whose verdict is not attached to a consequence is a blog
post; the consequence lives in `registry/rollout.md`, which may only scale a
technology whose `Status` here is `adopt`.

> Illustrative register, seeded to exercise the model end to end.

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
| TEC-001 | MQTT Sparkplug B | L2 | adopt | DE-ALD | UC-2026-0033 | Group default for shopfloor publish. Self-describing payloads removed the per-line mapping work that killed the 2025 pilot. | 2026-03-12 | Architektur-Board | TEC-014 |
| TEC-002 | HiveMQ broker | L3 | adopt | DE-ALD | UC-2026-0033 | Group default broker. Clustering and the OPC-UA bridge were the deciding features. | 2026-03-12 | Architektur-Board | |
| TEC-003 | OPC-UA PubSub | L1 | trial | US-GRV | UC-2026-0041 | Under trial for direct L1 publish where a gateway would otherwise be needed. | | | |
| TEC-004 | Unified Namespace modelling (ISA-95) | L3 | adopt | DE-ALD | UC-2026-0033 | The topic grammar itself. Standardised as STD-UNS-01..05. | 2026-03-12 | Architektur-Board | |
| TEC-005 | Edge gateway (Siemens IE) | L2 | adopt | DE-ALD | UC-2026-0039 | Standard route for PLCs with no native OPC-UA server. | 2026-04-02 | Architektur-Board | |
| TEC-006 | TimescaleDB historian | L3 | trial | US-GRV | UC-2026-0042 | Trialled as the open alternative where a PI licence is not justified. | | | |
| TEC-007 | AVEVA PI | L3 | adopt | DE-ALD | | Remains standard where it is already installed. Not extended to new sites. | 2026-04-02 | Architektur-Board | |
| TEC-008 | Kafka on the shopfloor | L3 | hold | | UC-2026-0044 | Declined for plant-level transport: operationally heavy for the data rates we actually have, and duplicates the broker. Revisit if cross-site streaming becomes a requirement. | 2026-05-14 | Architektur-Board | |
| TEC-009 | Vendor cloud analytics (OEM portal) | L4 | hold | CN-SUZ | UC-2026-0045 | Declined. The data leaves our namespace and comes back as a chart we cannot recompute. Fails the source-of-truth rule in systems-of-record. | 2026-05-14 | Architektur-Board | |
| TEC-010 | Inline vision QC (edge inference) | L2 | trial | DE-ALD | UC-2026-0051 | Under trial for surface defect detection at the extrusion exit. | | | |
| TEC-011 | Wireless sensor mesh (LoRaWAN) | L0 | assess | | | On the radar for retrofit condition monitoring where cabling is the cost driver. | | | |
| TEC-012 | Asset Administration Shell (AAS) | L3 | assess | | | On the radar as the asset-model layer above the namespace. No trial scheduled. | | | |
| TEC-013 | Time-series anomaly detection (unsupervised) | L3 | trial | DE-ALD | UC-2026-0039 | Trialled on extrusion process data ahead of the AI framework. | | | |
| TEC-014 | Flat MQTT topics (pre-Sparkplug) | L2 | retire | DE-ALD | | Being removed. Topic strings carried no type or unit, so every consumer re-implemented parsing. | 2026-03-12 | Architektur-Board | |
| TEC-015 | Nightly CSV drop to file share | L3 | retire | PL-BAR | | Being removed wherever a broker lands. Daily freshness cannot support any closed loop. | 2026-04-02 | Architektur-Board | |
