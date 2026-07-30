/**
 * English translations of the per-phase artefact templates (titles, purposes,
 * Markdown scaffolds). The German in artefacts.ts stays the source of truth;
 * English is the default display language. Plain, concrete, no filler.
 */

export interface ArtefactText {
  title: string;
  purpose: string;
  template: string;
}

const T = (s: string) => s.replace(/^\n/, "");

export const EN_ARTEFACTS: Record<string, ArtefactText> = {
  "a0-intake": {
    title: "Intake decision",
    purpose:
      "Candidate, approach, rough business case and spoke minimum — decision: take on, defer, or hand to the spoke with a playbook.",
    template: T(`
## Candidate

**Process:** …
**Approach direction:** process pull | technology push
**Source:** …

## Rough business case

**Addressable value (rough, level self-report):** …
**Compounding — same cut in further processes?:** …

## Spoke minimum

**Owner (change authority):** …
**Champion (capacity):** …
**Willingness to measure stated:** yes | no

## Decision

**Decision:** take on | defer | self-service with playbook
**Rationale:** …
`),
  },
  "a0-selbstassessment": {
    title: "Self-assessment (short form)",
    purpose:
      "The seven criteria the spoke roughly rates itself (catalog §7.3) — a cheap pre-filter before the full assessment.",
    template: T(`
> The spoke's rough self-assessment, 1–5. The full assessment verifies it.

| Criterion | Level (1–5) | Note |
|---|---|---|
| K8.1 Responsible role spoke | | |
| K4.1 Goal statement | | |
| K4.4 Volume figures & business relevance | | |
| K1.1 Process representation | | |
| K3.1 Lead time measured | | |
| K5.1 Timestamp farmability (rough) | | |
| K2.2 Interface accessibility (rough) | | |
`),
  },

  "a1-prozessdarstellung": {
    title: "Process representation",
    purpose:
      "The as-is flow including the tool chain and system breaks — how the process really runs today.",
    template: T(`
## As-is flow

_Steps from trigger to result. Per step: role · tool · input → output._

\`\`\`mermaid
flowchart LR
  A["Trigger"] --> B["Step 1 (role, tool)"]
  B --> C["Step 2"]
  C --> D["Result"]
\`\`\`

## Steps

| # | Step | Role | Tool | Input → Output | System break? |
|---|---|---|---|---|---|
| 1 | … | … | … | … | — |

## System breaks

_Points where data is transferred by hand from one system to the next._

- …
`),
  },
  "a1-friktionsliste": {
    title: "Friction list",
    purpose: "Handovers, media breaks, wait points — still qualitative.",
    template: T(`
| Location (step/handover) | What happens | Type (handover/media break/wait point) | Evidence |
|---|---|---|---|
| … | … | … | … |
`),
  },
  "a1-zielstatement": {
    title: "Goal statement",
    purpose:
      "One sentence on what the process should achieve, with at least three derivable, testable criteria. Signed by the owner.",
    template: T(`
## Goal statement

> _One sentence: why does the process exist, and when is it good?_

## Derivable criteria

1. **…** (metric, unit, direction)
2. **…**
3. **…**

## Greenfield test

_If you rebuilt the process from scratch — what would be different, and what prevents it?_

**Signed by:** … (process owner)
`),
  },
  "a1-artefaktsammlung": {
    title: "Artefact collection",
    purpose:
      "The real objects of the process — lists, forms, reports, emails — not their idealized description.",
    template: T(`
| Artefact | Type | Location / system | Maintenance state |
|---|---|---|---|
| … | list/form/report/email | … | … |
`),
  },

  "a2-vsm": {
    title: "Value stream map (with numbers)",
    purpose:
      "Lead time, wait times, interventions, frequency — the recon narrative backed by numbers.",
    template: T(`
| Station | Active time | Wait time | Interventions | Confidence (self-report / sample / instrumented) |
|---|---|---|---|---|
| … | … | … | … | |

**End-to-end lead time:** … (confidence: …)
**Dominant wait point:** …
`),
  },
  "a2-latenzprofil": {
    title: "Latency profile",
    purpose:
      "Where the main latencies sit, split into latency BETWEEN steps (handover) and WITHIN steps — each measurement point with a confidence level. Decides the branch later.",
    template: T(`
| Measurement point | Latency between (handover) | Latency within (processing) | Confidence (self-report / sample / instrumented) |
|---|---|---|---|
| … | … | … | |

**Dominant latency:** between the steps | within the steps
**Rationale:** …
`),
  },
  "a2-erhebungsplan": {
    title: "Collection plan",
    purpose:
      "How each number will be obtained going forward and how it climbs from self-report through sample to instrumented (the measurement ladder).",
    template: T(`
| Metric | Current level | Source (exhaust first) | Next level | How |
|---|---|---|---|---|
| … | self-report / sample / instrumented | email header/file metadata/ERP/ticket/… | sample / instrumented | … |
`),
  },
  "a2-kpi-baseline": {
    title: "KPI baseline",
    purpose:
      "Today's KPI values, captured before any intervention — the zero point for impact measurement.",
    template: T(`
| KPI | Definition | Current value | Data source | Cadence |
|---|---|---|---|---|
| … | … | … | … | … |

**Captured on:** …
`),
  },

  "a3-diagnose": {
    title: "Diagnosis decision",
    purpose:
      "The chosen branch, the conditions checked, and the alternatives rejected — decidable, not by gut feel.",
    template: T(`
## Chosen branch

**Branch:** Z0 kill | Z1 interfaces | Z2 process design | Z3 toolbox evolution

## Conditions checked

_The branch's conditions, each with evidence from the latency profile and catalog scoring._

- **…** — supported by: …

## Rejected alternatives

| Branch | Why rejected |
|---|---|
| … | … |
`),
  },
  "a3-hypothese": {
    title: "Intervention hypothesis",
    purpose:
      "'If we change X, KPI Y moves by/toward Z' — stated so it can be falsified, naming the measurement that confirms or refutes it.",
    template: T(`
**Hypothesis:** If we change **…**, then **KPI …** moves by **… toward …**.

**Smallest step that tests the hypothesis:** …
**Measurement that confirms/refutes:** …
**Test cadence (matched to component health):** …
`),
  },

  "a4-intervention": {
    title: "Implemented intervention",
    purpose:
      "The change implemented per the change tactic from the risk gate (direct / parallel run / strangler).",
    template: T(`
**What was changed:** …
**Change tactic:** R1 direct | R2 parallel run | R3 strangler
**New timestamps (measurability ratchet):** …
`),
  },
  "a4-wirkung": {
    title: "Impact measurement",
    purpose:
      "Before-and-after against the KPI baseline — did the KPI move, or is the hypothesis cleanly falsified?",
    template: T(`
| KPI | Baseline (before) | After | Delta | Confidence |
|---|---|---|---|---|
| … | … | … | … | |

**Result:** KPI moved | hypothesis falsified | measurement unusable
**Interpretation:** …
`),
  },
  "a4-register": {
    title: "Register entry (technology cut)",
    purpose:
      "The reusable technology cut (pattern, not product name) and where else it applies — compounding.",
    template: T(`
**Cut (pattern):** …
**Applied here to:** …
**Further processes with the same cut (addressable quantity):** …
`),
  },

  "a5-prozessdoku": {
    title: "Process documentation (target)",
    purpose:
      "The process in its target state, with a built-in feedback loop — the required output deliverable.",
    template: T(`
## Target flow

\`\`\`mermaid
flowchart LR
  A["Trigger"] --> B["Step 1"] --> C["Result"]
\`\`\`

## Built-in feedback loop

**Which metrics are captured permanently:** …
**Who sees them, at what cadence:** …
`),
  },
  "a5-kpi-takt": {
    title: "KPI cadence & escalation threshold",
    purpose:
      "The KPI cadence in steady-state operation (champion's responsibility) including a live escalation threshold.",
    template: T(`
| KPI | Cadence | Recipient | Escalation threshold |
|---|---|---|---|
| … | … | Champion / … | … |

**Diagnostic layer farmable on demand:** yes | no — how: …
`),
  },
  "a5-uebergabe": {
    title: "Handover to the spoke",
    purpose:
      "The hub withdraws: the champion runs scoring and the KPI cadence without the hub. The closing scoring delivers the delta against the recon scoring as demonstrated impact.",
    template: T(`
**Taken over by (champion):** …
**Full KPI cadence run without the hub on:** …
**Closing scoring vs. recon scoring (delta = impact):** … → …
**Open remaining items:** …
`),
  },
};
