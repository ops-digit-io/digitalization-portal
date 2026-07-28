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
| it | end user, IT service owner, sysadmin | service visibility, self-service & automation, governance & security | ITSM, IdP, monitoring | ISO 27001, IT policy |
| data | data analyst, data engineer, business owner | trusted data foundation, analytics & insight, access & literacy | warehouse/lakehouse, source systems, BI | data governance, GDPR |
| finance | controller, financial analyst, budget owner | reporting & close, planning & forecasting, controls & compliance | ERP/GL, planning, sub-ledgers | IFRS/GAAP, SOX-style controls |
| hr | employee, HR business partner, people manager | employee self-service, people analytics (aggregate), process & compliance | HRIS, payroll, learning | GDPR, labour law, works council |
| customer | customer, sales rep, service agent | customer visibility, engagement & service, self-service | CRM, e-commerce, service | GDPR, WCAG, data governance |
| sustainability | sustainability manager, site energy/EHS lead | data collection, reporting & disclosure, reduction tracking | meters, ERP, supplier data | GHG Protocol, CSRD/ESRS, ISO 14001 |

Domain aliases resolve to these keys (e.g. `software`/`digital`→it, `analytics`/`ai`/
`bi`→data, `controlling`→finance, `sales`/`marketing`→customer, `esg`→sustainability).
Anything unmatched falls back to a generic base (data foundation → insight/alerting
→ workflow, with generic personas and NFRs). Extend by adding a domain entry.

## The second axis — solution archetype

The domain (above) is only half the grounding. The **archetype** — the shape of the
solution — is the other axis, and it is what lets the Analyst handle *any* digital use
case. See the `usecase-archetypes` skill and `lib/usecase-archetypes.ts` for the full
catalogue (analytics, prediction, computer vision, GenAI/RAG, automation,
optimization, integration, IoT, self-service, data foundation).
