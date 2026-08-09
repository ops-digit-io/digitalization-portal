/**
 * Starter skeletons for a new department — the coached blank page.
 *
 * Creating a department in the portal should not drop a person onto an empty file:
 * each section starts as the exact structure the grammar (`model.ts`) scores, with the
 * headings, table columns and frontmatter keys already in place and placeholders to
 * replace. So a freshly-scaffolded section already scores partially (the shape is
 * there) and the coaching backlog shows precisely what content is still missing.
 *
 * Pure and dependency-free, so the skeletons are unit-tested against the grammar they
 * are meant to satisfy — a scaffold that no longer matches its section's criteria is a
 * test failure, not a silent regression.
 */

import { CORE_SECTIONS, sectionDef } from "./model.js";

/** A URL/id-safe department slug from a free-text name. */
export function slugifyDept(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Frontmatter block for a section — validity keys added for the critical ones. */
function frontmatter(key: string): string {
  const critical = sectionDef(key)?.critical === true;
  const lines = ["owner:", "review-cadence: quarterly", "last-verified:"];
  if (critical) lines.push("valid-until:", "verification-method:", "source-of-truth:");
  return ["---", ...lines, "---"].join("\n");
}

/** The per-section body skeletons — headings/columns match the grammar's criteria. */
const BODY: Record<string, (name: string) => string> = {
  charter: (name) => `# ${name} — Charter

## Purpose / Vision
_Why this department exists — the outcome it is here to produce._

## Mission
_What it does today to get there._

## Scope
_What is ours._

## Non-Scope
_What is explicitly NOT ours — the load-bearing field. Without it an agent escalates everything or nothing._

## Stakeholders
| Stakeholder | Expectation | Mode |
|---|---|---|
|  |  |  |
`,
  strategy: () => `# Strategy — the architecture of choice

## Assumptions
_Each with an expiry. Which one, if it quietly became false, would carry the whole strategy with it?_

## Bets
_What we are pursuing — each with a stop criterion._

## Non-bets
_What we are deliberately NOT pursuing. This is what stops every good idea from becoming work._
`,
  objectives: () => `# Objectives — goals wired upward

| Objective | Company goal it pays into | Metric | Hold / Change |
|---|---|---|---|
|  |  |  |  |
`,
  "service-catalog": () => `# Service catalog — the lanes

| Lane | Customer | Trigger | Definition of Done | Human/Agent | Owner |
|---|---|---|---|---|---|
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |

## Definition of Done
_When is a lane's work truly closed?_

## Lead time & escalation
_The SLA per lane, and who is told when it slips._
`,
  intake: () => `# Intake — how work comes in

## Channels
_The defined entrance(s). Without one, the loudest channel steers the department._

## Prioritisation
_The rule that decides what is urgent — link the existing one rather than reinvent it._

## Rejected
_What is explicitly NOT taken in._
`,
  "operating-rhythm": () => `# Operating rhythm — the cadence

| Round | Frequency | Input | Output |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |

## Escalation window & delivery cadence
_By when must an escalation be answered? What is the delivery cadence?_
`,
  metrics: () => `# Metrics

| Metric | Formula | Source (system + field) | Target | Intervention threshold |
|---|---|---|---|---|
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
`,
  "decision-rights": () => `# Decision rights & authority levels

| Decision type | Role | Shared with | Reversible | authority_level |
|---|---|---|---|---|
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
`,
  risks: () => `# Risks (lean)

| Risk | Early indicator (watchable) | Mitigation / escalation |
|---|---|---|
|  |  |  |
|  |  |  |
`,
  "handover-contracts": () => `# Handover contracts

| Artifact | Recipient | Format | Acceptance criterion | Deadline |
|---|---|---|---|---|
|  |  |  |  |  |
`,
  standards: () => `# Standards

| Standard | Scope | Status | Waiver / exception procedure | Owner |
|---|---|---|---|---|
|  |  |  |  |  |
|  |  |  |  |  |
`,
  portfolio: () => `# Portfolio — the pipeline with stage-gates

## Stages & gates
_The pipeline the initiatives move through, and the gate between each stage._

| Initiative | Facility / Region | Stage | Blocking point (owner, class) | Handover status |
|---|---|---|---|---|
|  |  |  |  |  |
`,
};

/** The starter markdown for one section — frontmatter + a grammar-shaped skeleton. */
export function scaffoldSection(key: string, deptName = "New department"): string {
  const body = BODY[key];
  if (!body) return `${frontmatter(key)}\n\n# ${sectionDef(key)?.title ?? key}\n`;
  return `${frontmatter(key)}\n\n${body(deptName)}`;
}

/** Every core section scaffolded — the full starter set for a brand-new department. */
export function scaffoldDepartment(name: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of CORE_SECTIONS) out[s.key] = scaffoldSection(s.key, name);
  return out;
}

// ------------------------------------------------------------------ lane packs

const LANE_FM = ["---", "owner:", "review-cadence: quarterly", "last-verified:", "---"].join("\n");

/** Body skeletons for the lane-pack files — headings/columns match `lane.ts` criteria. */
const LANE_BODY: Record<string, (lane: string) => string> = {
  playbook: (lane) => `# ${lane} — Playbook

| Step | Human / Agent / both | Action | Output |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

## Exceptions / error paths
_What breaks, and what the operator does instead of stalling._

## Wait states
_Where the lane waits, and what the agent does meanwhile._

## Handovers
_What leaves the lane, to whom, and on what acceptance._

## Control points & rework rule
_Where work is checked, and what happens when it is sent back._
`,
  skills: (lane) => `# ${lane} — Skills, tools & interfaces

## Skills
_What the operator must be able to do._

## Tools
_The tools this lane is allowed to use._

## Interfaces / systems
_The systems it reads from and writes to._
`,
  tasks: (lane) => `# ${lane} — Recurring tasks

| Task | Trigger | Template | Owner |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |
`,
  metrics: (lane) => `# ${lane} — Lane metrics

| Metric | Formula | Source (system + field) | Target |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |
`,
  "agent-brief": (lane) => `# ${lane} — Agent brief

## Scope
_What this lane's agent is responsible for — and what it is not._

## Authority level
_One of: read-only · draft · recommend · execute-with-approval · execute-autonomously._

## Rights per data object
_What the agent may read and write, per system-of-record object._

## Guardrails
_The lines it must never cross, even within its authority level._

## Escalation
_The one action it must always escalate, and to whom._
`,
};

/** The starter markdown for one lane-pack file. */
export function scaffoldLaneFile(key: string, laneName = "New lane"): string {
  const body = LANE_BODY[key];
  return body ? `${LANE_FM}\n\n${body(laneName)}` : `${LANE_FM}\n\n# ${laneName} — ${key}\n`;
}

/** The two anchor files that make a lane exist: its playbook and its agent-brief. */
export function scaffoldLane(laneName: string): Record<string, string> {
  return {
    playbook: scaffoldLaneFile("playbook", laneName),
    "agent-brief": scaffoldLaneFile("agent-brief", laneName),
  };
}

/**
 * The authority level named in an agent-brief, if unambiguous — for the lane's autonomy
 * badge. Returns null when none appears, or when several do (the scaffold lists all five
 * as a hint, and a brief that names two levels in prose hasn't actually chosen one).
 */
export function authorityLevelOf(agentBrief: string | undefined): string | null {
  if (!agentBrief) return null;
  const found = new Set(
    (agentBrief.toLowerCase().match(/read-only|execute-with-approval|execute-autonomously|recommend|draft/g) ?? []),
  );
  return found.size === 1 ? [...found][0]! : null;
}
