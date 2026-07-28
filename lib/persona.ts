/**
 * The Persona Analyst — a REQUESTOR-centric screening of demand.
 *
 * Where the requirements Analyst analyses a single use case, the Persona Analyst
 * looks across everything a requestor has raised and builds a longitudinal, service-
 * oriented understanding of that person's WORK: the area of the business they operate
 * in, the jobs and daily workflows their demands describe, the kinds of digital
 * solution they tend to need, and — descriptively — how they frame demands. The point
 * is to SERVE them: to help the Digital Unit meet a requestor where they are and
 * propose the right digitalization, and to see aggregate COHORT patterns across
 * requestor groups.
 *
 * Ethics are load-bearing here, and encoded in the shape of the output, not just the
 * docs (`playbooks/persona-analysis.md`):
 *   - DESCRIPTIVE, never evaluative. Maturity is reported as facts ("quantifies impact
 *     in 3 of 5 demands"), never a score or grade.
 *   - NO individual ranking, scoring, or comparison. There is deliberately no
 *     "engagement score" and no "top requestors" ordering by volume.
 *   - Cohort insight is AGGREGATE across a group, never a way to single a person out.
 *   - A requestor is the subject and beneficiary of their own profile (transparency).
 *
 * These builders are PURE and deterministic (dates are passed in). The loader at the
 * bottom is the only IO.
 */

import type { DemandAnswers } from "./demand.js";
import { parseDemandToAnswers } from "./demand.js";
import { classifyArchetype } from "./usecase-archetypes.js";
import { listDemandIds, readDemand } from "./demands-store.js";
import { parseUseCase, parsePeople } from "./parse.js";
import { mapPool } from "./pool.js";

/** One demand, reduced to what a requestor-centric screening needs. */
export interface RequestorDemandRecord {
  id: string;
  title: string;
  /** Requester as written on the demand (email or name). */
  requester: string;
  createdOn?: string;
  domain?: string;
  plant?: string;
  lane?: string;
  stage?: string;
  status?: string;
  /** The captured intake answers — the text the workflow/theme reading draws on. */
  answers: DemandAnswers;
}

/** A counted share of a categorical dimension (domain, lane, archetype…). */
export interface Share {
  key: string;
  count: number;
  /** Fraction of the whole, 0..1. */
  share: number;
}

/** A descriptive maturity FACT — never a score. */
export interface MaturitySignal {
  label: string;
  detail: string;
}

export interface RequestorProfile {
  /** Display identifier (first-seen spelling of the requester). */
  requester: string;
  demandCount: number;
  firstSeen?: string;
  lastSeen?: string;
  /** Role & domain focus. */
  domains: Share[];
  plants: Share[];
  lanes: Share[];
  /** Solution-archetype needs. */
  archetypes: Share[];
  /** Jobs & daily workflows: recurring themes and the processes they name. */
  themes: string[];
  workflows: string[];
  /** Digitalization maturity — descriptive facts, not a grade. */
  maturity: MaturitySignal[];
  /** The demands behind the profile (their own contributions). */
  demands: { id: string; title: string; archetype: string; domain?: string; createdOn?: string; status?: string }[];
}

/** An AGGREGATE pattern across a requestor cohort — never names or ranks a person. */
export interface CohortPattern {
  dimension: "domain" | "lane" | "plant";
  key: string;
  /** Distinct requestors in this cohort (a count, not a list of names). */
  requestorCount: number;
  demandCount: number;
  /** Which solution shapes this cohort tends to need. */
  topArchetypes: Share[];
  /** Recurring themes across the cohort. */
  topThemes: string[];
}

// ── helpers ────────────────────────────────────────────────────────────────────

/** Grouping key for a requester — case/space-insensitive; display keeps the original. */
export function normalizeRequester(r: string): string {
  return r.trim().toLowerCase();
}

function clean(s: string | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}
function hasNumber(s: string | undefined): boolean {
  return /\d/.test(s ?? "");
}

/** Count occurrences of a key across records; return shares sorted by count then key. */
function distribution(keys: (string | undefined)[]): Share[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const raw of keys) {
    const k = clean(raw);
    if (k === "") continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
    total++;
  }
  if (total === 0) return [];
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count, share: count / total }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

// A compact English stopword set — enough to surface the meaningful nouns/verbs.
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for", "with", "at", "by",
  "from", "as", "is", "are", "was", "were", "be", "been", "being", "it", "its", "this",
  "that", "these", "those", "we", "our", "us", "they", "them", "their", "i", "you", "your",
  "he", "she", "his", "her", "not", "no", "yes", "can", "cannot", "will", "would", "should",
  "could", "may", "might", "must", "do", "does", "did", "done", "have", "has", "had", "so",
  "if", "then", "than", "when", "where", "which", "who", "what", "how", "why", "there", "here",
  "all", "any", "some", "more", "most", "much", "many", "few", "each", "every", "per", "into",
  "out", "up", "down", "over", "under", "about", "after", "before", "between", "because",
  "only", "also", "just", "very", "too", "such", "same", "other", "one", "two", "get", "got",
  "need", "needs", "want", "wants", "like", "make", "made", "using", "use", "used", "currently",
  "today", "still", "often", "sometimes", "always", "never", "problem", "issue", "process",
  "time", "data", "system", "systems",
]);

/** Top recurring terms across a set of texts. Deterministic: count desc, then alpha.
 *  A term must appear in at least `minDocs` distinct texts to count as recurring. */
function recurringTerms(texts: string[], opts: { top: number; minDocs: number }): string[] {
  const docFreq = new Map<string, number>();
  const totalFreq = new Map<string, number>();
  for (const text of texts) {
    const seen = new Set<string>();
    for (const rawTok of text.toLowerCase().split(/[^a-z0-9]+/)) {
      const tok = rawTok.trim();
      if (tok.length < 4 || STOPWORDS.has(tok) || /^\d+$/.test(tok)) continue;
      totalFreq.set(tok, (totalFreq.get(tok) ?? 0) + 1);
      if (!seen.has(tok)) { docFreq.set(tok, (docFreq.get(tok) ?? 0) + 1); seen.add(tok); }
    }
  }
  return [...totalFreq.entries()]
    .filter(([tok]) => (docFreq.get(tok) ?? 0) >= opts.minDocs)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, opts.top)
    .map(([tok]) => tok);
}

function textOf(a: DemandAnswers): string {
  return [a.title, a.problem, a.currentPain, a.desiredOutcome, a.affectedProcess, a.frequencyScale, a.constraints].join(" \n ");
}

// ── profile ──────────────────────────────────────────────────────────────────

/**
 * Build one requestor's service profile from their own demands. Pure; `records`
 * should be exactly the demands raised by this requestor. When several spellings of
 * the requester appear, the first record's spelling is the display name.
 */
export function buildRequestorProfile(records: RequestorDemandRecord[]): RequestorProfile {
  const requester = records[0]?.requester ?? "unknown";
  const dates = records.map((r) => clean(r.createdOn)).filter((d) => d !== "").sort();

  const archetypeOf = (r: RequestorDemandRecord) => classifyArchetype(r.answers);

  const domains = distribution(records.map((r) => r.domain));
  const plants = distribution(records.map((r) => r.plant));
  const lanes = distribution(records.map((r) => r.lane));
  const archetypes = distribution(records.map((r) => archetypeOf(r).label));

  const minDocs = records.length >= 3 ? 2 : 1;
  const themes = recurringTerms(records.map((r) => textOf(r.answers)), { top: 12, minDocs });
  // Workflows: the distinct processes they name at intake — literally the daily work.
  const workflows = [...new Set(records.map((r) => clean(r.answers.affectedProcess)).filter((p) => p !== ""))];

  const m = records.length;
  const quantifies = records.filter((r) => hasNumber(r.answers.currentPain)).length;
  const namesProcess = records.filter((r) => clean(r.answers.affectedProcess) !== "").length;
  const statesFrequency = records.filter((r) => clean(r.answers.frequencyScale) !== "").length;
  const progressed = records.filter((r) => r.stage && r.stage !== "S1").length;
  const maturity: MaturitySignal[] = [
    { label: "Quantifies impact", detail: `Includes a baseline figure in ${quantifies} of ${m} demands.` },
    { label: "Names the process", detail: `Identifies the affected process/owner in ${namesProcess} of ${m} demands.` },
    { label: "States frequency & scale", detail: `Gives frequency or scale in ${statesFrequency} of ${m} demands.` },
    { label: "Breadth", detail: `Spans ${domains.length} domain(s) across ${plants.length} plant(s).` },
    { label: "Progression", detail: `${progressed} of ${m} demands have moved past intake (S1).` },
  ];

  const demands = records
    .map((r) => ({
      id: r.id,
      title: r.title,
      archetype: archetypeOf(r).label,
      ...(r.domain ? { domain: r.domain } : {}),
      ...(r.createdOn ? { createdOn: r.createdOn } : {}),
      ...(r.status ? { status: r.status } : {}),
    }))
    .sort((a, b) => (b.createdOn ?? "").localeCompare(a.createdOn ?? "") || a.id.localeCompare(b.id));

  return {
    requester,
    demandCount: m,
    ...(dates[0] ? { firstSeen: dates[0] } : {}),
    ...(dates[dates.length - 1] ? { lastSeen: dates[dates.length - 1] } : {}),
    domains,
    plants,
    lanes,
    archetypes,
    themes,
    workflows,
    maturity,
    demands,
  };
}

/** Group all records by requester (normalized), preserving the display spelling. */
export function groupByRequester(records: RequestorDemandRecord[]): Map<string, RequestorDemandRecord[]> {
  const groups = new Map<string, RequestorDemandRecord[]>();
  for (const r of records) {
    const key = normalizeRequester(r.requester);
    if (key === "") continue;
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }
  return groups;
}

/** A directory entry — descriptive context, deliberately NOT ordered by volume. */
export interface RequestorDirectoryEntry {
  requester: string;
  demandCount: number;
  topDomain?: string;
  topArchetype?: string;
  lastSeen?: string;
}

/**
 * List the requestors present in the records, sorted ALPHABETICALLY (never by demand
 * count — this is a directory, not a leaderboard). Each entry carries light context.
 */
export function listRequestorDirectory(records: RequestorDemandRecord[]): RequestorDirectoryEntry[] {
  const groups = groupByRequester(records);
  const out: RequestorDirectoryEntry[] = [];
  for (const list of groups.values()) {
    const p = buildRequestorProfile(list);
    out.push({
      requester: p.requester,
      demandCount: p.demandCount,
      ...(p.domains[0] ? { topDomain: p.domains[0].key } : {}),
      ...(p.archetypes[0] ? { topArchetype: p.archetypes[0].key } : {}),
      ...(p.lastSeen ? { lastSeen: p.lastSeen } : {}),
    });
  }
  return out.sort((a, b) => a.requester.localeCompare(b.requester));
}

// ── cohorts (aggregate only) ────────────────────────────────────────────────────

/**
 * Aggregate patterns across requestor cohorts for a dimension (domain / lane / plant).
 * Reports, per cohort value, how many DISTINCT requestors and demands it has and which
 * solution shapes and themes recur — never naming or ranking an individual. A cohort
 * with only one requestor is dropped, so no pattern can single a person out.
 */
export function buildCohortPatterns(
  records: RequestorDemandRecord[],
  dimension: "domain" | "lane" | "plant",
): CohortPattern[] {
  const byValue = new Map<string, RequestorDemandRecord[]>();
  for (const r of records) {
    const v = clean(r[dimension]);
    if (v === "") continue;
    const list = byValue.get(v);
    if (list) list.push(r);
    else byValue.set(v, [r]);
  }

  const patterns: CohortPattern[] = [];
  for (const [key, list] of byValue.entries()) {
    const requestors = new Set(list.map((r) => normalizeRequester(r.requester)).filter((x) => x !== ""));
    // Privacy floor: a cohort must contain at least two distinct requestors to appear,
    // so an aggregate can never be a single identifiable person.
    if (requestors.size < 2) continue;
    patterns.push({
      dimension,
      key,
      requestorCount: requestors.size,
      demandCount: list.length,
      topArchetypes: distribution(list.map((r) => classifyArchetype(r.answers).label)).slice(0, 3),
      topThemes: recurringTerms(list.map((r) => textOf(r.answers)), { top: 6, minDocs: 2 }),
    });
  }
  // Order cohorts by size (of the GROUP, not of any person) then name — stable.
  return patterns.sort((a, b) => b.demandCount - a.demandCount || a.key.localeCompare(b.key));
}

// ── loader (the only IO) ────────────────────────────────────────────────────────

const FETCH_CONCURRENCY = 8;

/**
 * Read every demand in the funnel and reduce it to a `RequestorDemandRecord`. One
 * bounded-concurrency pass (no serial N+1). Demands with no named requester are
 * skipped — there is no one to attribute them to. This is the only IO in the module;
 * the builders above are pure. Callers filter the records by what the viewer may see
 * (own demands, or all for a `view_all` holder) before building profiles.
 */
export async function loadRequestorRecords(baseDir?: string): Promise<RequestorDemandRecord[]> {
  const ids = await listDemandIds(baseDir);
  const records = await mapPool(ids, FETCH_CONCURRENCY, async (id): Promise<RequestorDemandRecord | null> => {
    const md = await readDemand(id, baseDir);
    if (md === undefined) return null;
    const people = parsePeople(md);
    const requester = clean(people.requester);
    if (requester === "") return null; // nobody to attribute this demand to
    const p = parseUseCase(md);
    const answers = parseDemandToAnswers(md);
    return {
      id,
      title: answers.title || id,
      requester,
      ...(p.state.created ? { createdOn: p.state.created } : {}),
      ...(p.state.domain ? { domain: p.state.domain } : {}),
      ...(p.state.plant ? { plant: p.state.plant } : {}),
      ...(p.state.lane ? { lane: p.state.lane } : {}),
      ...(p.state.stage ? { stage: p.state.stage } : {}),
      ...(p.state.status ? { status: p.state.status } : {}),
      answers,
    };
  });
  return records.filter((r): r is RequestorDemandRecord => r !== null);
}

/** Keep only the records a viewer may see: their own, or everything for `view_all`. */
export function visibleRecords(records: RequestorDemandRecord[], user: string, viewAll: boolean): RequestorDemandRecord[] {
  if (viewAll) return records;
  const me = normalizeRequester(user);
  return records.filter((r) => normalizeRequester(r.requester) === me);
}
