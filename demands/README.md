# Demands — the central intake store

Every demand the Digital Unit takes in is **one markdown page in this one
repository**. There is no repository per demand at intake. A demand earns its own
`uc-*` repository only at the **PoC stage** — see `docs/ARCHITECTURE-intake.md`.

Each page is written by the portal's **intake** (guided by the `s1-intake`
playbook). The intake is AI-assisted but its output is **deterministic**: the same
captured answers always render the same sections in the same order
(`lib/demand.ts`). A demand page is the future use-case `README.md`, so it uses the
same `## State` / `## Gates` structure the parser already reads.

This directory starts empty — the funnel fills only with demands captured through
the portal's intake, never with seeded sample data. In a live deployment this
directory is the `du-demands` repository the portal reads and writes.

## Declaring the tools a demand touches

The intake asks **"Tools & systems"** and renders the answer as one
`## State` key:

```
- **Tools:** SAP S/4HANA, Power BI, Critical Manufacturing MES
```

Comma-separated, by name, free text — the tool a demand is about is often the one
no register has heard of, and a picker would make it unnameable. `/landscape`
reads that line and puts every name on the consolidated tool register: a name it
recognises becomes a dependency of that tool (so the tool shows which use cases
stand on it, and the use case shows what it is standing on); a name nothing
recognises becomes a row of its own, marked *named by a use case, in no register*
— which is exactly the tool nobody owns and nobody budgeted.

The key is optional and unknown `## State` keys are preserved rather than
rejected, so a demand written before the field existed still parses; adding the
line by hand has the same effect as answering the question.
