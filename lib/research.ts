/**
 * Domain research (`playbooks/domain-research.md`).
 *
 * The research agent broadens a demand beyond the baseline knowledge base: it uses
 * public data to find reference cases, testimonials, comparable implementations,
 * benchmarks, standards, and lessons learned for problems like this one, and
 * writes a `research.md` brief per case. It is NOT limited to the seed KB — that is
 * only the offline floor and the starting point.
 *
 * This module holds the brief model, the deterministic offline SEED (a real
 * research plan + baseline, honestly labelled as having no live sources), and the
 * standardized markdown. The live web research itself is run by
 * `lib/agent/research-runner.ts` under the research playbook.
 */

import type { DemandAnswers } from "./demand.js";
import { classifyDemand } from "./demand.js";
import { knowledgeFor } from "./domain-knowledge.js";

export interface ReferenceCase {
  title: string;
  /** Where it comes from — an org, publication, or URL. */
  source: string;
  takeaway: string;
}
export interface Testimonial {
  quote: string;
  source: string;
}

export interface ResearchBrief {
  domain: string;
  problemClass: string;
  /** Comparable approaches known from the baseline. */
  baselinePatterns: string[];
  /** What the agent should look for in public sources. */
  researchTargets: string[];
  /** Suggested public-source search queries. */
  queries: string[];
  /** Reference cases found (empty offline — gathered by the live research agent). */
  referenceCases: ReferenceCase[];
  testimonials: Testimonial[];
  benchmarks: string[];
  standards: string[];
  pitfalls: string[];
  /** Sources/citations (empty offline). */
  sources: string[];
  /** True when produced from live public research; false when the offline seed. */
  live: boolean;
}

function clean(s: string): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}
function phrase(answers: DemandAnswers): string {
  const src = clean(answers.desiredOutcome) || clean(answers.problem) || "the outcome";
  return src.replace(/^(i|we)\s+(want|need|would like)\s+(to\s+)?/i, "").replace(/[.]+$/, "");
}
/** A short keyword phrase (cut at " so …", ~7 words) for queries and the problem class. */
function shortPhrase(answers: DemandAnswers): string {
  const cut = phrase(answers).split(/\s+so\s+(?:that\s+)?/i)[0]!;
  return cut.split(/\s+/).slice(0, 7).join(" ");
}

/**
 * The offline research SEED — a genuine research plan plus the baseline. It carries
 * NO invented cases or citations (those require live public research); instead it
 * says exactly what to research and how, so it is useful on its own and honest
 * about what it doesn't have.
 */
export function seedResearchBrief(answers: DemandAnswers): ResearchBrief {
  const domain = clean(answers.domain) || classifyDemand(answers).domain || "general";
  const kb = knowledgeFor(domain);
  const cap = phrase(answers);
  const short = shortPhrase(answers);

  const problemClass = `${domain} — ${cap}`;
  const researchTargets = [
    `Reference implementations of "${short}" in ${domain} (who did it, how, what result).`,
    `Testimonials or case studies from comparable ${domain} sites.`,
    "Quantified benchmarks (baseline vs. after) for this class of problem.",
    `Applicable standards and what they require (${kb.standards.join(", ")}).`,
    "Common pitfalls and lessons learned from similar projects.",
    "Vendor and open-source solutions that already address this.",
  ];
  const queries = [
    `${domain} ${short} case study`,
    `${domain} ${short} results ROI manufacturing`,
    `${short} lessons learned pitfalls`,
    `${kb.patterns[0] ?? short} reference implementation`,
    `${domain} ${kb.standards[0] ?? "standard"} requirements`,
  ];
  const benchmarks = [
    "Baseline vs. post-implementation on the core metric (find comparable figures).",
    "Adoption / time-to-value reported by similar projects.",
  ];
  const pitfalls = [
    "Poor or unavailable data undermines the intended signal.",
    "Low adoption when the solution doesn't fit the existing workflow.",
    "Scope creep beyond the first, well-defined use case.",
  ];

  return {
    domain,
    problemClass,
    baselinePatterns: kb.patterns,
    researchTargets,
    queries,
    referenceCases: [],
    testimonials: [],
    benchmarks,
    standards: kb.standards,
    pitfalls,
    sources: [],
    live: false,
  };
}

export interface ResearchMeta { id: string; title: string; generatedOn: string }

const listMd = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- _none_");

/** research.md — the standardized domain research brief. */
export function buildResearchMarkdown(meta: ResearchMeta, b: ResearchBrief): string {
  const note = b.live
    ? `> Domain research via public sources, gathered by the research agent on ${meta.generatedOn}. External findings — verify before relying on them.`
    : `> Baseline research plan (no live web research in this run). Run with a model + web access to gather real reference cases and testimonials from public sources, per the \`domain-research\` playbook. Generated ${meta.generatedOn}.`;

  const cases = b.referenceCases.length
    ? b.referenceCases.map((c) => `- **${c.title}** — ${c.takeaway} _(${c.source})_`).join("\n")
    : "- _none gathered offline — run live research_";
  const testimonials = b.testimonials.length
    ? b.testimonials.map((t) => `> "${t.quote}" — ${t.source}`).join("\n\n")
    : "_none gathered offline — run live research_";

  return `# Research · ${meta.id} · ${meta.title}

${note}

## Problem class

${b.problemClass}

## Reference cases (comparable implementations)

${cases}

## Testimonials

${testimonials}

## Comparable patterns (baseline)

${listMd(b.baselinePatterns)}

## Benchmarks to find

${listMd(b.benchmarks)}

## Standards & compliance

${listMd(b.standards)}

## Common pitfalls & lessons learned

${listMd(b.pitfalls)}

## What to research (public sources)

${listMd(b.researchTargets)}

## Suggested search queries

${listMd(b.queries)}

## Sources

${listMd(b.sources)}
`;
}
