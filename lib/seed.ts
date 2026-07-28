/**
 * Demo seed data. Renders the UI from the SAME functions the real portal uses
 * (`assembleBoard`, `parseUseCase`) — this is not mock HTML. The rows mirror the
 * board mock in `docs/16-ui.md §16.5`; the README mirrors `docs/03-data-model §3.5`.
 *
 * Demo only: a real deployment reads these from the registry cache and the fleet.
 */

import type { RegistryRow } from "./registry.js";
import type { Session } from "./rbac.js";

/**
 * A demo session: portfolio forum (whole portfolio + G2–G7 authority), triage
 * (G1/G2 — the funnel's intake gates, so the demo operator can move a demand off
 * S1), reviewer (draft), champion, plus admin. Until OIDC is enforced, EVERY visitor
 * is this single session, and that person is the deployment operator — so it also
 * carries `admin` so the administration tools (e.g. /admin/categories) are usable
 * pre-OIDC. Once OIDC is wired, real roles come from IdP groups (admin from
 * `DU-Portal-Admins`) and this stand-in no longer applies.
 */
export const DEMO_SESSION: Session = {
  user: "demo.forum@example.com",
  roles: ["portfolio_forum", "triage", "reviewer", "champion", "admin"],
  scopes: ["DE-ALD"],
};

/** Reference "now" so days-in-stage is stable across renders. */
export const DEMO_NOW = "2026-05-19T09:00:00Z";

export const SEED_ROWS: RegistryRow[] = [
  { id: "UC-2026-0041", title: "Scrap attribution at shift granularity", stage: "S4", lane: "transform", status: "active", plant: "DE-ALD", domain: "quality", level: "L2", heat: "medium", sponsor: "sponsor@example.com", valueProjected: 180000, since: "2026-04-02" },
  { id: "UC-2026-0042", title: "Tender preparation copilot", stage: "S3", lane: "data_ai", status: "active", plant: "ALL", domain: "procurement", level: "L1", heat: "high", sponsor: "s2@example.com", valueProjected: 240000, since: "2026-04-11" },
  { id: "UC-2026-0044", title: "Tool wear detection", stage: "S1", lane: "innovation", status: "active", plant: "DE-ALD", domain: "maintenance", level: "L2", heat: "medium", since: "2026-05-07" },
  { id: "UC-2026-0039", title: "Energy baseline per line", stage: "S3", lane: "transform", status: "active", plant: "SK-PUC", domain: "energy", level: "L2", heat: "low", sponsor: "s3@example.com", valueProjected: 90000, since: "2026-05-11" },
  { id: "UC-2026-0045", title: "Shift handover digitalization", stage: "S2", lane: "continuous_improvement", status: "active", plant: "DE-ALD", domain: "production", level: "L1", heat: "medium", since: "2026-04-28" },
  { id: "UC-2026-0033", title: "Cause code harmonization", stage: "S8", lane: "transform", status: "active", plant: "DE-ALD", domain: "quality", level: "L2", heat: "low", sponsor: "s4@example.com", valueProjected: 60000, valueRealized: 71000, since: "2026-01-30" },
  { id: "UC-2026-0051", title: "Vendor onboarding workflow", stage: "S2", lane: "transform", status: "parked", plant: "SK-PUC", domain: "procurement", level: "L1", heat: "low", since: "2026-05-01" },
  { id: "UC-2026-0052", title: "Chatbot for maintenance manuals", stage: "S3", lane: "data_ai", status: "killed", plant: "DE-ALD", domain: "maintenance", level: "L2", heat: "low", since: "2026-04-20" },
  { id: "UC-2026-0053", title: "Paperless line clearance", stage: "S2", lane: "continuous_improvement", status: "killed", plant: "SK-PUC", domain: "production", level: "L1", heat: "low", since: "2026-04-15" },
  // A deliberately broken record: reconciler couldn't read its state.
  { id: "UC-2026-0060", title: "MES alarm triage (needs attention)", lane: "transform", status: "active", plant: "DE-ALD", needsAttention: true, since: "2026-05-14" },
];

/** Gate rows derived from a stage: gates before the current stage's entry are passed. */
function gateRowsForStage(stage: RegistryRow["stage"]): string {
  const order = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];
  const labels = [
    "G1 Intake accepted", "G2 Prioritized", "G3 Business case", "G4 POC proven/stop",
    "G5 Pilot proven", "G6 Scale readiness", "G7 Rollout complete",
  ];
  const stageIdx = stage ? order.indexOf(stage) : 0;
  return labels
    .map((label, i) => {
      // Gate i (G{i+1}) is the exit of stage i (S{i+1}); passed if we're beyond it.
      const status = i < stageIdx ? "passed" : i === stageIdx ? "open" : "pending";
      return `| ${label} | ${status} | | | |`;
    })
    .join("\n");
}

/** Build a minimal but valid README from a registry row (for rows without full seed). */
export function buildStubReadme(row: RegistryRow): string {
  const line = (k: string, v: string | undefined): string => (v ? `- **${k}:** ${v}\n` : "");
  return `# ${row.id} · ${row.title}

## State

${line("Stage", row.stage)}${line("Lane", row.lane)}${line("Status", row.status)}${line("Plant", row.plant)}${line("Domain", row.domain)}${line("Level", row.level)}${line("Heat", row.heat)}${line("Since", row.since)}
## Problem

_Full problem statement is authored in the use-case repository. This is a demo
row rendered from the portfolio registry cache._

## People

| Role | Person |
|---|---|
| Requester | requester@example.com |
| Sponsor | ${row.sponsor ?? "*not yet named*"} |

## Gates

| Gate | Status | Date | By | Note |
|---|---|---|---|---|
${gateRowsForStage(row.stage)}
`;
}

/** Seed business-case.md for Feature 1 (simulation), worked example docs/03 §3.6. */
export const SEED_BUSINESS_CASE: Record<string, string> = {
  "UC-2026-0041": `# Business case · UC-2026-0041

## State

- **Confidence:** indicative
- **Version:** 2
- **Review horizon:** 12 weeks

## Baseline

**Metric.** Share of scrap bookings without a recorded cause.
**Value.** 0.62 over 2025-10-01 to 2026-03-01.
**Verified.** No — sampled estimate. Verification required before G5.

## Value

**Category.** Quality cost reduction.
**Annual gross.** EUR 180,000.
**Basis.** Rework hours avoided at the pilot plant, at loaded labour rate.

### Assumptions

| Assumption | Tested | Source |
|---|---|---|
| Rework rate falls proportionally with attribution rate | No | — |
| Attribution redirects rework rather than eliminating it | No | — |
| Loaded rate EUR 62/h | Yes | Plant controlling |

## Cost

| | |
|---|---|
| Build estimate | EUR 45,000 |
| Annual run estimate | EUR 12,000 |
`,
};

/** Full README markdown for the detail page (worked example, docs/03 §3.5). */
export const SEED_README: Record<string, string> = {
  "UC-2026-0041": `# UC-2026-0041 · Scrap attribution at shift granularity

## State

- **Stage:** S4
- **Lane:** transform
- **Status:** active
- **Plant:** DE-ALD
- **Domain:** quality
- **Level:** L2
- **Heat:** medium
- **Scale potential:** multi-plant
- **Created:** 2026-03-12
- **Intake:** complete

## Problem

Scrap is booked per shift but not attributed to a cause. Corrective action is
decided on the line supervisor's recollection rather than on record, so the same
causes recur without anyone noticing the pattern.

> Original (de): Wir buchen den Ausschuss pro Schicht, aber niemand weiss, woher
> er kommt.

## Current pain

Roughly two unattributed scrap events per shift.
*Source: requester estimate, not measured.*

## Desired outcome

Each scrap event carries a cause attribution available at shift handover.

## Proposed solution

The requester suggested a dashboard. Recorded for context; not binding on scope.

## Classification rationale

**Level L2** — the scrap recording sequence is unchanged; the attribution step
becomes faster.

**Heat medium** — meaningful rework reduction at one plant, effort bounded by
data that already exists.

## People

| Role | Person |
|---|---|
| Requester | requester@example.com |
| Lead | lead@example.com |
| Sponsor | sponsor@example.com |
| Value owner | value@example.com |
| Business owner | bizowner@example.com |
| Delivery lead | delivery@example.com |
| Run owner | *assigned at G7* |

## Gates

| Gate | Status | Date | By | Note |
|---|---|---|---|---|
| G1 Intake accepted | passed | 2026-03-14 | triage@example.com | |
| G2 Prioritized | passed | 2026-03-20 | portfolio forum | lane confirmed |
| G3 Business case | passed | 2026-04-02 | forum@example.com | business-case.md |
| G4 POC proven/stop | open | | | |
| G5 Pilot proven | pending | | | |
| G6 Scale readiness | pending | | | |
| G7 Rollout complete | pending | | | |

## Related

- UC-2026-0033 — related, shares cause-code taxonomy

## History

- 2026-03-12 — created via portal chat by requester@example.com
- 2026-03-14 — G1 passed
- 2026-03-20 — G2 passed, lane confirmed as transform
- 2026-04-02 — G3 passed
`,
};
