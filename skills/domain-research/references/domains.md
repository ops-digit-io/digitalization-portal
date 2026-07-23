# Domains covered

The domain knowledge base (`lib/domain-knowledge.ts`) carries, for each domain, the
personas, recurring epic themes, typical NFRs, data sources, standards, and
comparable solution patterns the requirements-analysis agent grounds its output in.

| Domain | Primary personas | Recurring epics | Typical data | Standards |
|---|---|---|---|---|
| quality | line operator, shift quality lead, quality engineer | defect capture, root-cause analytics, operator alerting | MES, inspection, SPC | ISO 9001, IATF 16949 |
| maintenance | maintenance technician, reliability engineer | condition monitoring, predictive alerting, work-order integration | PLC/SCADA, CMMS, sensors | ISO 55000 |
| energy | energy manager, production supervisor | metering & baseline, consumption analytics, reduction actions | meters, BMS | ISO 50001 |
| production | production supervisor, line operator | throughput visibility, loss analytics, shift workflow | MES, PLC counters, andon | OEE (internal) |
| procurement | category buyer, procurement lead | knowledge retrieval, draft assistance, review & control | contract repo, ERP | procurement policy |
| logistics | warehouse operator, logistics planner | inventory visibility, flow analytics, replenishment | WMS, ERP, scanning | logistics policy |
| safety | EHS officer, line supervisor | hazard capture, risk analytics, action tracking | EHS system, incidents | ISO 45001 |
| engineering | process engineer, automation engineer | parameter capture, analysis & optimisation, change workflow | historian, PLC/DCS | engineering standards |

Anything unmatched falls back to a generic base (data foundation → insight/alerting
→ workflow, with generic personas and NFRs). Extend by adding a domain entry.
