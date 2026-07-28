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

// ── markdown builder (inverse of parseBusinessCase) ─────────────────────────────

function grossLine(v: BusinessCaseDraft["value"]): string {
  return v.annualGross !== undefined
    ? `EUR ${v.annualGross.toLocaleString("en-US")}`
    : "To be quantified — a verified baseline is required.";
}

/**
 * Render a `business-case.md` that `parseBusinessCase` round-trips. Deterministic:
 * same (meta, draft) → identical bytes, every section in the same order.
 */
export function buildBusinessCaseMarkdown(meta: BusinessCaseMeta, draft: BusinessCaseDraft): string {
  const assumptionRows = draft.value.assumptions
    .map((a) => `| ${a.name} | ${a.tested ? "Yes" : "No"} | ${a.source} |`)
    .join("\n");
  const openQuestions = draft.openQuestions.length > 0
    ? draft.openQuestions.map((q) => `- ${q}`).join("\n")
    : "- _none_";

  return `# Business case · ${meta.id} · ${meta.title}

> Auto-generated from the demand and its requirements by the business-case agent on ${meta.generatedOn}. Draft — a human quantifies the value, tests the assumptions, and decides; nothing here passes a gate.

## State

- **Confidence:** ${draft.confidence}
- **Version:** ${draft.version}
- **Review horizon:** ${draft.reviewHorizonWeeks} weeks

## Baseline

**Metric.** ${draft.baseline.metric}
**Value.** ${draft.baseline.value}
**Verified.** No — ${draft.baseline.note}

## Value

**Category.** ${draft.value.categoryLabel}
**Annual gross.** ${grossLine(draft.value)}
**Basis.** ${draft.value.basis}

### Assumptions

| Assumption | Tested | Source |
|---|---|---|
${assumptionRows}

## Cost

| | |
|---|---|
| Build estimate | ${draft.cost.buildEstimate ?? "To be estimated"} |
| Annual run estimate | ${draft.cost.annualRunEstimate ?? "To be estimated"} |

## Open questions

${openQuestions}
`;
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

// ── in-place value edits (the human quantifies the draft) ───────────────────────

export interface BusinessCaseValuePatch {
  /** Annual gross in EUR; null clears it back to "to be quantified". */
  annualGross?: number | null;
  buildEstimate?: string;
  annualRunEstimate?: string;
  baselineVerified?: boolean;
}

function eur(n: number): string {
  return `EUR ${Math.round(n).toLocaleString("en-US")}`;
}

/**
 * Set the value/cost/verified fields on an existing `business-case.md`, in place —
 * so the human can quantify a drafted case and the simulation lights up. Only the
 * targeted lines are rewritten (Annual gross, Cost rows, Baseline Verified); the rest
 * of the document — assumptions, confidence, open questions — is untouched. Pure.
 */
export function setBusinessCaseValue(markdown: string, patch: BusinessCaseValuePatch): string {
  let md = markdown;

  if (patch.annualGross !== undefined) {
    const value = patch.annualGross === null || !Number.isFinite(patch.annualGross) || patch.annualGross <= 0
      ? "To be quantified — a verified baseline is required."
      : eur(patch.annualGross);
    md = md.replace(/(\*\*Annual gross\.\*\*\s*).*/i, `$1${value}`);
  }
  if (patch.buildEstimate !== undefined) {
    md = md.replace(/(\|\s*Build estimate\s*\|)([^|\n]*)(\|)/i, `$1 ${patch.buildEstimate.trim() || "To be estimated"} $3`);
  }
  if (patch.annualRunEstimate !== undefined) {
    md = md.replace(/(\|\s*Annual run estimate\s*\|)([^|\n]*)(\|)/i, `$1 ${patch.annualRunEstimate.trim() || "To be estimated"} $3`);
  }
  if (patch.baselineVerified !== undefined) {
    const line = patch.baselineVerified
      ? "**Verified.** Yes — baseline confirmed."
      : "**Verified.** No — a verified baseline is required before G5.";
    md = md.replace(/\*\*Verified\.\*\*\s*.*/i, line);
  }
  return md;
}
