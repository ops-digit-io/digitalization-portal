/**
 * The coaching sections of the process anamnesis — ported verbatim from the
 * source tool's `backend/config/sections.js` and `backend/templates/*.md`.
 *
 * The sections form a SEQUENCE, not a catalogue: `blocking` lists the section
 * keys that must be complete before this one may be worked, and a `gate` section
 * can fail and stop the sequence.
 */

export interface SectionGroup {
  id: string;        // the GROUPS key, e.g. "discovery"
  label: string;
  subtitle: string;
  order: number;
}

export interface Section {
  key: string;
  label: string;
  order: number;
  group: string;
  file: string;
  gate: boolean;
  blocking: string[];
  description: string;
  gateQuestion?: string;
  /** The markdown scaffold for this section's document. */
  /** Loaded from `du-templates` at runtime — see `lib/process/templates.ts`.
   *  Not embedded here: a template encodes what the method asks for, and that
   *  does not live in the application repository. */
  template?: string;
}

export const SECTION_GROUPS: SectionGroup[] = [
  {
    id: "discovery",
    label: "Discovery",
    subtitle: "What we are looking at, and what it exists for",
    order: 0,
  },
  {
    id: "recon",
    label: "Recon",
    subtitle: "How the process runs today — mapping, tools, flow",
    order: 1,
  },
  {
    id: "measurement",
    label: "Measurement",
    subtitle: "What we know, and what we would have to collect",
    order: 2,
  },
  {
    id: "capacity",
    label: "Capacity to Change",
    subtitle: "Whether the organisation carries the change, and what it costs to touch",
    order: 3,
  },
  {
    id: "decision",
    label: "Decision & Value",
    subtitle: "What to do, how fast it ships, and what it is worth",
    order: 4,
  },
];

export const SECTIONS: Section[] = [
  {
    key: "profile",
    label: "Process Profile",
    order: 1,
    group: "discovery",
    file: "01-profile.md",
    gate: true,
    blocking: [],
    description: "Who owns the process, where it starts and ends, who works inside it, and which business unit carries the cost.",
    gateQuestion: "Is there a named person with the authority to change this process, reachable for the engagement? No spoke, no intake.",
  },
  {
    key: "purpose",
    label: "Purpose & Success Statement",
    order: 2,
    group: "discovery",
    file: "02-purpose.md",
    gate: true,
    blocking: ["profile"],
    description: "What the process is supposed to achieve, in one sentence that yields testable criteria. And: if you rebuilt it from scratch, when would you call it good?",
    gateQuestion: "Is there a purpose sentence from which at least three testable criteria follow?",
  },
  {
    key: "mapping",
    label: "Process Mapping & Artefacts",
    order: 3,
    group: "recon",
    file: "03-mapping.md",
    gate: false,
    blocking: ["profile"],
    description: "How the process is documented today, how current that is, which artefacts are actively maintained and which are frozen.",
  },
  {
    key: "toolchain",
    label: "Toolchain & System Breaks",
    order: 4,
    group: "recon",
    file: "04-toolchain.md",
    gate: false,
    blocking: ["mapping"],
    description: "Which tools are involved, where the chain breaks, and whether the data can be extracted at all.",
  },
  {
    key: "flow",
    label: "Flow, Friction & Latency",
    order: 5,
    group: "recon",
    file: "05-flow.md",
    gate: false,
    blocking: ["mapping"],
    description: "Value stream: how many hands touch it, how often work sits idle, for how long, and where the dominant latency is.",
  },
  {
    key: "kpi",
    label: "KPI Layer",
    order: 6,
    group: "measurement",
    file: "06-kpi.md",
    gate: false,
    blocking: ["purpose"],
    description: "Which indicators describe the process today, whether they are on a cadence, and whether they point at what the business actually needs.",
  },
  {
    key: "diagnostics",
    label: "Diagnostics & Data Points",
    order: 7,
    group: "measurement",
    file: "07-diagnostics.md",
    gate: true,
    blocking: ["toolchain", "flow"],
    description: "The insight layer beneath the KPIs: which data points tell you WHAT is going wrong. Minimum bar: value stream mapping possible, timestamps farmable.",
    gateQuestion: "Can a value stream map be produced for this process, and are timestamps obtainable — by sampling if nothing else?",
  },
  {
    key: "literacy",
    label: "Organisational Readiness",
    order: 8,
    group: "capacity",
    file: "08-literacy.md",
    gate: false,
    blocking: ["profile"],
    description: "Technical literacy and process literacy of the people working inside the process. Does the organisation carry a change, or does it drown in it?",
  },
  {
    key: "cost-of-change",
    label: "Cost of Change",
    order: 9,
    group: "capacity",
    file: "09-cost-of-change.md",
    gate: true,
    blocking: ["mapping", "literacy"],
    description: "What it costs to touch this process — risk, effort, friction, and durability. The counterweight to addressable value, and the gate before any intervention.",
    gateQuestion: "Is the blast radius of every component to be touched named, and is a cost-of-change class assigned with evidence rather than assertion?",
  },
  {
    key: "knowledge",
    label: "Feedback Loop & Knowledge Flow",
    order: 10,
    group: "capacity",
    file: "10-knowledge.md",
    gate: false,
    blocking: ["flow"],
    description: "Does the process have a built-in feedback loop? Which information inside it is worth learning from — and which other departments would benefit from receiving it?",
  },
  {
    key: "diagnosis",
    label: "Diagnosis & Branch",
    order: 11,
    group: "decision",
    file: "11-diagnosis.md",
    gate: true,
    blocking: ["toolchain", "flow", "diagnostics", "cost-of-change"],
    description: "Where the problem sits: at the interfaces, in the process design, in the toolbox — or the step should be killed outright.",
    gateQuestion: "Is exactly one leading branch named, and is its condition evidenced rather than claimed?",
  },
  {
    key: "increment",
    label: "Value Increment & Velocity",
    order: 12,
    group: "decision",
    file: "12-increment.md",
    gate: true,
    blocking: ["diagnosis"],
    description: "The heart of the method: cut the change into the smallest increment that still delivers value, name the addressable value behind the technology, and state how fast the next increment can ship.",
    gateQuestion: "Is there an increment that ships within one iteration cycle and delivers value on its own — not a phase of a big-bang plan?",
  },
  {
    key: "iteration",
    label: "Iteration Hook",
    order: 13,
    group: "decision",
    file: "13-iteration.md",
    gate: false,
    blocking: ["increment"],
    description: "What triggers the next iteration, how fast it must come, and where the trigger is fed from — diagnostics or lessons learned.",
  },
  {
    key: "business-case",
    label: "Business Case",
    order: 14,
    group: "decision",
    file: "14-business-case.md",
    gate: true,
    blocking: ["increment", "flow", "cost-of-change"],
    description: "From the impact conversation to a specific cost model: what changes, what it saves, how many people it touches, what it costs to get there, and when it pays back.",
    gateQuestion: "Is there a calculation whose inputs are individually named and either evidenced or explicitly marked as an estimate?",
  },
];

export const sectionByKey: Record<string, Section> = Object.fromEntries(SECTIONS.map((s) => [s.key, s]));
export const groupById: Record<string, SectionGroup> = Object.fromEntries(SECTION_GROUPS.map((g) => [g.id, g]));

/** Sections of a group, in order. */
export function sectionsOf(groupId: string): Section[] {
  return SECTIONS.filter((s) => s.group === groupId).sort((a, b) => a.order - b.order);
}

/** Sections that may be worked right now: every blocker complete. */
export function unlocked(doneKeys: string[]): Section[] {
  const done = new Set(doneKeys);
  return [...SECTIONS].sort((a, b) => a.order - b.order).filter((s) => s.blocking.every((b) => done.has(b)));
}

/** True when every blocker of `key` is complete. */
export function isUnlocked(key: string, doneKeys: string[]): boolean {
  const s = sectionByKey[key];
  if (!s) return false;
  const done = new Set(doneKeys);
  return s.blocking.every((b) => done.has(b));
}

/** Sections whose gate must pass for the engagement to continue. */
export const GATES: Section[] = [...SECTIONS].sort((a, b) => a.order - b.order).filter((s) => s.gate);
