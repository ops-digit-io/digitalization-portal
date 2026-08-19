# Production AI portfolio

The AI framework for production operations, as a register rather than a slide:
every model that touches the plants, where it is in its life, how much authority
it holds, and — the column that matters — **where its output lands**.

> **Ships EMPTY.** Nothing here is invented — a register seeded with plausible
> rows reads as fact within a week, and every finding it then produces is a
> finding about fiction. Fill it with the models actually in production, by
> hand here or through the portal where it can write. The columns are the
> contract.

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
