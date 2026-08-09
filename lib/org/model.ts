/**
 * Department OS — the declarative context layer for a department (charter, strategy,
 * service catalog, decision rights, …), so the portal's tools know the org behind the
 * demands and processes they run.
 *
 * This module is the GRAMMAR: the core section catalog and, per section, the schema a
 * healthy answer meets (weighted required + excellence criteria), a coaching prompt
 * that leads a human into the structure, and whether the section is *critical* (its
 * facts expire, so it carries validity, not just freshness). It is pure data — a
 * department is markdown, scored against this, the same machine the process
 * self-assessment already is.
 *
 * The framework (v4): a 12-file core, per-lane packs, and department-wide modules. A
 * brand is a state; a department is a process — so alongside "what holds" the layer
 * records "when it is re-checked, who may decide, and how far an agent may go".
 */

/** How far a role — human or agent — may act on a decision. Five rungs. */
export const AUTHORITY_LEVELS = [
  "read-only",
  "draft",
  "recommend",
  "execute-with-approval",
  "execute-autonomously",
] as const;
export type AuthorityLevel = (typeof AUTHORITY_LEVELS)[number];

/** One machine-checkable expectation on a section's markdown. */
export interface Criterion {
  type: "frontmatter" | "heading" | "table" | "column";
  /** frontmatter: the field; heading/column: a case-insensitive pattern. */
  field?: string;
  pattern?: string;
  /** table: the minimum row count that counts as filled. */
  minRows?: number;
  weight: number;
  /** Human label shown when the criterion is missing. */
  label: string;
}

export interface SectionDef {
  /** File name without extension, e.g. `charter`. */
  key: string;
  title: string;
  /** Why a human keeps it — the reader's payoff. */
  purpose: string;
  /** What a machine needs it for — what it unlocks for an agent. */
  machineNeed: string;
  required: Criterion[];
  excellence?: Criterion[];
  /** The one question that most reliably surfaces substance. */
  coaching: string;
  /** Critical sections carry validity (valid-until, verification-method), not only
   *  freshness — an agent acting on an expired assumption does so with full conviction. */
  critical?: boolean;
}

const owner: Criterion = { type: "frontmatter", field: "owner", weight: 4, label: "an owner (frontmatter)" };
const cadence: Criterion = { type: "frontmatter", field: "review-cadence", weight: 4, label: "a review cadence (frontmatter)" };

/**
 * The core — the twelve files every department with a healthy process must be able to
 * fill. Deliberately small, fillable without agent knowledge, useful on its own: a
 * department handbook falls out of it. (`decision-log.md` is a running artefact, not a
 * setup file, so it is not here.)
 */
export const CORE_SECTIONS: readonly SectionDef[] = [
  {
    key: "charter",
    title: "Charter — mandate & stakeholders",
    purpose: "Answers the most common friction once instead of every time: “is this still mine?”",
    machineNeed: "Without an explicit Non-Scope an agent escalates either everything or nothing.",
    required: [
      owner,
      { type: "heading", pattern: "(?i)(purpose|zweck|vision)", weight: 12, label: "a Purpose / Vision" },
      { type: "heading", pattern: "(?i)(mission)", weight: 10, label: "a Mission" },
      { type: "heading", pattern: "(?i)(scope|umfang)", weight: 10, label: "a Scope" },
      { type: "heading", pattern: "(?i)(non.?scope|nicht.?scope|out of scope)", weight: 14, label: "a Non-Scope (the load-bearing field)" },
      { type: "heading", pattern: "(?i)(stakeholder)", weight: 10, label: "a Stakeholders section" },
    ],
    excellence: [
      { type: "table", minRows: 2, pattern: "stakeholder", weight: 10, label: "stakeholders as a table with expectation & mode" },
      { type: "heading", pattern: "(?i)(betriebsmodell|operating model|mitgestaltung|influence)", weight: 6, label: "the operating model / influence-without-authority" },
    ],
    coaching: "Who outside the department has an expectation of it — and where is the seam where you contribute but do not decide?",
  },
  {
    key: "strategy",
    title: "Strategy — the architecture of choice",
    purpose: "Goals without an architecture of choice are a wish list; the non-bets stop every good idea from becoming work.",
    machineNeed: "An agent can only filter proposals if it knows what is deliberately NOT pursued.",
    required: [
      owner,
      { type: "heading", pattern: "(?i)(annahmen|assumptions)", weight: 12, label: "assumptions (with an expiry)" },
      { type: "heading", pattern: "(?i)(trade.?off|wetten|bets)", weight: 14, label: "the bets (with a stop criterion)" },
      { type: "heading", pattern: "(?i)(nicht.?wetten|non.?bets|not pursuing)", weight: 14, label: "the non-bets" },
    ],
    coaching: "Which assumption, if it quietly became false, would carry the whole strategy with it?",
    critical: true,
  },
  {
    key: "objectives",
    title: "Objectives — goals wired upward",
    purpose: "A department goal without a parent node is a hobby.",
    machineNeed: "Prioritising without a goal link optimises the visible instead of the important.",
    required: [
      owner,
      { type: "table", minRows: 2, weight: 24, label: "objectives as a table" },
      { type: "column", pattern: "(?i)(parent|unternehmensziel|company|einzahlt)", weight: 12, label: "a link to the company goal each pays into" },
      { type: "column", pattern: "(?i)(mess|metric|kpi)", weight: 10, label: "how each is measured" },
    ],
    coaching: "For each objective, is it “hold” or “change”? The two demand completely different interventions.",
  },
  {
    key: "service-catalog",
    title: "Service catalog — the lanes",
    purpose: "The heart. A lane that cannot fill these fields is not a service, it is an intention.",
    machineNeed: "Trigger + Definition of Done are the minimum for an agent to ACCEPT and CLOSE work, not just assist.",
    required: [
      owner,
      cadence,
      { type: "table", minRows: 3, weight: 22, label: "at least three lanes (rows)" },
      { type: "heading", pattern: "(?i)(definition of done|abnahme|done)", weight: 18, label: "a Definition of Done" },
      { type: "column", pattern: "(?i)(auslöser|trigger|kunde|customer)", weight: 12, label: "trigger / customer columns" },
      { type: "heading", pattern: "(?i)(eskalation|escalation|durchlaufzeit|lead\\s*time|sla)", weight: 10, label: "lead time / escalation" },
    ],
    excellence: [
      { type: "column", pattern: "(?i)(mensch|agent|human)", weight: 12, label: "a Human/Agent column (the autonomy signal)" },
      { type: "column", pattern: "(?i)(global|regional|kapazit|capacity)", weight: 8, label: "capacity or global/regional dimension" },
    ],
    coaching: "What happens if this lane fails — and who notices first?",
  },
  {
    key: "intake",
    title: "Intake — how work comes in",
    purpose: "Without a defined entrance the loudest channel steers the department.",
    machineNeed: "Urgency must be derivable, not guessed; link the existing prioritisation rule rather than reinvent it.",
    required: [
      owner,
      { type: "heading", pattern: "(?i)(kanäle|kan[aä]l|channel)", weight: 16, label: "the channels" },
      { type: "heading", pattern: "(?i)(priorisierung|priorit)", weight: 16, label: "the prioritisation rule" },
      { type: "heading", pattern: "(?i)(ablehn|reject|declined|not accepted)", weight: 16, label: "what is explicitly rejected" },
    ],
    coaching: "What do you refuse to take in — and is that written down anywhere a person can point to?",
  },
  {
    key: "operating-rhythm",
    title: "Operating rhythm — the cadence",
    purpose: "Without a written cadence a department drifts into ad-hoc; meetings multiply that nobody decided on.",
    machineNeed: "Prep and follow-up of rounds is the most grateful agent task — but only with a named input and output per round.",
    required: [
      owner,
      { type: "table", minRows: 2, weight: 20, label: "the rounds/reviews as a table" },
      { type: "column", pattern: "(?i)(input|output)", weight: 14, label: "input & output per round" },
      { type: "heading", pattern: "(?i)(eskalation|escalation|fenster|window|kadenz|cadence)", weight: 12, label: "escalation window / delivery cadence" },
    ],
    coaching: "For each round, what is the named input and the named output — and by when must an escalation be answered?",
  },
  {
    key: "metrics",
    title: "Metrics",
    purpose: "Forces honesty. A metric with no nameable source is felt, not measured.",
    machineNeed: "Formula + source are the condition for an agent to fetch the number, judge it, and alert at threshold.",
    required: [
      owner,
      { type: "table", minRows: 3, weight: 20, label: "at least three metrics (rows)" },
      { type: "column", pattern: "(?i)(formel|formula)", weight: 12, label: "a Formula column" },
      { type: "column", pattern: "(?i)(quelle|source|system)", weight: 12, label: "a Source (system + field) column" },
      { type: "column", pattern: "(?i)(schwell|threshold|eingriff|ziel|target)", weight: 12, label: "a target / intervention threshold" },
    ],
    coaching: "For your most-cited metric — could an agent fetch it today from a named system and field, unaided?",
    critical: true,
  },
  {
    key: "decision-rights",
    title: "Decision rights & authority levels",
    purpose: "The difference between a department and a queue in front of the boss.",
    machineNeed: "The central file for autonomy: reversibility alone is not enough — authority_level plus thresholds make “may it?” answerable.",
    required: [
      owner,
      { type: "table", minRows: 3, weight: 20, label: "decision types as a table" },
      { type: "column", pattern: "(?i)(rolle|role)", weight: 10, label: "a responsible-role column" },
      { type: "column", pattern: "(?i)(umkehr|reversib)", weight: 10, label: "a reversible yes/no column" },
      { type: "column", pattern: "(?i)(authority|autonom)", weight: 16, label: "an authority_level column (the five rungs)" },
    ],
    excellence: [
      { type: "column", pattern: "(?i)(gemeinsam|tandem|shared|with)", weight: 10, label: "a “shared with / mode” column (tandem vs consult)" },
    ],
    coaching: "For each decision type: reversible or not, and which of the five authority levels may a machine reach?",
    critical: true,
  },
  {
    key: "risks",
    title: "Risks (lean)",
    purpose: "Compliance, data protection, key people and continuity are leadership duty, not a bolt-on module.",
    machineNeed: "An early indicator is a watchable value — it turns the risk register into something an agent observes, not a table opened once a year.",
    required: [
      owner,
      { type: "table", minRows: 2, weight: 24, label: "risks as a table" },
      { type: "column", pattern: "(?i)(frühindikator|early|indicator|signal)", weight: 18, label: "an early-indicator column (watchable)" },
      { type: "column", pattern: "(?i)(gegenma|mitigat|eskalation|escalation)", weight: 8, label: "a mitigation / escalation trigger" },
    ],
    coaching: "For each risk, what is the single watchable value that would go wrong first?",
  },
  {
    key: "handover-contracts",
    title: "Handover contracts",
    purpose: "Your work often ends in another department — without an acceptance point there is no “done”, only “handed over”.",
    machineNeed: "Only with an acceptance criterion can an agent CLOSE a piece of work instead of re-delivering endlessly.",
    required: [
      owner,
      { type: "table", minRows: 1, weight: 22, label: "handovers as a table" },
      { type: "column", pattern: "(?i)(empfänger|recipient|receiver)", weight: 12, label: "a recipient column" },
      { type: "column", pattern: "(?i)(abnahme|acceptance|criterion|done)", weight: 18, label: "an acceptance-criterion column (defines when YOU are done)" },
    ],
    coaching: "For your most important deliverable — what exactly must the recipient be able to do, without asking you a technical question?",
  },
  {
    key: "standards",
    title: "Standards",
    purpose: "A standard that lives only in heads and slide decks is reinvented in every plant.",
    machineNeed: "An agent can check a planned solution against the standard instead of debating every architecture from scratch.",
    required: [
      owner,
      { type: "table", minRows: 2, weight: 22, label: "standards as a table" },
      { type: "column", pattern: "(?i)(status|entwurf|gültig|valid|draft)", weight: 12, label: "a status column (draft/valid/superseded)" },
      { type: "column", pattern: "(?i)(waiver|ausnahme|exception)", weight: 12, label: "a waiver / exception procedure" },
    ],
    coaching: "Which standard is most often quietly worked around — and is its waiver path written down?",
    critical: true,
  },
  {
    key: "portfolio",
    title: "Portfolio — the pipeline with stage-gates",
    purpose: "For a department that is also a portfolio: without it the blocking points vanish — and they are the real steering signal (why value does NOT flow).",
    machineNeed: "An agent can sort initiatives by gate, find the blocked ones, and raise follow-ups — the most grateful automation in such a department.",
    required: [
      owner,
      { type: "heading", pattern: "(?i)(stage|gate)", weight: 14, label: "the stages & gates" },
      { type: "table", minRows: 1, weight: 16, label: "the initiatives as a table" },
      { type: "column", pattern: "(?i)(blocking|blocker|blockade)", weight: 16, label: "a Blocking-Point column (with owner)" },
    ],
    coaching: "Which initiative is blocked right now, who owns the blocker, and what class is it — tech, IT, resources, or a pending decision?",
  },
];

/** The department-wide modules — additive, switched on when their trigger fires. */
export const MODULE_SECTIONS: readonly { key: string; title: string; trigger: string }[] = [
  { key: "systems-of-record", title: "Systems of record", trigger: "Mandatory the moment an agent reads. Two sources for one object is the surest way to a wrong answer." },
  { key: "landscape", title: "Landscape (per facility)", trigger: "When a chain starts with a stock-taking — so it is not redone in the same plant next time." },
  { key: "capabilities", title: "Capabilities & gaps", trigger: "Before any automation decision." },
  { key: "shared-controls", title: "Shared controls", trigger: "Cross-cutting rules (budget, procurement, hiring, privacy, security) that bind several lanes at once." },
  { key: "guardrails", title: "Guardrails", trigger: "The moment an agent writes or acts outward." },
  { key: "iteration-loop", title: "Iteration loop", trigger: "When speed itself becomes a goal (decision latency, cycle time, reversal rate)." },
  { key: "operating-context", title: "Operating context", trigger: "On strong dependency on other units." },
];

export const CORE_KEYS: readonly string[] = CORE_SECTIONS.map((s) => s.key);
const BY_KEY = new Map(CORE_SECTIONS.map((s) => [s.key, s]));
export function sectionDef(key: string): SectionDef | undefined {
  return BY_KEY.get(key);
}
