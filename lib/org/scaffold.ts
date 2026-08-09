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

import { CORE_SECTIONS, sectionDef, anyDef } from "./model.js";

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
  const critical = anyDef(key)?.critical === true;
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

  // ---- department-wide modules ----
  "systems-of-record": () => `# Systems of record

| Data object | Source (system) | Write-right / owner | Freshness | Fallback |
|---|---|---|---|---|
|  |  |  |  |  |
|  |  |  |  |  |
`,
  landscape: () => `# Landscape (per facility)

| Facility | Connectivity | Legacy systems | Known barriers |
|---|---|---|---|
|  |  |  |  |
`,
  capabilities: () => `# Capabilities & gaps

## Capabilities
_What this department can do today._

## Bottlenecks & gaps
_Where it is constrained, and the skill gaps that block the next automation._
`,
  "shared-controls": () => `# Shared controls

| Control | Scope (which lanes) | Rule | Owner |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |
`,
  guardrails: () => `# Guardrails

## Guardrails — what must never happen
_The lines an agent must not cross, even within its authority level._

## Write / outward-action limits
_What the agent may never do when it writes or acts outward unsupervised._
`,
  "iteration-loop": () => `# Iteration loop

## The loop
_Experiment → measure → adopt or discard, each time-boxed._

## Metrics — decision latency · cycle time · reversal rate
_Decision latency (idea → decision), cycle time (decision → effect), reversal rate._
`,
  "operating-context": () => `# Operating context

| Unit / partner | Dependency | What we need from them | What they need from us |
|---|---|---|---|
|  |  |  |  |
`,
};

/** The starter markdown for one section — frontmatter + a grammar-shaped skeleton. */
export function scaffoldSection(key: string, deptName = "New department"): string {
  const body = BODY[key];
  if (!body) return `${frontmatter(key)}\n\n# ${anyDef(key)?.title ?? key}\n`;
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
 * Body text under the FIRST heading matching `re`, up to the next heading. Returns "" when
 * the section is missing or holds only the scaffold's placeholders (a lone `_italic_` line
 * or empty `|  |  |` table rows) — so a caller can tell "authored" from "still blank".
 */
export function sectionUnder(md: string, re: RegExp): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((l) => /^#{1,6}\s/.test(l) && re.test(l));
  if (start === -1) return "";
  const body: string[] = [];
  for (let j = start + 1; j < lines.length; j++) {
    if (/^#{1,6}\s/.test(lines[j]!)) break;
    body.push(lines[j]!);
  }
  const meaningful = body.filter((l) => {
    const t = l.trim();
    if (!t) return false;
    if (/^_.*_$/.test(t)) return false; // scaffold placeholder
    if (/^\|[\s|]*\|$/.test(t)) return false; // empty table row
    if (/^\|?[\s|:-]+\|?$/.test(t)) return false; // table separator
    return true;
  });
  return meaningful.length ? body.join("\n").trim() : "";
}

const BRIEF_DRAFT_NOTE = (on: string) =>
  `> Draft assembled from this lane's pack${on ? ` on ${on}` : ""}. Review every line, name the responsible owner (frontmatter), and choose the authority level before raising autonomy — nothing here grants autonomy on its own.`;

/** Cap a quoted pack section so the brief stays a brief. */
function clamp(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max).trimEnd()}\n…`;
}

/**
 * Compose an agent-brief DRAFT from a lane's pack. It fills the brief's Scope, Guardrails,
 * Escalation and Rights sections from what the lane already documents (the playbook's
 * control points and handovers, the skills file's interfaces) — quoting the pack rather
 * than inventing commitments. Two things are deliberately NOT filled: the frontmatter
 * `owner` (the responsible human, the accountability point the readiness gate requires) and
 * the authority level (still the five-rung hint — the human chooses, `set-authority` writes
 * it). So a drafted brief is a real starting point that still cannot reach an execute rung
 * without a person. Pure; `generatedOn` is passed in to keep it deterministic.
 */
export function composeBriefDraft(
  laneName: string,
  pack: { playbook?: string; skills?: string },
  generatedOn = "",
): string {
  const controlPoints = sectionUnder(pack.playbook ?? "", /(?:kontrollpunkt|control point|checkpoint|rework|nacharbeit)/i);
  const handovers = sectionUnder(pack.playbook ?? "", /(?:übergabe|handover|hand-off)/i);
  const exceptions = sectionUnder(pack.playbook ?? "", /(?:ausnahme|exception|fehler|error|edge)/i);
  const interfaces = sectionUnder(pack.skills ?? "", /(?:interface|schnittstelle|system)/i);

  const guardrailsBody = controlPoints
    ? `From the playbook's control points — the lines this lane must not cross unsupervised:\n\n${clamp(controlPoints)}`
    : "_The lines it must never cross, even within its authority level._";
  const escalationBody = handovers || exceptions
    ? `Escalate when a handover cannot complete or an exception is hit:\n\n${clamp(handovers || exceptions)}`
    : "_The one action it must always escalate, and to whom._";
  const rightsBody = interfaces
    ? `Scoped to the interfaces this lane uses (from the skills file):\n\n${clamp(interfaces)}`
    : "_What the agent may read and write, per system-of-record object._";

  return `${LANE_FM}

# ${laneName} — Agent brief

${BRIEF_DRAFT_NOTE(generatedOn)}

## Scope
This lane's agent supports the **${laneName}** flow — the run documented in this lane's playbook. Out of scope: any step not written into that playbook.

## Authority level
_One of: read-only · draft · recommend · execute-with-approval · execute-autonomously._

## Rights per data object
${rightsBody}

## Guardrails
${guardrailsBody}

## Escalation
${escalationBody}
`;
}

/**
 * The authority level named in an agent-brief, if unambiguous — for the lane's autonomy
 * badge. Returns null when none appears, or when several do (the scaffold lists all five
 * as a hint, and a brief that names two levels in prose hasn't actually chosen one).
 */
export function authorityLevelOf(agentBrief: string | undefined): string | null {
  if (!agentBrief) return null;
  // Word boundaries matter: the read-only description says "no drafts", and without
  // \b that "draft" was read as a second level — so a read-only lane resolved to null
  // ("no autonomy set") instead of read-only. \bdraft\b does not match "drafts".
  const found = new Set(
    (agentBrief.toLowerCase().match(/\b(?:read-only|execute-with-approval|execute-autonomously|recommend|draft)\b/g) ?? []),
  );
  return found.size === 1 ? [...found][0]! : null;
}
