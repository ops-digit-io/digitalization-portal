// Grades a filled-in section artefact against its schema.
//
// The mechanic is the Brand Portal's: a `required` block whose weights sum to 100
// and act as the gate, plus an `excellence` block that pays a bonus on top. What
// differs: this grader is deliberately dumb and literal. It matches structure, not
// meaning. It cannot tell whether an answer is TRUE — only whether the author was
// forced to write something in the right place.
//
// That limitation is the point. A grader that pretends to judge substance invites
// people to write for the grader. This one says: you claimed a latency figure and
// named its source, or you did not.
//
// Ported from the source tool's `backend/services/grader.js`; the algorithm, the
// scoring maths and the result shape are unchanged.

import type { SchemaRule } from "./schemas";

export const RULE_TYPES: readonly string[] = [
  "heading",
  "minWords",
  "table",
  "field",
  "noPlaceholder",
];

/** Which half of the schema a rule came from. */
export type Bucket = "required" | "excellence";

/** A rule that was evaluated, tagged with the block it came from. */
export interface RuleOutcome {
  bucket: Bucket;
  rule: SchemaRule;
}

/** A rule that could not be evaluated at all, with the reason why. */
export interface InvalidRule extends RuleOutcome {
  reason: string;
}

/** The minimum a schema has to offer to be gradable. */
export interface GradableSchema {
  required?: readonly SchemaRule[];
  excellence?: readonly SchemaRule[];
}

export interface GradeResult {
  /**
   * 0..100, capped — the excellence bonus can lift a weak required block,
   * but never past 100, so "complete" still means complete.
   */
  score: number;
  /** 0..100 on the required block alone. This is what a gate reads. */
  required: number;
  excellence: number;
  met: RuleOutcome[];
  missed: RuleOutcome[];
  invalid: InvalidRule[];
  wordCount: number;
}

/** Everything parsed out of the markdown once, so each rule can be cheap. */
interface GradeContext {
  headings: string[];
  tables: number[];
  fields: Record<string, boolean>;
  words: number;
}

/**
 * Compile a schema pattern.
 *
 * Schemas are authored with the inline case-insensitivity syntax from Python and
 * PCRE, in both of its spellings: the `(?i)` prefix and the `(?i:…)` group.
 * JavaScript supports neither and throws "Invalid group" on both, which is how
 * every pattern in a schema silently stops matching and the section can never
 * score above zero.
 *
 * Rather than accept one spelling and break on the other, normalise both:
 *   `(?i)`  → removed entirely
 *   `(?i:`  → `(?:`  — an ordinary non-capturing group, so the group structure
 *                      and every back-reference position survive untouched
 * and compile the whole pattern case-insensitively, which is what the author
 * meant in either spelling.
 *
 * The `(?i)` half of this matches the Brand Portal's qualityService on purpose —
 * the schemas are meant to stay portable between the two portals.
 */
export function compile(pattern: unknown): RegExp {
  const src = String(pattern);
  const hasInline = /\(\?i[):]/.test(src);
  if (!hasInline) return new RegExp(src);
  return new RegExp(src.replace(/\(\?i\)/g, "").replace(/\(\?i:/g, "(?:"), "i");
}

// Placeholders the templates ship with. If these survive into the artefact, the
// section was not filled in — it was submitted.
//
// The bracket rule has to be careful, because square brackets are also ordinary
// markdown. `[text](url)` is a link and `[text][ref]` is a reference link; both
// are legitimate content and neither is a placeholder. Penalising them would mean
// an artefact loses points for citing its source, which is precisely backwards for
// a method built on evidence. The negative lookahead excludes both.
// The lookbehind covers the second half of a reference link: in `[text][ref]` the
// label `[ref]` is not a placeholder either, and it is only recognisable by what
// precedes it.
const PLACEHOLDER_RE =
  /((?<!\])\[[^\]\n]{2,80}\](?![([])|\bTBD\b|\bTODO\b|\bXXX\b|<[a-z-]{3,30}>)/gi;

/** Headings (#..######) and bold-only lines both count as a heading. */
export function headings(md: string): string[] {
  const out: string[] = [];
  for (const line of md.split("\n")) {
    const h = line.match(/^\s{0,3}#{1,6}\s+(.*\S)\s*$/);
    if (h) {
      if (h[1] !== undefined) out.push(h[1]);
      continue;
    }
    const b = line.match(/^\s*\*\*(.+?)\*\*\s*:?\s*$/);
    if (b && b[1] !== undefined) out.push(b[1]);
  }
  return out;
}

/** Markdown tables, returned as their number of data rows (header + separator excluded). */
export function tables(md: string): number[] {
  const lines = md.split("\n");
  const sizes: number[] = [];
  let i = 0;
  while (i < lines.length) {
    if (
      /^\s*\|.*\|\s*$/.test(lines[i] ?? "") &&
      /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || "")
    ) {
      let rows = 0;
      let j = i + 2;
      while (j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j] ?? "")) {
        rows++;
        j++;
      }
      sizes.push(rows);
      i = j;
    } else i++;
  }
  return sizes;
}

/**
 * A labelled field whose value must exist and must not be a placeholder. This is
 * how a real number is forced where a real number is owed.
 *
 * Both markdown spellings are accepted:
 *   - **Label**: value     colon outside the bold
 *   - **Label:** value     colon inside the bold
 * They look identical when rendered, so authors mix them without noticing. A
 * grader that took only one would score the other at zero — silently, because a
 * field that is never seen looks exactly like a field that was never filled in.
 * That is the same silent-failure class as the rejected inline regex flags, and
 * it is worth one extra alternation to close it for good.
 */
export function fields(md: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  const re = /^\s*(?:[-*]\s*)?\*\*(.+?):?\s*\*\*\s*:?\s*(.*)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    const label = (m[1] ?? "").trim();
    const value = (m[2] ?? "").trim();
    const filled = value.length > 0 && !PLACEHOLDER_RE.test(value);
    PLACEHOLDER_RE.lastIndex = 0;
    // First occurrence wins; a later empty repeat should not erase a filled one.
    if (!(label in out) || (!out[label] && filled)) out[label] = filled;
  }
  return out;
}

export function words(md: string): number {
  return md
    .replace(/```[\s\S]*?```/g, " ") // code fences do not count as prose
    .replace(/[|#>*_`-]/g, " ")
    .split(/\s+/)
    .filter((w) => /[A-Za-zÄÖÜäöüß0-9]/.test(w)).length;
}

function ruleMet(rule: SchemaRule, md: string, ctx: GradeContext): boolean {
  switch (rule.type) {
    case "heading": {
      const re = compile(rule.pattern);
      return ctx.headings.some((h) => re.test(h));
    }
    case "minWords": {
      // A missing `count` compares as NaN and therefore never passes, exactly as
      // the untyped original did.
      const count = typeof rule.count === "number" ? rule.count : Number.NaN;
      return ctx.words >= count;
    }
    case "table":
      return ctx.tables.some((rows) => rows >= (rule.minRows || 1));
    case "field": {
      const re = compile(rule.pattern);
      return Object.entries(ctx.fields).some(
        ([label, filled]) => filled && re.test(label),
      );
    }
    case "noPlaceholder": {
      PLACEHOLDER_RE.lastIndex = 0;
      const hit = PLACEHOLDER_RE.test(md);
      PLACEHOLDER_RE.lastIndex = 0;
      return !hit;
    }
    default:
      return false;
  }
}

/**
 * Score one section's markdown against its schema.
 *
 * `score` is 0..100, capped — the excellence bonus can lift a weak required
 * block, but never past 100, so "complete" still means complete.
 * `required` is 0..100 on the required block alone. This is what a gate reads.
 */
export function grade(
  markdown: string | null | undefined,
  schema: GradableSchema,
): GradeResult {
  const md = String(markdown || "");
  const ctx: GradeContext = {
    headings: headings(md),
    tables: tables(md),
    fields: fields(md),
    words: words(md),
  };

  const met: RuleOutcome[] = [];
  const missed: RuleOutcome[] = [];
  const invalid: InvalidRule[] = [];

  const run = (rules: readonly SchemaRule[] | undefined, bucket: Bucket): number => {
    let got = 0;
    for (const rule of rules || []) {
      if (!RULE_TYPES.includes(rule.type)) {
        invalid.push({ bucket, rule, reason: `unknown rule type "${rule.type}"` });
        continue;
      }
      const w = Number(rule.weight) || 0;
      if (ruleMet(rule, md, ctx)) {
        got += w;
        met.push({ bucket, rule });
      } else missed.push({ bucket, rule });
    }
    return got;
  };

  const required = run(schema.required, "required");
  const excellence = run(schema.excellence, "excellence");

  return {
    score: Math.min(100, Math.round(required + excellence)),
    required: Math.round(required),
    excellence: Math.round(excellence),
    met,
    missed,
    invalid,
    wordCount: ctx.words,
  };
}

/**
 * Static check of a schema itself — run at boot so a broken schema is loud on
 * startup instead of silently scoring everything zero.
 */
export function validateSchema(schema: unknown, key: string): string[] {
  const errs: string[] = [];
  if (!schema || typeof schema !== "object") return [`${key}: not an object`];
  const s = schema as GradableSchema;
  if (!Array.isArray(s.required) || !s.required.length) errs.push(`${key}: no required rules`);
  const sum = (s.required || []).reduce((a, r) => a + (Number(r.weight) || 0), 0);
  if (Math.round(sum) !== 100) errs.push(`${key}: required weights sum to ${sum}, expected 100`);
  const exc = (s.excellence || []).reduce((a, r) => a + (Number(r.weight) || 0), 0);
  if (exc > 40) errs.push(`${key}: excellence weights sum to ${exc}, max 40`);
  for (const r of [...(s.required || []), ...(s.excellence || [])]) {
    if (!RULE_TYPES.includes(r.type)) errs.push(`${key}: unknown rule type "${r.type}"`);
    if (r.pattern) {
      try {
        compile(r.pattern);
      } catch (e) {
        errs.push(`${key}: bad regex ${r.pattern} (${e instanceof Error ? e.message : String(e)})`);
      }
    }
  }
  return errs;
}
