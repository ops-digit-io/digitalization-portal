/**
 * Business-case DRAFTER (S3) — the deterministic builder that turns a demand and its
 * requirements into a standardized `business-case.md`, the inverse of
 * `parseBusinessCase` (`lib/businesscase.ts`). Mirrors the requirements pipeline:
 * `analyseIntake` → `buildRequirementsMarkdown`, here `draftBusinessCase` →
 * `buildBusinessCaseMarkdown`.
 *
 * HONESTY is the contract (skill `value-sizing`): the drafter NEVER invents a value
 * figure. When the intake carries no quantified baseline — the usual case — the value
 * is left "to be quantified", which means the portfolio reads no euro value from it
 * (the honest empty state), and the missing number becomes an open question and an
 * untested assumption. The draft's job is to scaffold everything AROUND that one
 * figure — the metric, the category, the assumptions to test, the cost structure — so
 * a human (or the live agent) fills a single number instead of authoring the whole
 * case. Confidence is always `indicative` for a draft; `committed` is never emitted
 * (it is not permitted before S5 — see `lib/gates.ts`).
 */

import type { DemandAnswers } from "./demand.js";
import { classifyArchetype } from "./usecase-archetypes.js";
import { parseRequirementsMarkdown, type RequirementsDoc } from "./requirements.js";
import { VALUE_CATEGORIES } from "./value.js";

export interface BusinessCaseAssumption {
  name: string;
  tested: boolean;
  source: string;
}

export interface BusinessCaseDraft {
  /** Always "indicative" for a draft — never committed before a pilot (S5). */
  confidence: "indicative";
  version: number;
  reviewHorizonWeeks: number;
  baseline: { metric: string; value: string; verified: false; note: string };
  value: {
    categoryId: string;
    categoryLabel: string;
    /** Present only when a figure can be stated honestly; otherwise the case says so. */
    annualGross?: number;
    basis: string;
    assumptions: BusinessCaseAssumption[];
  };
  cost: { buildEstimate?: string; annualRunEstimate?: string };
  openQuestions: string[];
}

export interface BusinessCaseMeta {
  id: string;
  title: string;
  generatedOn: string;
}

function clean(s: string | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

/** Domain → value category (from `lib/value.ts`). Falls back to labour effort, the
 *  most common digital-use-case value lever (effort avoided). */
const DOMAIN_TO_CATEGORY: Record<string, string> = {
  quality: "quality_cost",
  maintenance: "availability",
  production: "availability",
  energy: "material_energy_yield",
  sustainability: "material_energy_yield",
  logistics: "working_capital",
  procurement: "working_capital",
  finance: "working_capital",
  customer: "revenue",
  sales: "revenue",
  safety: "risk_compliance",
  hr: "labour_effort",
  it: "labour_effort",
  data: "labour_effort",
  engineering: "quality_cost",
};

function categoryFor(domain: string): { id: string; label: string; computation: string } {
  const id = DOMAIN_TO_CATEGORY[domain.toLowerCase().trim()] ?? "labour_effort";
  const def = VALUE_CATEGORIES.find((c) => c.id === id) ?? VALUE_CATEGORIES.find((c) => c.id === "labour_effort")!;
  return { id: def.id, label: def.label, computation: def.computation };
}

/** A short metric phrase to quantify, derived from the desired outcome / problem. */
function baselineMetric(answers: DemandAnswers): string {
  const outcome = clean(answers.desiredOutcome) || clean(answers.problem);
  if (outcome === "") return "The rate/cost the demand targets (to be defined).";
  const lead = outcome.replace(/^(to|we want to|the ability to)\s+/i, "");
  return `Baseline for: ${lead.charAt(0).toLowerCase()}${lead.slice(1)}`;
}

/**
 * Draft a business case from the demand's answers and (optionally) its requirements.
 * Deterministic. Assumptions come from the requirements' Assumptions list when
 * available, else from the demand's constraints; the value assumption is always first.
 */
export function draftBusinessCase(
  answers: DemandAnswers,
  requirements: RequirementsDoc | undefined,
  opts: { reviewHorizonWeeks?: number } = {},
): BusinessCaseDraft {
  const domain = clean(answers.domain) || "general";
  const arch = classifyArchetype(answers);
  const cat = categoryFor(domain);

  const painQuantified = /\d/.test(answers.currentPain ?? "");
  const baseline = {
    metric: baselineMetric(answers),
    value: painQuantified ? clean(answers.currentPain) : "Not yet quantified.",
    verified: false as const,
    note: painQuantified
      ? "intake estimate — not measured; verification required before G5."
      : "no baseline captured at intake; a verified baseline is required to size value.",
  };

  // Assumptions: the value assumption first, then the requirements' assumptions
  // (all untested at draft), capped so the table stays readable.
  const reqAssumptions = (requirements?.assumptions ?? []).slice(0, 4).map((a) => ({ name: a, tested: false, source: "requirements" }));
  const constraintAssumption = clean(answers.constraints) !== ""
    ? [{ name: `Constraints hold as noted at intake: ${clean(answers.constraints)}`, tested: false, source: "intake" }]
    : [];
  const assumptions: BusinessCaseAssumption[] = [
    { name: "The baseline can be quantified and the improvement attributed to this use case", tested: false, source: "—" },
    ...reqAssumptions,
    ...constraintAssumption,
  ];

  const openQuestions = [
    "What is the quantified annual baseline, and what is its source?",
    "Who is the value owner accountable for realizing the value (required before G3)?",
    ...(arch.feasibilityQuestions[0] ? [arch.feasibilityQuestions[0]] : []),
  ];

  return {
    confidence: "indicative",
    version: 1,
    reviewHorizonWeeks: opts.reviewHorizonWeeks ?? 12,
    baseline,
    value: {
      categoryId: cat.id,
      categoryLabel: cat.label,
      // Honest floor: no fabricated figure. A human/live agent quantifies it.
      basis: `${cat.computation}. Requires a verified baseline before a figure can be stated.`,
      assumptions,
    },
    cost: { buildEstimate: undefined, annualRunEstimate: undefined },
    openQuestions,
  };
}


// ── markdown builder & editors — all via the structured model ────────────────────
//
// The document is never string-patched: we build (or parse) a BusinessCaseModel,
// mutate the typed structure, and render canonical markdown. Parsing is AST-based
// (`lib/business-case-model.ts`), so it tolerates any valid markdown the input
// surface produces, and unrecognised sections are preserved verbatim.

import {
  parseBusinessCaseModel,
  renderBusinessCaseModel,
  applyValuePatch,
  applyAssumptionTested,
  appendChangeLog,
  type BusinessCaseModel,
  type BusinessCaseValuePatch,
} from "./business-case-model.js";

export type { BusinessCaseValuePatch } from "./business-case-model.js";

const INTRO = (on: string) =>
  `Auto-generated from the demand and its requirements by the business-case agent on ${on}. Draft — a human quantifies the value, tests the assumptions, and decides; nothing here passes a gate.`;

/** Map a fresh draft to the structured model the renderer and editors share. */
function modelFromDraft(meta: BusinessCaseMeta, draft: BusinessCaseDraft): BusinessCaseModel {
  const model: BusinessCaseModel = {
    heading: `Business case · ${meta.id} · ${meta.title}`,
    intro: INTRO(meta.generatedOn),
    confidence: draft.confidence,
    version: draft.version,
    reviewHorizonWeeks: draft.reviewHorizonWeeks,
    baseline: { metric: draft.baseline.metric, value: draft.baseline.value, verified: false, note: draft.baseline.note },
    value: { category: draft.value.categoryLabel, basis: draft.value.basis },
    assumptions: draft.value.assumptions.map((a) => ({ name: a.name, tested: a.tested, source: a.source })),
    cost: {
      ...(draft.cost.buildEstimate !== undefined ? { buildEstimate: draft.cost.buildEstimate } : {}),
      ...(draft.cost.annualRunEstimate !== undefined ? { annualRunEstimate: draft.cost.annualRunEstimate } : {}),
    },
    openQuestions: draft.openQuestions,
    changeLog: [],
    extraSections: [],
  };
  if (draft.value.annualGross !== undefined) model.value.annualGross = draft.value.annualGross;
  return model;
}

/**
 * Render a `business-case.md` from a draft. Deterministic — same (meta, draft) →
 * identical bytes — and round-trip stable: parse → render reproduces it.
 */
export function buildBusinessCaseMarkdown(meta: BusinessCaseMeta, draft: BusinessCaseDraft): string {
  return renderBusinessCaseModel(modelFromDraft(meta, draft));
}

/** Convenience: draft from raw markdown inputs (demand answers + optional requirements.md). */
export function draftBusinessCaseMarkdown(
  meta: BusinessCaseMeta,
  answers: DemandAnswers,
  requirementsMarkdown: string | undefined,
): string {
  const requirements = requirementsMarkdown ? parseRequirementsMarkdown(requirementsMarkdown) : undefined;
  return buildBusinessCaseMarkdown(meta, draftBusinessCase(answers, requirements));
}

// ── in-place edits — parse → mutate the model → render. No regex on the document. ─

/**
 * Set the value/cost/verified fields on an existing `business-case.md`. Parses to the
 * model, applies the patch, and renders canonical markdown — so a differently-shaped
 * input is normalised rather than corrupted, and unrecognised sections are preserved.
 * A no-op patch returns the input unchanged.
 */
export function setBusinessCaseValue(markdown: string, patch: BusinessCaseValuePatch): string {
  const model = parseBusinessCaseModel(markdown);
  const next = applyValuePatch(model, patch);
  return renderBusinessCaseModel(next);
}

/** Toggle whether the assumption at `index` (table order) has been tested. */
export function setAssumptionTested(markdown: string, index: number, tested: boolean): string {
  const model = parseBusinessCaseModel(markdown);
  const next = applyAssumptionTested(model, index, tested);
  if (next === model) return markdown;
  return renderBusinessCaseModel(next);
}

export interface BusinessCaseChange {
  actor: string;
  date: string;
  summary: string;
}

/** Append a dated line to the `## Change log` section (created if absent). */
export function logBusinessCaseChange(markdown: string, change: BusinessCaseChange): string {
  const model = parseBusinessCaseModel(markdown);
  return renderBusinessCaseModel(appendChangeLog(model, change));
}
