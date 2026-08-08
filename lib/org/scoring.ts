/**
 * Scoring a department section against its grammar — the same machine the process
 * self-assessment runs, pointed at the Department OS grammar in `model.ts`.
 *
 * A section is markdown. `model.ts` says what a healthy answer to it contains: an
 * owner, the load-bearing headings, a table with the columns an agent needs. This
 * module reads the markdown and reports, per weighted criterion, whether it is there
 * — so a department is not "written / not written" but scored, and the missing
 * criteria (heaviest first) are the coaching backlog.
 *
 * Two axes beyond presence, straight from the framework:
 *   • FRESHNESS (every section): `review-cadence` + `last-verified` frontmatter make
 *     ageing measurable. Past the cadence with no re-verification → stale.
 *   • VALIDITY (critical sections only): `valid-until`, `verification-method`,
 *     `source-of-truth`. `last-verified` says when someone looked; validity says
 *     whether the assumption still holds and how you'd check. An agent acting on an
 *     expired assumption does so with full conviction — so an expired critical
 *     section is surfaced, not silently trusted.
 *
 * Pure and dependency-free (a tolerant markdown reader, not a parser): unit-tested
 * without touching the content seam, and `now` is injected so freshness is testable.
 */

import { parseFrontmatter } from "../agent/frontmatter.js";
import { CORE_SECTIONS, sectionDef, type Criterion, type SectionDef } from "./model.js";

// ------------------------------------------------------------------ md reading

interface Table {
  /** Lower-cased header cells. */
  header: string[];
  /** Number of data rows (after the `---|---` separator). */
  rows: number;
}

/** The GFM pipe-tables in a body, tolerant of leading/trailing pipes and spacing. */
function tables(body: string): Table[] {
  const lines = body.split(/\r?\n/);
  const out: Table[] = [];
  for (let i = 0; i < lines.length; i++) {
    const head = lines[i]!;
    const sep = lines[i + 1] ?? "";
    // A header row followed by a `---|---` divider row is a table.
    if (head.includes("|") && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(sep) && sep.includes("-")) {
      const header = cells(head);
      let rows = 0;
      let j = i + 2;
      for (; j < lines.length; j++) {
        const row = lines[j]!;
        if (!row.includes("|") || row.trim() === "") break;
        if (cells(row).some((c) => c !== "")) rows++;
      }
      out.push({ header: header.map((c) => c.toLowerCase()), rows });
      i = j - 1;
    }
  }
  return out;
}

function cells(row: string): string[] {
  return row
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
}

/** Heading lines (`#`..`######`), text only. */
function headings(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((l) => /^#{1,6}\s+(.*)$/.exec(l)?.[1]?.trim())
    .filter((h): h is string => h !== undefined && h !== "");
}

// ------------------------------------------------------------------ criteria

function meets(c: Criterion, meta: Record<string, string | string[]>, body: string, tbls: Table[], heads: string[]): boolean {
  switch (c.type) {
    case "frontmatter": {
      const v = c.field ? meta[c.field] : undefined;
      return Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim() !== "";
    }
    case "heading": {
      const re = safeRe(c.pattern);
      // A heading, or — tolerant — a bold lead-in `**Purpose**` used as a pseudo-heading.
      return heads.some((h) => re.test(h)) || new RegExp(`\\*\\*[^*]*${bare(c.pattern)}`, "i").test(body);
    }
    case "table": {
      const re = c.pattern ? safeRe(c.pattern) : null;
      return tbls.some((t) => t.rows >= (c.minRows ?? 1) && (re ? re.test(t.header.join(" ")) : true));
    }
    case "column": {
      const re = safeRe(c.pattern);
      return tbls.some((t) => t.header.some((h) => re.test(h)));
    }
    default:
      return false;
  }
}

/**
 * Compile a criterion pattern case-insensitively. The grammar writes patterns with a
 * leading `(?i)` (readable, and how the process criteria are authored), but V8 rejects
 * inline flag groups — so strip it and hoist to the `i` flag instead.
 */
function safeRe(pattern?: string): RegExp {
  try {
    return new RegExp(bare(pattern), "i");
  } catch {
    return /.^/;
  }
}

/** Strip an inline `(?i)` flag so a pattern can be compiled or embedded in a larger regex. */
function bare(pattern?: string): string {
  return (pattern ?? ".^").replace(/^\(\?i\)/, "");
}

// ------------------------------------------------------------------ freshness

const CADENCE_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  fortnightly: 14,
  monthly: 31,
  quarterly: 93,
  quarter: 93,
  semiannual: 183,
  "half-yearly": 183,
  annual: 366,
  annually: 366,
  yearly: 366,
};

function cadenceToDays(cadence?: string): number | undefined {
  if (!cadence) return undefined;
  const key = cadence.toLowerCase().trim();
  for (const [name, days] of Object.entries(CADENCE_DAYS)) if (key.includes(name)) return days;
  const m = /(\d+)\s*(day|week|month|year)/.exec(key);
  if (m) {
    const n = Number(m[1]);
    return n * ({ day: 1, week: 7, month: 31, year: 366 }[m[2] as "day" | "week" | "month" | "year"] ?? 1);
  }
  return undefined;
}

function parseDate(s?: string): number | undefined {
  if (!s) return undefined;
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return undefined;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(t) ? undefined : t;
}

const DAY = 86_400_000;

export interface FreshnessState {
  cadence?: string;
  lastVerified?: string;
  /** Past the cadence with no re-verification, or a cadence set with nothing to check against. */
  stale: boolean;
  detail: string;
}

function freshness(meta: Record<string, string | string[]>, now: number): FreshnessState {
  const cadence = str(meta["review-cadence"]);
  const lastVerified = str(meta["last-verified"]);
  const days = cadenceToDays(cadence);
  const at = parseDate(lastVerified);
  if (!cadence) return { cadence, lastVerified, stale: false, detail: "no review cadence set" };
  if (at === undefined) return { cadence, lastVerified, stale: true, detail: `cadence “${cadence}” but no last-verified date` };
  if (days === undefined) return { cadence, lastVerified, stale: false, detail: `last verified ${lastVerified}` };
  const ageDays = Math.floor((now - at) / DAY);
  const stale = ageDays > days;
  return { cadence, lastVerified, stale, detail: stale ? `${ageDays}d since last-verified, cadence is ~${days}d` : `verified ${ageDays}d ago, within ~${days}d cadence` };
}

// ------------------------------------------------------------------ validity

export interface ValidityState {
  validUntil?: string;
  verificationMethod?: string;
  sourceOfTruth?: string;
  /** Past valid-until, or missing the fields a critical section must carry. */
  expired: boolean;
  detail: string;
}

function validity(meta: Record<string, string | string[]>, now: number): ValidityState {
  const validUntil = str(meta["valid-until"]);
  const verificationMethod = str(meta["verification-method"]);
  const sourceOfTruth = str(meta["source-of-truth"]);
  const until = parseDate(validUntil);
  if (!validUntil) return { validUntil, verificationMethod, sourceOfTruth, expired: true, detail: "critical section with no valid-until" };
  if (until !== undefined && until < now) return { validUntil, verificationMethod, sourceOfTruth, expired: true, detail: `expired ${validUntil}` };
  const missing = [!verificationMethod && "verification-method", !sourceOfTruth && "source-of-truth"].filter(Boolean);
  return {
    validUntil,
    verificationMethod,
    sourceOfTruth,
    expired: false,
    detail: missing.length ? `valid until ${validUntil}, missing ${missing.join(" & ")}` : `valid until ${validUntil}`,
  };
}

function str(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  const s = Array.isArray(v) ? v.join(", ") : v;
  return s.trim() === "" ? undefined : s;
}

// ------------------------------------------------------------------ section

export interface CriterionResult {
  label: string;
  weight: number;
  met: boolean;
}

export interface SectionScore {
  key: string;
  title: string;
  /** The section file exists with some content. */
  present: boolean;
  /** Required-weighted completeness, 0..100. */
  score: number;
  /** Excellence-weighted, 0..100 (0 when the section defines none). */
  excellence: number;
  required: CriterionResult[];
  excellenceResults: CriterionResult[];
  /** Unmet required-criterion labels, heaviest gap first — the coaching backlog. */
  missing: string[];
  /** Shown when there are gaps: the one question that surfaces the most substance. */
  coaching?: string;
  critical: boolean;
  freshness: FreshnessState;
  /** Only for critical sections. */
  validity?: ValidityState;
}

/** Score one section's markdown against its grammar. A missing/empty file scores 0. */
export function scoreSection(def: SectionDef, source: string | undefined, now: number = Date.now()): SectionScore {
  const present = typeof source === "string" && source.trim() !== "";
  const { meta, body } = parseFrontmatter(source ?? "");
  const tbls = tables(body);
  const heads = headings(body);

  const run = (list: readonly Criterion[]): CriterionResult[] =>
    list.map((c) => ({ label: c.label, weight: c.weight, met: present && meets(c, meta, body, tbls, heads) }));

  const required = run(def.required);
  const excellenceResults = run(def.excellence ?? []);

  const pct = (rs: CriterionResult[]): number => {
    const total = rs.reduce((s, r) => s + r.weight, 0);
    if (total === 0) return 0;
    return Math.round((rs.filter((r) => r.met).reduce((s, r) => s + r.weight, 0) / total) * 100);
  };

  const missing = required
    .filter((r) => !r.met)
    .sort((a, b) => b.weight - a.weight)
    .map((r) => r.label);

  return {
    key: def.key,
    title: def.title,
    present,
    score: pct(required),
    excellence: pct(excellenceResults),
    required,
    excellenceResults,
    missing,
    ...(missing.length ? { coaching: def.coaching } : {}),
    critical: def.critical === true,
    freshness: freshness(meta, now),
    ...(def.critical ? { validity: validity(meta, now) } : {}),
  };
}

// ------------------------------------------------------------------ department

export interface DepartmentScore {
  /** Mean required-completeness across the core sections, 0..100. */
  score: number;
  /** Core sections present (some content) over the core total. */
  corePresent: number;
  coreTotal: number;
  sections: SectionScore[];
  /** Critical sections that are stale or expired — an agent must not trust these. */
  criticalStale: string[];
}

/**
 * Score a whole department from its core section files: `{ charter: "<md>", … }`.
 * Sections absent from the map score 0 and count as gaps — the point of the map is
 * to show what a department has NOT written yet.
 */
export function scoreDepartment(core: readonly SectionDef[], files: Record<string, string | undefined>, now: number = Date.now()): DepartmentScore {
  const sections = core.map((def) => scoreSection(def, files[def.key], now));
  const corePresent = sections.filter((s) => s.present).length;
  const score = sections.length === 0 ? 0 : Math.round(sections.reduce((s, x) => s + x.score, 0) / sections.length);
  const criticalStale = sections
    .filter((s) => s.critical && s.present && (s.freshness.stale || s.validity?.expired))
    .map((s) => s.key);
  return { score, corePresent, coreTotal: sections.length, sections, criticalStale };
}

/** Convenience: score by section key against the core grammar (unknown keys ignored). */
export function scoreByKey(files: Record<string, string | undefined>, now: number = Date.now()): DepartmentScore {
  return scoreDepartment(CORE_SECTIONS, files, now);
}

export { sectionDef };
