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

The intake asks **"Tools & systems"** and renders the answer as one `## State` key:

```
- **Tools:** SAP S/4HANA, Power BI, Critical Manufacturing MES
```

`/landscape` reads that line: a name it knows becomes a dependency on that tool, a
name nothing knows becomes a row marked *named by a use case, in no register*. The
same names become `depends-on` edges in the context mesh. Optional, and free text
on purpose — the tool a demand is about is often the one no register has heard of.
