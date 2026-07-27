/**
 * Requirements analysis & enhancement (`playbooks/requirements-analysis.md`).
 *
 * Takes the funnel input — a captured demand — and produces two standardized
 * markdown artifacts for the case folder:
 *
 *   - analysis.md      domain analysis & enhancement (common patterns, gaps to
 *                      fill, data sources, standards) — "enhancing" the intake.
 *   - requirements.md  standardized requirements: epics, user stories with
 *                      acceptance criteria, non-functional requirements,
 *                      assumptions, risks, open questions, out of scope.
 *
 * The engine here is DETERMINISTIC and draws on `lib/domain-knowledge.ts` — it is
 * the offline agent and the reproducible floor. A live model, governed by the same
 * playbook, may enrich the prose; the structure and the markdown format are fixed
 * here so the output is standardized and reviewable. Draft only — a human refines
 * and decides; nothing here passes a gate.
 */

import type { DemandAnswers } from "./demand.js";
import { classifyDemand } from "./demand.js";
import { knowledgeFor, type DomainKnowledge } from "./domain-knowledge.js";

export interface Epic { id: string; title: string; description: string }

export interface UserStory {
  id: string;
  epic: string; // epic id
  persona: string;
  capability: string;
  benefit: string;
  acceptance: string[];
  priority: "must" | "should" | "could";
}

export interface Nfr { id: string; category: string; requirement: string }

export interface RequirementsDoc {
  epics: Epic[];
  stories: UserStory[];
  nfrs: Nfr[];
  assumptions: string[];
  risks: string[];
  openQuestions: string[];
  outOfScope: string[];
}

export interface IntakeAnalysis {
  domain: string;
  /** A refined, structured problem statement. */
  summary: string;
  /** Comparable solution patterns from domain research. */
  comparablePatterns: string[];
  /** Enhancements — what the intake is missing to be actionable. */
  enhancements: string[];
  dataSources: string[];
  standards: string[];
  personas: string[];
}

export interface AnalysisResult {
  analysis: IntakeAnalysis;
  requirements: RequirementsDoc;
}

function clean(s: string): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}
function hasNumber(s: string): boolean {
  return /\d/.test(s ?? "");
}
/** A capability phrase from the desired outcome / problem, reading after "I want …". */
function capabilityPhrase(answers: DemandAnswers): string {
  const src = clean(answers.desiredOutcome) || clean(answers.problem) || "address the problem";
  const lead = src.replace(/^(i|we)\s+(want|need|would like)\s+(to\s+)?/i, "").replace(/[.]+$/, "");
  return lead.charAt(0).toLowerCase() + lead.slice(1);
}

/** A short, title-cased epic name from the outcome (cut at " so …", ~9 words). */
function outcomeTitle(answers: DemandAnswers): string {
  const cut = capabilityPhrase(answers).split(/\s+so\s+(?:that\s+)?/i)[0]!;
  return titleCase(cut.split(/\s+/).slice(0, 9).join(" "));
}
function stripDot(s: string): string {
  return clean(s).replace(/[.]+$/, "");
}

/**
 * Analyse and enhance an intake, and derive requirements. Deterministic: the same
 * answers always give the same analysis and requirements.
 */
export function analyseIntake(answers: DemandAnswers): AnalysisResult {
  const domain = clean(answers.domain) || classifyDemand(answers).domain || "general";
  const kb = knowledgeFor(domain);

  const analysis = buildAnalysis(answers, kb, domain);
  const requirements = buildRequirements(answers, kb);
  return { analysis, requirements };
}

function buildAnalysis(answers: DemandAnswers, kb: DomainKnowledge, domain: string): IntakeAnalysis {
  const cap = capabilityPhrase(answers);
  const summary = `The ${domain} team needs to ${cap}. Today, ${clean(answers.currentPain) || "the problem is handled manually"}. Success means: ${clean(answers.desiredOutcome) || "the problem is resolved"}.`;

  const enhancements: string[] = [];
  if (!hasNumber(answers.currentPain)) enhancements.push("Quantify the current impact with a baseline figure (time, scrap, or cost) — needed to size the value.");
  if (clean(answers.frequencyScale) === "" || !hasNumber(answers.frequencyScale)) enhancements.push("State how often it happens and at what scale (per shift/week; units, people, sites).");
  if (clean(answers.affectedProcess) === "") enhancements.push("Name the affected process step and the accountable owner.");
  if (clean(answers.constraints) === "") enhancements.push(`Confirm the data sources and systems involved (likely: ${kb.dataSources.join(", ")}).`);
  enhancements.push(`Check the relevant standard(s): ${kb.standards.join(", ")}.`);
  enhancements.push("Name a sponsor and a value owner (required before the business-case gate, G3).");

  return {
    domain,
    summary,
    comparablePatterns: kb.patterns,
    enhancements,
    dataSources: kb.dataSources,
    standards: kb.standards,
    personas: kb.personas,
  };
}

function buildRequirements(answers: DemandAnswers, kb: DomainKnowledge): RequirementsDoc {
  const cap = capabilityPhrase(answers);
  const primary = kb.personas[0] ?? "user";

  // Epics: the core outcome epic, then the domain's recurring themes.
  const epics: Epic[] = [
    { id: "E1", title: outcomeTitle(answers), description: clean(answers.desiredOutcome) || clean(answers.problem) || "Deliver the desired outcome." },
    ...kb.epics.slice(0, 2).map((e, i) => ({ id: `E${i + 2}`, title: e.title, description: e.description })),
  ];

  // Stories: one per epic (primary persona for E1, rotating personas after).
  const stories: UserStory[] = epics.map((epic, i) => {
    const persona = kb.personas[i % kb.personas.length] ?? primary;
    const capability = i === 0 ? cap : `${epic.title.toLowerCase()} in place`;
    const benefit = i === 0
      ? (clean(answers.problem) ? `the problem is prevented (${shortBenefit(answers)})` : "the outcome is achieved")
      : "the solution is reliable and fits the workflow";
    return {
      id: `US-${i + 1}`,
      epic: epic.id,
      persona,
      capability,
      benefit,
      acceptance: acceptanceFor(i, epic, answers, kb),
      priority: i === 0 ? "must" : "should",
    };
  });

  const nfrs: Nfr[] = kb.nfrs.map((n, i) => ({ id: `NFR-${i + 1}`, category: n.category, requirement: n.requirement }));

  const assumptions = [
    `The data sources (${kb.dataSources.join(", ")}) are accessible and reliable enough.`,
    "The affected users can adopt the change within their existing workflow.",
  ];
  const risks = [
    "Data quality or availability is insufficient for the desired signal.",
    `Adoption by the ${primary} is not sustained after go-live.`,
    clean(answers.constraints) ? `Constraints noted at intake: ${stripDot(answers.constraints)}.` : "Integration effort with existing systems is underestimated.",
  ];
  const openQuestions = [
    ...(!hasNumber(answers.currentPain) ? ["What is the quantified baseline (time/scrap/cost) today?"] : []),
    ...(clean(answers.frequencyScale) === "" ? ["How often does it occur and at what scale?"] : []),
    "Who is the sponsor, and who is the value owner?",
    `Which standard applies, and what does it require (${kb.standards.join(", ")})?`,
  ];
  const outOfScope = [
    "Roll-out to other plants (handled at the scale stage, S6).",
    "Changes to adjacent systems beyond the integration needed for this outcome.",
  ];

  return { epics, stories, nfrs, assumptions, risks, openQuestions, outOfScope };
}

function acceptanceFor(i: number, epic: Epic, answers: DemandAnswers, kb: DomainKnowledge): string[] {
  if (i === 0) {
    return [
      `Given the situation described, when the solution is in use, then the desired outcome is achieved: ${stripDot(answers.desiredOutcome) || "the problem is resolved"}.`,
      "Given a relevant event, when it occurs, then the responsible user is informed in time to act.",
      "Given any produced figure, when it is shown, then its confidence state is visible (never presented as committed prematurely).",
    ];
  }
  return [
    `Given the required data (${kb.dataSources[0] ?? "source data"}), when it is unavailable, then the user sees a clear degraded state rather than a wrong result.`,
    "Given a user action, when it is taken, then it is recorded so the run is auditable.",
  ];
}

function shortBenefit(answers: DemandAnswers): string {
  const p = clean(answers.currentPain);
  return p ? p.split(/[.;]/)[0]!.slice(0, 80) : "the current pain is reduced";
}
function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Markdown builders (standardized format) ────────────────────────────────────

export interface ArtifactMeta { id: string; title: string; generatedOn: string }

/** analysis.md — domain analysis & enhancement of the intake. */
export function buildAnalysisMarkdown(meta: ArtifactMeta, a: IntakeAnalysis): string {
  const list = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- _none_");
  return `# Analysis · ${meta.id} · ${meta.title}

> Domain analysis & enhancement of the intake, generated by the requirements-analysis agent on ${meta.generatedOn}. Draft — a human refines and decides.

## Domain

${a.domain}

## Refined problem

${a.summary}

## Comparable patterns (baseline)

${list(a.comparablePatterns)}

_Broader view — real reference cases, testimonials, and benchmarks from public sources — is in the case's \`research.md\` (domain-research agent)._

## Suggested enhancements to the intake

${list(a.enhancements)}

## Relevant data & systems

${list(a.dataSources)}

## Standards & compliance to check

${list(a.standards)}

## Personas

${list(a.personas)}
`;
}

/** requirements.md — standardized requirements derived from the intake. */
export function buildRequirementsMarkdown(meta: ArtifactMeta, r: RequirementsDoc): string {
  const epicsTable = ["| ID | Epic | Description |", "|---|---|---|", ...r.epics.map((e) => `| ${e.id} | ${e.title} | ${e.description} |`)].join("\n");

  const storyBlocks = r.epics
    .map((epic) => {
      const stories = r.stories.filter((s) => s.epic === epic.id);
      if (stories.length === 0) return "";
      const body = stories
        .map((s) => {
          const acc = s.acceptance.map((a) => `    - ${a}`).join("\n");
          return `- **${s.id}** _(${s.priority})_ — As a **${s.persona}**, I want ${s.capability}, so that ${s.benefit}.\n  - Acceptance criteria:\n${acc}`;
        })
        .join("\n");
      return `### ${epic.id} — ${epic.title}\n\n${body}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const nfrTable = ["| ID | Category | Requirement |", "|---|---|---|", ...r.nfrs.map((n) => `| ${n.id} | ${n.category} | ${n.requirement} |`)].join("\n");
  const list = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- _none_");

  return `# Requirements · ${meta.id} · ${meta.title}

> Auto-generated from the intake by the requirements-analysis agent on ${meta.generatedOn}. Draft — requirements are refined and prioritised by a human; nothing here passes a gate.

## Epics

${epicsTable}

## User stories

${storyBlocks}

## Non-functional requirements

${nfrTable}

## Assumptions

${list(r.assumptions)}

## Risks

${list(r.risks)}

## Open questions

${list(r.openQuestions)}

## Out of scope

${list(r.outOfScope)}
`;
}

// ── Parser (inverse of buildRequirementsMarkdown) ──────────────────────────────

/** Split a doc into `## Heading` → body (headings lowercased, `##` only). */
function splitH2(markdown: string): Record<string, string> {
  const out: Record<string, string> = {};
  let current: string | null = null;
  let buf: string[] = [];
  const flush = () => { if (current) out[current] = buf.join("\n").trim(); };
  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h && !line.startsWith("###")) { flush(); current = h[1]!.toLowerCase(); buf = []; }
    else if (current) buf.push(line);
  }
  flush();
  return out;
}

/** Read a `| a | b | c |` table body (skipping header + separator) into rows of cells. */
function tableRows(body: string): string[][] {
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && !/^\|[\s|:-]+\|?$/.test(l))
    .map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()))
    .filter((cells, i) => !(i === 0 && /^id$/i.test(cells[0] ?? ""))); // drop header row
}

/** Bullet-list items, dropping the `_none_` placeholder. */
function listItems(body: string): string[] {
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^-\s+/.test(l))
    .map((l) => l.replace(/^-\s+/, "").trim())
    .filter((x) => x !== "" && !/^_none_$/i.test(x));
}

const STORY_RE = /^-\s+\*\*(\S+)\*\*\s+_\((must|should|could)\)_\s+—\s+As a\s+\*\*(.+?)\*\*,\s+I want\s+(.+?),\s+so that\s+(.+?)\.?$/;

/**
 * Parse a standardized `requirements.md` back into a `RequirementsDoc`. The inverse
 * of `buildRequirementsMarkdown`; tolerant of prose a live model may have enriched,
 * but anchored on the fixed structure (tables, `### Ex —` story blocks). Unknown or
 * missing sections yield empty arrays rather than throwing.
 */
export function parseRequirementsMarkdown(markdown: string): RequirementsDoc {
  const sections = splitH2(markdown);

  const epics: Epic[] = tableRows(sections["epics"] ?? "")
    .filter((c) => c.length >= 2 && /^E\d+/i.test(c[0] ?? ""))
    .map((c) => ({ id: c[0]!, title: c[1] ?? "", description: c[2] ?? "" }));

  // Stories: scan the `## User stories` body, tracking the current `### Ex —` epic.
  const stories: UserStory[] = [];
  let currentEpic = epics[0]?.id ?? "E1";
  let last: UserStory | undefined;
  let inAcceptance = false;
  for (const raw of (sections["user stories"] ?? "").split("\n")) {
    const line = raw.trim();
    const epicH = /^###\s+(E\d+)\b/.exec(line);
    if (epicH) { currentEpic = epicH[1]!; last = undefined; inAcceptance = false; continue; }
    const sm = STORY_RE.exec(line);
    if (sm) {
      last = { id: sm[1]!, epic: currentEpic, priority: sm[2] as UserStory["priority"], persona: sm[3]!, capability: sm[4]!, benefit: sm[5]!, acceptance: [] };
      stories.push(last);
      inAcceptance = false;
      continue;
    }
    if (/acceptance criteria:?/i.test(line) && last) { inAcceptance = true; continue; }
    // Indented sub-bullets belong to the current story's acceptance list.
    if (last && /^-\s+/.test(line) && /^\s{2,}-/.test(raw)) {
      if (inAcceptance || last.acceptance.length > 0) last.acceptance.push(line.replace(/^-\s+/, "").trim());
    }
  }

  const nfrs: Nfr[] = tableRows(sections["non-functional requirements"] ?? "")
    .filter((c) => c.length >= 2 && /^NFR-\d+/i.test(c[0] ?? ""))
    .map((c) => ({ id: c[0]!, category: c[1] ?? "", requirement: c[2] ?? "" }));

  return {
    epics,
    stories,
    nfrs,
    assumptions: listItems(sections["assumptions"] ?? ""),
    risks: listItems(sections["risks"] ?? ""),
    openQuestions: listItems(sections["open questions"] ?? ""),
    outOfScope: listItems(sections["out of scope"] ?? ""),
  };
}
