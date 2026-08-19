/**
 * The demand model (`docs/ARCHITECTURE-intake.md`, playbook `s1-intake`).
 *
 * A demand is a MARKDOWN PAGE — the same way a skill is a markdown page. It is
 * the S1 intake artifact: the problem written down, captured once. Every demand
 * lives in ONE central intake repository (`du-demands`) until it earns its own
 * repository at the PoC stage (see the architecture doc). A demand's markdown IS
 * the future use-case README, so parsing reuses `parseUseCase`.
 *
 * The intake is AI-guided but its OUTPUT IS DETERMINISTIC. This is the whole
 * contract: given the same captured answers, `buildDemand` emits byte-identical
 * markdown, with the same sections in the same order — always. The model's job is
 * to elicit and normalise the answers (conduct the conversation, propose a lane);
 * rendering the artifact is pure code, never model output. That is what makes the
 * intake reproducible and reviewable (`constraint #8` reasoning applied to shape).
 */

import type { Lane } from "./types.js";
import { parseUseCase } from "./parse.js";

export type FieldInput = "text" | "textarea" | "select";

/**
 * One field the intake captures. This is the single definition the three tools
 * share: the Chat asks `question`, the Form shows `label` + `hint` + the right
 * `input`, and both render into `section`. The interview guide
 * (`skills/intake-conversation/references/interview.md`) documents the intent.
 * Order here is the order asked.
 */
export interface DemandField {
  key: keyof DemandAnswers;
  /** Short form label, e.g. "Impact today". */
  label: string;
  /** Conversational phrasing the Chat tool asks. */
  question: string;
  /** One-line helper under the form label / the interviewer's intent. */
  hint: string;
  /** Form grouping header. */
  group: string;
  /** Form control to render. */
  input: FieldInput;
  /** Options for a `select` input. */
  options?: readonly string[];
  /** The `## Section` heading it renders under, or null for a State/People field. */
  section: string | null;
  /** Placeholder shown when the field is empty — kept STABLE so output is stable. */
  placeholder: string;
  required: boolean;
}

/**
 * Sites and domains — the SEED for the admin-managed category store
 * (`lib/category-store.ts`). Dropdowns read the managed list (editable at
 * `/admin/categories`), falling back to these values when nothing is configured, so
 * they stay the stable default. Kept here because the deterministic engine
 * (`buildDemand`/`classifyDemand`) references them and must not depend on IO. Free
 * text is still accepted by the Chat and Markdown tools.
 */
export const PLANTS = [
  // Europe
  "DE-ALD", "DE-VIE", "SK-PUC", "PL-BAR", "HU-SZE", "RS-SUB",
  // Americas
  "US-GRV", "US-CUL", "BR-SAO", "MX-CEL",
  // Asia
  "CN-SUZ", "CN-FOS", "IN-PUN",
  "ALL",
] as const;
// Kept in step with `registry/domains.md`, the documented master — the two had
// drifted (each held values the other did not) until the tool landscape needed
// them to agree. `lib/otx/registry-shipped.test.ts` now guards it.
export const DOMAINS = [
  "quality", "maintenance", "production", "engineering", "procurement", "supply_chain", "logistics",
  "energy", "esg", "safety", "hr", "finance_admin",
  // IT/OT vocabulary — integration work is not a business domain like the others,
  // but it is what a demand about a broker, a namespace or an unreadable PLC IS.
  "ot_integration", "traceability", "process_control",
  "other",
] as const;

const GROUP_PROBLEM = "The problem";
const GROUP_SCOPE = "Scope & context";
const GROUP_CLASSIFY = "Classification";

/** The structured answers an intake produces. Free text; rendering is fixed. */
export interface DemandAnswers {
  title: string;
  problem: string;
  currentPain: string;
  desiredOutcome: string;
  affectedProcess: string;
  frequencyScale: string;
  constraints: string;
  /** Tools & systems the demand touches, comma-separated. Feeds the tool landscape. */
  tools: string;
  plant: string;
  domain: string;
  requester: string;
}

export const EMPTY_ANSWERS: DemandAnswers = {
  title: "", problem: "", currentPain: "", desiredOutcome: "",
  affectedProcess: "", frequencyScale: "", constraints: "", tools: "",
  plant: "", domain: "", requester: "",
};

/**
 * The intake question set — the single definition behind all three tools and the
 * interview guide. Adding a field is one entry here plus one line in `buildDemand`.
 * Keys, sections, and placeholders are stable so the output format never drifts.
 */
export const INTAKE_FIELDS: readonly DemandField[] = [
  {
    key: "title", label: "Title", group: GROUP_PROBLEM, input: "text", section: null, required: true,
    question: "In a sentence, what's the demand?",
    hint: "A short working name — you can refine it later.",
    placeholder: "_Untitled demand._",
  },
  {
    key: "problem", label: "Problem", group: GROUP_PROBLEM, input: "textarea", section: "Problem", required: true,
    question: "What's going wrong? Describe the problem you're seeing.",
    hint: "The symptom, concretely: what happens, where, and why it matters.",
    placeholder: "_Captured at intake._",
  },
  {
    key: "currentPain", label: "Impact today", group: GROUP_PROBLEM, input: "textarea", section: "Current pain", required: true,
    question: "How is it handled today, and what does it cost?",
    hint: "Time, scrap, money, or risk it causes now — put a number on it if you can.",
    placeholder: "_No current-state description captured._",
  },
  {
    key: "desiredOutcome", label: "Desired outcome", group: GROUP_PROBLEM, input: "textarea", section: "Desired outcome", required: true,
    question: "What would 'solved' look like?",
    hint: "What you'd see or be able to measure if it worked.",
    placeholder: "_No target outcome captured._",
  },
  {
    key: "affectedProcess", label: "Process & people", group: GROUP_SCOPE, input: "textarea", section: "Affected process", required: false,
    question: "Which process is affected, and who feels it?",
    hint: "The step or workflow, and the team or role impacted.",
    placeholder: "_No process/owner captured._",
  },
  {
    key: "frequencyScale", label: "Frequency & scale", group: GROUP_SCOPE, input: "textarea", section: "Frequency & scale", required: false,
    question: "How often does it happen, and at what scale?",
    hint: "Per shift, per week? How many units, people, or sites?",
    placeholder: "_No frequency/scale captured._",
  },
  {
    key: "constraints", label: "Constraints & history", group: GROUP_SCOPE, input: "textarea", section: "Constraints & context", required: false,
    question: "Any constraints, data, or earlier attempts we should know about?",
    hint: "Data that exists, what has been tried, what is not allowed. Name the tools themselves in the next field.",
    placeholder: "_None captured._",
  },
  {
    // Free text, comma-separated, deliberately NOT a picker: the tool a demand is
    // about is often the one no register has heard of, and a picker would make it
    // unnameable. The landscape matches what it can and lists the rest as tools
    // named by a use case and registered nowhere (`lib/otx/consolidate.ts`).
    key: "tools", label: "Tools & systems", group: GROUP_SCOPE, input: "text", section: null, required: false,
    question: "Which tools or systems does this touch?",
    hint: "Comma-separated, by name — SAP S/4HANA, Power BI, the line's SCADA. Every one becomes a row on the tool landscape.",
    placeholder: "",
  },
  {
    key: "plant", label: "Plant", group: GROUP_CLASSIFY, input: "select", options: PLANTS, section: null, required: true,
    question: "Which plant does this concern?",
    hint: "The site this affects (ALL if group-wide).",
    placeholder: "",
  },
  {
    key: "domain", label: "Domain", group: GROUP_CLASSIFY, input: "select", options: DOMAINS, section: null, required: false,
    question: "Which area does it fall under?",
    hint: "The functional domain.",
    placeholder: "",
  },
  {
    key: "requester", label: "Requester", group: GROUP_CLASSIFY, input: "text", section: null, required: false,
    question: "Who's raising it?",
    hint: "Your name or e-mail.",
    placeholder: "",
  },
];

/** Field groups in order, for the Form's fieldsets. */
export const FIELD_GROUPS: readonly string[] = [GROUP_PROBLEM, GROUP_SCOPE, GROUP_CLASSIFY];

/** Fields that render as prose sections, in fixed order. */
const SECTION_FIELDS = INTAKE_FIELDS.filter((f) => f.section !== null);

function clean(v: string): string {
  return v.replace(/\r\n/g, "\n").trim();
}

/** Fill an empty value with its STABLE placeholder so the shape never changes. */
function body(field: DemandField, answers: DemandAnswers): string {
  const v = clean(answers[field.key]);
  return v !== "" ? v : field.placeholder;
}

/** State value or a stable empty marker. */
function stateVal(v: string): string {
  const c = clean(v);
  return c !== "" ? c : "";
}

export interface DemandMeta {
  /** UC-YYYY-NNNN id assigned at capture. */
  id: string;
  /** ISO date (YYYY-MM-DD) the demand was captured. */
  createdOn: string;
  /** Lane proposed at intake; "unassigned" until triage confirms it. */
  lane: Lane | "unassigned";
}

/**
 * Render a demand to markdown. DETERMINISTIC: same (meta, answers) → identical
 * bytes, every section always present in the same order. This is the guarantee
 * the intake rests on — the model may vary the conversation, never the artifact.
 */
export function buildDemand(meta: DemandMeta, answers: DemandAnswers): string {
  const title = clean(answers.title) || "Untitled demand";
  const sections = SECTION_FIELDS.map((f) => `## ${f.section}\n\n${body(f, answers)}`).join("\n\n");

  return `# ${meta.id} · ${title}

## State

- **Stage:** S1
- **Lane:** ${meta.lane}
- **Status:** active
- **Plant:** ${stateVal(answers.plant)}
- **Domain:** ${stateVal(answers.domain)}
- **Tools:** ${stateVal(answers.tools)}
- **Created:** ${meta.createdOn}
- **Intake:** complete

${sections}

## People

| Role | Person |
|---|---|
| Requester | ${stateVal(answers.requester)} |
| Sponsor | <!-- required before G3 --> |
| Value owner | <!-- required before G3 --> |

## Gates

| Gate | Status | Date | By | Note |
|---|---|---|---|---|
| G1 Intake accepted | open | | | |
| G2 Prioritized | pending | | | |
| G3 Business case | pending | | | |
| G4 POC proven/stop | pending | | | |
| G5 Pilot proven | pending | | | |
| G6 Scale readiness | pending | | | |
| G7 Rollout complete | pending | | | |

## History

- ${meta.createdOn} — captured via portal intake (s1-intake playbook)
`;
}

/**
 * The canonical blank demand page — the template the Markdown tool starts from.
 * It is just `buildDemand` of no answers, so every tool begins from (and returns
 * to) exactly the same shape.
 */
export function blankDemandMarkdown(): string {
  return buildDemand({ id: "UC-YYYY-NNNN", createdOn: "YYYY-MM-DD", lane: "unassigned" }, EMPTY_ANSWERS);
}

/** Split a demand's markdown into `## Heading` → body text (lowercased headings). */
function splitSections(markdown: string): Record<string, string> {
  const out: Record<string, string> = {};
  let current: string | null = null;
  let buf: string[] = [];
  const flush = () => { if (current) out[current] = buf.join("\n").trim(); };
  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { flush(); current = h[1]!.toLowerCase(); buf = []; }
    else if (current) buf.push(line);
  }
  flush();
  return out;
}

/**
 * Recover the structured answers from a demand's markdown — the inverse of
 * `buildDemand`, used by the Markdown tool so hand-edited markdown normalises back
 * through the same renderer and the saved output matches every other tool's.
 * A body equal to its stable placeholder counts as empty. Never throws.
 */
export function parseDemandToAnswers(markdown: string): DemandAnswers {
  const out: DemandAnswers = { ...EMPTY_ANSWERS };
  const p = parseUseCase(markdown);

  const h1 = markdown.replace(/\r\n/g, "\n").match(/^#\s+(.+?)\s*$/m)?.[1] ?? "";
  const title = h1.replace(/^UC-[A-Z0-9]{4}-[A-Z0-9]+\s*·\s*/i, "").trim();
  out.title = title.toLowerCase() === "untitled demand" ? "" : title;

  out.plant = p.state.plant ?? "";
  out.domain = p.state.domain ?? "";
  // An unknown `## State` key is preserved by the parser, which is why declaring
  // tools needed no parser change (`docs/BUILD.md`, the markdown parser section).
  out.tools = (p.state.raw["tools"] ?? "").trim();

  const req = markdown.match(/\|\s*Requester\s*\|([^|\n]*)\|/i)?.[1]?.trim() ?? "";
  out.requester = req.includes("<!--") ? "" : req;

  const sections = splitSections(markdown);
  for (const f of INTAKE_FIELDS) {
    if (f.section === null) continue;
    const body = (sections[f.section.toLowerCase()] ?? "").trim();
    out[f.key] = body === "" || body === f.placeholder ? "" : body;
  }
  return out;
}

/** Keyword → lane rules. Deterministic; the same text always proposes the same lane. */
const LANE_RULES: { lane: Lane; terms: RegExp }[] = [
  { lane: "regulatory", terms: /\b(regulat|compliance|audit|gmp|iso|legal|mandat)/i },
  { lane: "data_ai", terms: /\b(ai|ml|model|predict|forecast|copilot|llm|chatbot|vision|anomaly)/i },
  { lane: "innovation", terms: /\b(prototype|novel|experiment|explore|research|new tech)/i },
  { lane: "run", terms: /\b(bug|outage|incident|broken|fix|access|password|restart)/i },
  { lane: "continuous_improvement", terms: /\b(kaizen|lean|waste|standard work|small|tweak|improve)/i },
];

/** Keyword → domain rules. */
const DOMAIN_RULES: { domain: string; terms: RegExp }[] = [
  { domain: "quality", terms: /\b(quality|scrap|defect|rework|inspection|ncr)/i },
  { domain: "maintenance", terms: /\b(maintenance|wear|breakdown|downtime|spare|repair)/i },
  { domain: "energy", terms: /\b(energy|power|kwh|consumption|emission|co2)/i },
  { domain: "production", terms: /\b(production|line|shift|throughput|oee|cycle)/i },
  { domain: "procurement", terms: /\b(procure|supplier|vendor|tender|purchas|sourcing)/i },
  { domain: "logistics", terms: /\b(logistic|warehouse|inventory|material flow|shipment)/i },
  // IT/OT rules sit last: a demand that says "OEE from the SCADA" is a production
  // demand that happens to name a system, and the earlier rules should win. Only
  // text whose SUBJECT is the integration itself falls through to here.
  { domain: "ot_integration", terms: /\b(opc.?ua|opcua|mqtt|sparkplug|unified namespace|uns|broker|edge gateway|plc|scada|historian|isa.?95|middleware|interface|schnittstelle)/i },
  { domain: "traceability", terms: /\b(traceab|genealog|serial number|batch record|as.?built|rückverfolg)/i },
  { domain: "process_control", terms: /\b(setpoint|sollwert|closed.?loop|regelkreis|control loop|feedback control|pid)/i },
];

export interface Classification {
  lane: Lane | "unassigned";
  domain: string;
  /** Human-readable why, for the intake trace. */
  rationale: string;
}

/**
 * Propose a lane + domain from the captured text. Deterministic rule-based
 * classification — the offline path, and the stable fallback behind any live
 * model. Same input → same proposal. Triage confirms or overrides it; nothing
 * here decides anything on its own.
 */
export function classifyDemand(answers: DemandAnswers): Classification {
  const hay = [answers.title, answers.problem, answers.currentPain, answers.desiredOutcome, answers.affectedProcess]
    .join(" \n ")
    .toLowerCase();

  const laneHit = LANE_RULES.find((r) => r.terms.test(hay));
  const lane: Lane | "unassigned" = laneHit ? laneHit.lane : hay.trim() !== "" ? "transform" : "unassigned";

  const domainHit = DOMAIN_RULES.find((r) => r.terms.test(hay));
  const domain = clean(answers.domain) || domainHit?.domain || "";

  const parts: string[] = [];
  parts.push(laneHit ? `matched lane "${lane}" on a keyword` : lane === "transform" ? `no lane keyword — defaulted to "transform" (DU-owned change)` : `no text yet`);
  if (domainHit && !clean(answers.domain)) parts.push(`domain "${domain}" from a keyword`);
  return { lane, domain, rationale: parts.join("; ") };
}

/** Which required fields are still empty. Drives the intake's "ready to save" state. */
export function missingRequired(answers: DemandAnswers): DemandField[] {
  return INTAKE_FIELDS.filter((f) => f.required && clean(answers[f.key]) === "");
}

/** Next demand id given the highest existing number this year (deterministic). */
export function nextDemandId(existingIds: readonly string[], year: number): string {
  let max = 0;
  const prefix = `UC-${year}-`;
  for (const id of existingIds) {
    if (id.toUpperCase().startsWith(prefix.toUpperCase())) {
      const n = Number.parseInt(id.slice(prefix.length), 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}
