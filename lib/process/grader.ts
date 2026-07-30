/**
 * Grades a filled-in section artefact against its schema. Ported verbatim from
 * PDT (`backend/services/grader.js`).
 *
 * The grader is deliberately dumb and literal. It matches STRUCTURE, not meaning.
 * It cannot tell whether an answer is TRUE — only whether the author was forced to
 * write something in the right place. That limitation is the point: a grader that
 * pretends to judge substance invites people to write for the grader.
 */

export type RuleType = "heading" | "minWords" | "table" | "field" | "noPlaceholder";

export interface SchemaRule {
  type: RuleType;
  weight: number;
  pattern?: string;
  count?: number;
  minRows?: number;
  label?: string;
}

export interface SectionSchema {
  required?: SchemaRule[];
  excellence?: SchemaRule[];
}

export interface GradeResult {
  score: number;
  required: number;
  excellence: number;
  met: { bucket: string; rule: SchemaRule }[];
  missed: { bucket: string; rule: SchemaRule }[];
  invalid: { bucket: string; rule: SchemaRule; reason: string }[];
  wordCount: number;
}

const RULE_TYPES: RuleType[] = ["heading", "minWords", "table", "field", "noPlaceholder"];

/**
 * Compile a schema pattern. Schemas are authored with the inline
 * case-insensitivity syntax from Python and PCRE, in both spellings: the `(?i)`
 * prefix and the `(?i:…)` group. JavaScript supports neither and throws on both,
 * which is how a pattern silently stops matching. Normalise both.
 */
export function compile(pattern: string): RegExp {
  const src = String(pattern);
  const hasInline = /\(\?i[):]/.test(src);
  if (!hasInline) return new RegExp(src);
  return new RegExp(src.replace(/\(\?i\)/g, "").replace(/\(\?i:/g, "(?:"), "i");
}

// Placeholders the templates ship with. The bracket rule excludes markdown links
// (`[text](url)`, `[text][ref]`) so an artefact does not lose points for citing a
// source — precisely backwards for a method built on evidence.
const PLACEHOLDER_RE =
  /((?<!\])\[[^\]\n]{2,80}\](?![([])|\bTBD\b|\bTODO\b|\bXXX\b|<[a-z-]{3,30}>)/gi;

/** Headings (#..######) and bold-only lines both count as a heading. */
export function headings(md: string): string[] {
  const out: string[] = [];
  for (const line of md.split("\n")) {
    const h = line.match(/^\s{0,3}#{1,6}\s+(.*\S)\s*$/);
    if (h) {
      out.push(h[1]!);
      continue;
    }
    const b = line.match(/^\s*\*\*(.+?)\*\*\s*:?\s*$/);
    if (b) out.push(b[1]!);
  }
  return out;
}

/** Markdown tables, returned as their number of data rows. */
export function tables(md: string): number[] {
  const lines = md.split("\n");
  const sizes: number[] = [];
  let i = 0;
  while (i < lines.length) {
    if (/^\s*\|.*\|\s*$/.test(lines[i]!) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || "")) {
      let rows = 0;
      let j = i + 2;
      while (j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j]!)) {
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
 * A labelled field whose value must exist and must not be a placeholder. Both
 * markdown spellings are accepted: `**Label**: value` and `**Label:** value`.
 */
export function fields(md: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  const re = /^\s*(?:[-*]\s*)?\*\*(.+?):?\s*\*\*\s*:?\s*(.*)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    const label = m[1]!.trim();
    const value = m[2]!.trim();
    const filled = value.length > 0 && !PLACEHOLDER_RE.test(value);
    PLACEHOLDER_RE.lastIndex = 0;
    if (!(label in out) || (!out[label] && filled)) out[label] = filled;
  }
  return out;
}

export function words(md: string): number {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[|#>*_`-]/g, " ")
    .split(/\s+/)
    .filter((w) => /[A-Za-zÄÖÜäöüß0-9]/.test(w)).length;
}

interface Ctx {
  headings: string[];
  tables: number[];
  fields: Record<string, boolean>;
  words: number;
}

function ruleMet(rule: SchemaRule, md: string, ctx: Ctx): boolean {
  switch (rule.type) {
    case "heading": {
      const re = compile(rule.pattern!);
      return ctx.headings.some((h) => re.test(h));
    }
    case "minWords":
      return ctx.words >= (rule.count ?? 0);
    case "table":
      return ctx.tables.some((rows) => rows >= (rule.minRows || 1));
    case "field": {
      const re = compile(rule.pattern!);
      return Object.entries(ctx.fields).some(([label, filled]) => filled && re.test(label));
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
 * @returns score 0..100 (capped — the excellence bonus can lift a weak required
 * block but never past 100); required is 0..100 on the required block alone, which
 * is what a gate reads.
 */
export function grade(markdown: string, schema: SectionSchema): GradeResult {
  const md = String(markdown || "");
  const ctx: Ctx = { headings: headings(md), tables: tables(md), fields: fields(md), words: words(md) };

  const met: GradeResult["met"] = [];
  const missed: GradeResult["missed"] = [];
  const invalid: GradeResult["invalid"] = [];

  const run = (rules: SchemaRule[] | undefined, bucket: string): number => {
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

/** Static check of a schema itself — run at load so a broken schema is loud. */
export function validateSchema(schema: SectionSchema | null | undefined, key: string): string[] {
  const errs: string[] = [];
  if (!schema || typeof schema !== "object") return [`${key}: not an object`];
  if (!Array.isArray(schema.required) || !schema.required.length) errs.push(`${key}: no required rules`);
  const sum = (schema.required || []).reduce((a, r) => a + (Number(r.weight) || 0), 0);
  if (Math.round(sum) !== 100) errs.push(`${key}: required weights sum to ${sum}, expected 100`);
  const exc = (schema.excellence || []).reduce((a, r) => a + (Number(r.weight) || 0), 0);
  if (exc > 40) errs.push(`${key}: excellence weights sum to ${exc}, max 40`);
  for (const r of [...(schema.required || []), ...(schema.excellence || [])]) {
    if (!RULE_TYPES.includes(r.type)) errs.push(`${key}: unknown rule type "${r.type}"`);
    if (r.pattern) {
      try {
        compile(r.pattern);
      } catch (e) {
        errs.push(`${key}: bad regex ${r.pattern} (${(e as Error).message})`);
      }
    }
  }
  return errs;
}

export { RULE_TYPES };
