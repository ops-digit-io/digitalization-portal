# Domain taxonomy

Domain values used for classification and filtering. Reference data.

> **This file and `DOMAINS` in `lib/demand.ts` must agree.** The code constant is
> what the dropdowns actually seed (via the admin-managed list in
> `lib/category-store.ts`); this file is the documented master a human reads. They
> had drifted — `engineering`, `logistics`, `safety` and `other` existed only in
> code, while `supply_chain`, `esg`, `hr` and `finance_admin` existed only here —
> and `lib/otx/registry-shipped.test.ts` now asserts every tool's domain resolves
> against this file, so the drift cannot come back silently.

| Domain | Description |
|---|---|
| quality | Quality assurance, scrap, defect attribution |
| production | Production execution, MES, line operations |
| maintenance | Predictive and preventive maintenance |
| engineering | Product and process engineering, CAD/PLM, design release |
| procurement | Sourcing, tenders, supplier processes |
| supply_chain | Planning, logistics, inventory |
| logistics | Warehousing, transport, material flow |
| energy | Energy and utilities consumption |
| esg | Environmental, social, governance reporting |
| safety | Occupational safety, incidents, permits |
| hr | Workforce processes (never worker evaluation — `docs/14-compliance.md`) |
| finance_admin | Finance and administrative processes |
| ot_integration | Networks, edge, broker, the Unified Namespace |
| traceability | Genealogy, serial/batch records, as-built |
| process_control | Setpoints, control loops, closed-loop regulation |
| other | Anything the list does not yet name |
