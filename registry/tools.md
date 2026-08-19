# Tool landscape

Every application the company runs, across all functions — not only the plant
systems. `registry/landscape.md` is the OT deep-dive (plant × ISA-95 level, down
to the controller); this is the enterprise view that sits above it: what tool
serves which capability, who owns it, and where it is going.

> Illustrative portfolio, seeded to exercise the model end to end. Replace with
> the real application register; the columns are the contract.

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
| APP-001 | SAP S/4HANA | SAP | ERP | finance_admin | global | private-cloud | invest | hub | Finance | Corporate IT | 4200 | critical | 1450000 | Core book of record |
| APP-002 | SAP Ariba | SAP | Procurement | procurement | global | saas | invest | api | Procurement | Corporate IT | 620 | important | 310000 | |
| APP-003 | Coupa | Coupa | Procurement | procurement | regional | saas | eliminate | point-to-point | Procurement Americas | Corporate IT | 180 | important | 185000 | Overlaps Ariba; Americas never migrated |
| APP-004 | Salesforce Sales Cloud | Salesforce | CRM | finance_admin | global | saas | invest | hub | Sales | Corporate IT | 900 | critical | 620000 | |
| APP-005 | HubSpot | HubSpot | Marketing automation | finance_admin | regional | saas | tolerate | api | Marketing Europe | Corporate IT | 140 | standard | 96000 | |
| APP-006 | Microsoft Dynamics CRM | Microsoft | CRM | finance_admin | regional | saas | migrate | point-to-point | Sales Asia | Corporate IT | 210 | important | 140000 | Migrating to Salesforce, no date set |
| APP-007 | Workday | Workday | HRIS | hr | global | saas | invest | api | HR | Corporate IT | 4200 | critical | 780000 | |
| APP-008 | Local time & attendance (Aldingen) | Kaba | Time & attendance | hr | plant | on-prem | tolerate | file-export | HR Europe | Ops IT Europe | 800 | important | 38000 | Nightly export to Workday |
| APP-009 | Personio | Personio | HRIS | hr | local | saas | eliminate | isolated | HR Europe | | 60 | standard | 21000 | Shadow IT — no IT owner, overlaps Workday |
| APP-010 | Siemens Teamcenter | Siemens | PLM | engineering | global | on-prem | invest | api | Engineering | Corporate IT | 480 | critical | 390000 | |
| APP-011 | SolidWorks | Dassault | CAD | engineering | global | on-prem | tolerate | point-to-point | Engineering | Corporate IT | 210 | important | 210000 | |
| APP-012 | AutoCAD | Autodesk | CAD | engineering | regional | on-prem | migrate | isolated | Engineering Americas | Corporate IT | 75 | standard | 64000 | Consolidating onto SolidWorks |
| APP-013 | Critical Manufacturing MES | Critical Manufacturing | MES | production | plant | on-prem | invest | hub | Operations | Ops IT Europe | 1400 | critical | 540000 | See registry/landscape.md for the per-plant view |
| APP-014 | In-house MES (Púchov) | — | MES | production | plant | on-prem | migrate | point-to-point | Operations Europe | Ops IT Europe | 260 | critical | 120000 | Bespoke schema, no documented API |
| APP-015 | Siemens WinCC | Siemens | SCADA | production | plant | edge | tolerate | point-to-point | Operations | Ops IT Europe | 340 | critical | 95000 | |
| APP-016 | Ignition | Inductive Automation | SCADA | production | plant | edge | invest | hub | Operations | Ops IT Europe | 190 | critical | 110000 | |
| APP-017 | AVEVA PI | AVEVA | Historian | production | plant | on-prem | tolerate | api | Operations | Ops IT Europe | 120 | important | 180000 | Not extended to new sites |
| APP-018 | SAP QM | SAP | QMS | quality | global | private-cloud | tolerate | hub | Quality | Corporate IT | 380 | important |  | |
| APP-019 | Babtec | Babtec | QMS | quality | regional | on-prem | eliminate | file-export | Quality Europe | Corporate IT | 95 | important | 72000 | Overlaps SAP QM; complaint handling still runs here |
| APP-020 | SAP PM | SAP | EAM / maintenance | maintenance | global | private-cloud | invest | hub | Maintenance | Corporate IT | 340 | important |  | |
| APP-021 | Local CMMS (Suzhou) | Local vendor | EAM / maintenance | maintenance | plant | on-prem | eliminate | isolated | Maintenance Asia | Ops IT Asia | 55 | important | 18000 | Isolated and still the only record for the site |
| APP-022 | SAP IBP | SAP | Supply chain planning | supply_chain | global | saas | invest | hub | Supply Chain | Corporate IT | 210 | critical | 260000 | |
| APP-023 | Excel planning workbooks | Microsoft | Supply chain planning | supply_chain | regional | saas | eliminate | isolated | Supply Chain Europe | | 130 | critical |  | Shadow IT — critical planning outside any system |
| APP-024 | Manhattan WMS | Manhattan | Warehouse management | supply_chain | regional | on-prem | tolerate | api | Logistics | Corporate IT | 290 | critical | 230000 | |
| APP-025 | Transporeon | Transporeon | Transport management | supply_chain | global | saas | invest | api | Logistics | Corporate IT | 160 | important | 140000 | |
| APP-026 | Power BI | Microsoft | BI / analytics | finance_admin | global | saas | invest | api | Controlling | Corporate IT | 1800 | important | 290000 | |
| APP-027 | Tableau | Salesforce | BI / analytics | finance_admin | regional | saas | migrate | api | Controlling Americas | Corporate IT | 320 | standard | 165000 | Overlaps Power BI |
| APP-028 | SAP Analytics Cloud | SAP | BI / analytics | finance_admin | global | saas | tolerate | hub | Controlling | Corporate IT | 240 | standard | 120000 | Third BI tool — consolidation candidate |
| APP-029 | Snowflake | Snowflake | Data platform | finance_admin | global | saas | invest | hub | Data & Analytics | Corporate IT | 90 | critical | 420000 | |
| APP-030 | Microsoft 365 | Microsoft | Collaboration | finance_admin | global | saas | invest | hub | Corporate Services | Corporate IT | 4200 | critical | 1180000 | |
| APP-031 | Confluence | Atlassian | Knowledge management | finance_admin | global | saas | tolerate | api | Corporate Services | Corporate IT | 1200 | standard | 96000 | |
| APP-032 | Dropbox | Dropbox | File sharing | finance_admin | local | saas | eliminate | isolated | Engineering | | 210 | standard | 28000 | Shadow IT — overlaps M365, no IT owner |
| APP-033 | Jira | Atlassian | Work management | finance_admin | global | saas | invest | api | Corporate IT | Corporate IT | 640 | important | 88000 | |
| APP-034 | ServiceNow | ServiceNow | ITSM | finance_admin | global | saas | invest | hub | Corporate IT | Corporate IT | 4200 | critical | 460000 | Run-lane handovers land here |
| APP-035 | Local ticket mailbox (Foshan) | — | ITSM | finance_admin | plant | on-prem | eliminate | isolated | Ops IT Asia | Ops IT Asia | 40 | standard |  | Tickets outside ServiceNow have no trail |
| APP-036 | Microsoft Entra ID | Microsoft | Identity & access | finance_admin | global | saas | invest | hub | Corporate IT | Corporate IT | 4200 | critical | 310000 | |
| APP-037 | CyberArk | CyberArk | Privileged access | finance_admin | global | private-cloud | invest | api | Cybersecurity | Corporate IT | 120 | critical | 150000 | |
| APP-038 | DocuWare | DocuWare | Document management | finance_admin | regional | on-prem | tolerate | point-to-point | Corporate Services | Corporate IT | 430 | standard | 74000 | |
| APP-039 | SAP SuccessFactors Learning | SAP | Learning management | hr | global | saas | tolerate | api | HR | Corporate IT | 3900 | standard | 185000 | |
| APP-040 | Energy monitoring (Aldingen) | Local vendor | Energy management | energy | plant | edge | evaluate | file-export | Operations Europe | Ops IT Europe | 25 | standard | 22000 | Pilot; candidate for the namespace |
| APP-041 | ESG reporting suite | Sphera | ESG reporting | esg | global | saas | evaluate | isolated | Corporate Services | Corporate IT | 35 | important | 85000 | Under evaluation, isolated for now |
| APP-042 | MuleSoft | Salesforce | Integration platform | finance_admin | global | saas | invest | hub | Corporate IT | Corporate IT | 45 | critical | 340000 | The hub the `hub` integration state refers to |
