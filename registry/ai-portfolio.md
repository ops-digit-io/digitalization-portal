# Production AI portfolio

The AI framework for production operations, as a register rather than a slide:
every model that touches the plants, where it is in its life, how much authority
it holds, and — the column that matters — **where its output lands**.

> Illustrative portfolio, seeded to exercise the model end to end.

**`Stage`** is the model's own life, concept → go-live. It is *not* a second demand
lifecycle; a row points at its demand in the last column and the eight stages and
seven gates stay where they are.

`concept` · `data` (the data exists and is reachable) · `trained` · `shadow` (runs
beside the process, output discarded) · `assisted` (a human uses the output) ·
`live` · `retired`.

**`Authority`** is a rung of the existing five-rung ladder. **`Control surface`**
is the second axis from `lib/org/autonomy.ts`: `advice` · `record` · `ticket` ·
`setpoint`. Crossing them names the thing:

- `recommend` × `setpoint` — an operator assistance system
- `execute-with-approval` × `setpoint` — a semi-autonomous control loop
- `execute-autonomously` × `setpoint` — an autonomous control loop

**`Envelope` / `Fallback` / `Abort condition`** are the safety case. A row on
`setpoint` at an acting rung without all three is **refused** by `canActOn` and
renders on `/ai-framework` as a refusal with its reason. A complete agent brief
earns autonomy; it does not by itself earn a machine.

| ID | Use case | Plant | Domain | Model class | Stage | Authority | Control surface | Envelope | Fallback | Abort condition | Human owner | Demand |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AI-001 | Extrusion wall-thickness drift alert | DE-ALD | quality | ml-forecast | live | recommend | advice | | | | Fertigungstechnik ALD | UC-2026-0033 |
| AI-002 | Scrap-cause attribution | DE-ALD | quality | ml-supervised | live | draft | record | | | | Qualität ALD | UC-2026-0039 |
| AI-003 | Extruder setpoint advisory (zone temps) | DE-ALD | process_control | ml-forecast | assisted | recommend | setpoint | ±3 K around the recipe value | operator keeps the recipe setpoint | drift > 5 K or gauge offline 60 s | Fertigungstechnik ALD | UC-2026-0041 |
| AI-004 | Supervised zone-temperature control | DE-ALD | process_control | ml-forecast | shadow | execute-with-approval | setpoint | ±3 K around the recipe value | line falls back to the recipe setpoint | two consecutive out-of-band gauge readings | Fertigungstechnik ALD | UC-2026-0041 |
| AI-005 | Closed-loop haul-off speed trim | DE-ALD | process_control | ml-forecast | concept | execute-with-approval | setpoint | | | | Fertigungstechnik ALD | UC-2026-0041 |
| AI-006 | Maintenance call from vibration anomaly | DE-ALD | maintenance | ml-supervised | live | execute-with-approval | ticket | | | | Instandhaltung ALD | UC-2026-0042 |
| AI-007 | Surface-defect vision QC | DE-ALD | quality | vision | trained | recommend | advice | | | | Qualität ALD | UC-2026-0051 |
| AI-008 | Energy-peak forecast for load shifting | US-GRV | energy | ml-forecast | shadow | recommend | advice | | | | Ops IT Americas | UC-2026-0044 |
| AI-009 | Shift-handover summary assistant | US-GRV | production | llm-assistant | assisted | draft | record | | | | Produktion GRV | UC-2026-0045 |
| AI-010 | Weld-parameter anomaly detection | SK-PUC | quality | statistical | data | read-only | advice | | | | Qualität PUC | UC-2026-0039 |
| AI-011 | Order-sequencing suggestion | HU-SZE | production | ml-supervised | concept | recommend | record | | | | Produktion SZE | |
| AI-012 | Autonomous cooling-bath trim | CN-SUZ | process_control | ml-forecast | concept | execute-autonomously | setpoint | | | | Fertigungstechnik SUZ | |
