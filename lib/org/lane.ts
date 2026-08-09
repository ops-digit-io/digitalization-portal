/**
 * Lane packs — the third ring of Department OS (01-framework.md §"Die Lane als
 * Erweiterungspunkt").
 *
 * Autonomy is never granted "to a department" — it is granted to one concrete,
 * repeatable lane. A department can run one lane fully autonomously and three by hand;
 * that is the normal case, not a transitional one. So each lane carries its own pack:
 * the playbook (with its error paths, not just the happy path), the skills/tools it may
 * use, its recurring tasks, its own metrics, and — the autonomy contract — the
 * agent-brief that names scope, `authority_level`, escalation and the responsible human.
 *
 * This module is the GRAMMAR for a lane, expressed with the same `SectionDef`/`Criterion`
 * vocabulary the core sections use, so a lane is scored by the very same machine
 * (`scoring.ts`). `agent-brief` is the lane's critical file: an agent acting without a
 * named human or a stated authority level is a masterless tool.
 */

import type { SectionDef, Criterion } from "./model.js";

const owner: Criterion = { type: "frontmatter", field: "owner", weight: 4, label: "an owner (frontmatter)" };

/**
 * The scored files of a lane pack. `procedures/` and `examples/` are optional
 * directories (reusable procedures, real cases) — not scored, but read if present.
 */
export const LANE_FILES: readonly SectionDef[] = [
  {
    key: "playbook",
    title: "Playbook — the run, not just the happy path",
    purpose: "The happy path alone is a demo. A lane an agent can run is one whose exceptions, waits and handovers are written down.",
    machineNeed: "An agent fails at the first exception if only the normal case is described — the error paths are what let it carry the exception instead of stalling on it.",
    required: [
      owner,
      { type: "table", minRows: 3, weight: 18, label: "the steps as a table" },
      { type: "column", pattern: "(?i)(mensch|agent|human)", weight: 14, label: "a Human/Agent/both column per step" },
      { type: "heading", pattern: "(?i)(ausnahme|exception|fehler|error|edge)", weight: 16, label: "the exception / error paths" },
      { type: "heading", pattern: "(?i)(übergabe|handover|hand-off)", weight: 10, label: "the handovers" },
      { type: "heading", pattern: "(?i)(kontrollpunkt|control point|checkpoint|rework|nacharbeit)", weight: 10, label: "control points / the rework rule" },
    ],
    excellence: [
      { type: "heading", pattern: "(?i)(wartezustand|wait state|waiting)", weight: 8, label: "the wait states" },
    ],
    coaching: "Walk the lane on its worst day: where does it stall, who picks it up, and what does the agent do while it waits?",
  },
  {
    key: "skills",
    title: "Skills, tools & interfaces",
    purpose: "So the lane's operator — human or agent — knows what it may work with, without hunting for it.",
    machineNeed: "An agent that has to discover its own tools improvises; a named skill/tool list is the difference between using an interface and guessing at one.",
    required: [
      owner,
      { type: "heading", pattern: "(?i)(skill)", weight: 12, label: "a Skills section" },
      { type: "heading", pattern: "(?i)(tool|werkzeug)", weight: 12, label: "a Tools section" },
      { type: "heading", pattern: "(?i)(interface|schnittstelle|system)", weight: 12, label: "an Interfaces / systems section" },
    ],
    coaching: "Which tool or interface, if it were unavailable for a day, would stop this lane — and is it named here?",
  },
  {
    key: "tasks",
    title: "Recurring tasks & templates",
    purpose: "The repeatable work of the lane, each with the trigger that starts it and the template it starts from.",
    machineNeed: "Trigger + template are the basis for pre-filling and automatic ticket creation — an agent can raise the task itself instead of waiting to be told.",
    required: [
      owner,
      { type: "table", minRows: 2, weight: 22, label: "the tasks as a table" },
      { type: "column", pattern: "(?i)(auslöser|trigger)", weight: 14, label: "a Trigger column" },
      { type: "column", pattern: "(?i)(vorlage|template)", weight: 12, label: "a Template column" },
    ],
    coaching: "Which task in this lane is done from memory every time — and what would its template contain?",
  },
  {
    key: "metrics",
    title: "Lane metrics",
    purpose: "Steering the lane, not just the department average — a lane can be healthy while the mean hides it, or the reverse.",
    machineNeed: "Formula + source let an agent fetch the lane's number, judge it, and alert at threshold — the same contract as the department metrics, scoped to the lane.",
    required: [
      owner,
      { type: "table", minRows: 2, weight: 22, label: "at least two lane metrics (rows)" },
      { type: "column", pattern: "(?i)(formel|formula)", weight: 12, label: "a Formula column" },
      { type: "column", pattern: "(?i)(quelle|source|system)", weight: 12, label: "a Source column" },
    ],
    coaching: "What single number tells you this lane is drifting before anyone complains?",
  },
  {
    key: "agent-brief",
    title: "Agent brief — the autonomy contract",
    purpose: "Where autonomy actually lives: the scope of the lane, what an agent may touch per data object, how far it may go, when it must escalate, and the human who owns it.",
    machineNeed: "This is the file that answers “may it, and how far?”. An agent without a named human or a stated authority_level is a masterless tool.",
    required: [
      { type: "frontmatter", field: "owner", weight: 4, label: "the responsible human (frontmatter owner)" },
      { type: "heading", pattern: "(?i)(scope|umfang)", weight: 12, label: "the scope of the lane" },
      { type: "heading", pattern: "(?i)(authority|autonom|autonomie)", weight: 20, label: "the authority_level (one of the five rungs)" },
      { type: "heading", pattern: "(?i)(guardrail|leitplanke|grenze)", weight: 12, label: "the guardrails" },
      { type: "heading", pattern: "(?i)(eskalation|escalation)", weight: 12, label: "the escalation path" },
    ],
    excellence: [
      { type: "heading", pattern: "(?i)(datenobjekt|data object|rechte|rights)", weight: 10, label: "rights per data object" },
    ],
    coaching: "For this lane, which of the five authority levels may the agent reach, and what is the one action it must always escalate?",
    // Not "critical" in the framework's validity sense (valid-until belongs to
    // strategy/metrics/decision-rights/systems-of-record) — its weight is the
    // authority_level criterion, and it is the lane's anchor file.
  },
];

export const LANE_KEYS: readonly string[] = LANE_FILES.map((f) => f.key);
const LANE_BY_KEY = new Map(LANE_FILES.map((f) => [f.key, f]));
export function laneFileDef(key: string): SectionDef | undefined {
  return LANE_BY_KEY.get(key);
}

/** The optional directory members of a lane pack — read if present, not scored. */
export const LANE_DIRS: readonly string[] = ["procedures", "examples"];

/**
 * The autonomy ladder, per lane, from `agent-brief`. Re-exported here so the lane UI
 * and the model share one definition (it originates in model.ts).
 */
export { AUTHORITY_LEVELS, type AuthorityLevel } from "./model.js";
