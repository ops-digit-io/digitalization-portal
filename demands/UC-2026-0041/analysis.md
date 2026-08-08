# Analysis · UC-2026-0041

## Archetype
Analytics / attribution over existing MES data — no model training required.

## Data prerequisites
- MES scrap postings with timestamp and line id (present).
- Shift calendar per line (present in HR/shift system).
- Cause-code master (present, needs harmonization — see UC-2026-0033).

## Feasibility
High. The join keys exist; the risk is cause-code inconsistency across lines, mitigated by the harmonization case.
