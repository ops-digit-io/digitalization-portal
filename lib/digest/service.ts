/**
 * Review-digest service — read the funnel, apply the pure rules, group for humans.
 *
 * `loadDigestDemands` gathers the facts the rules need from git (the read model +
 * each README's `## People` / review date); `buildDigest` runs `selectDigestItems`
 * and shapes the result for the page and the email notifier. The grouping/summary
 * helpers are pure and unit-tested; the loader is thin IO glue.
 */

import { getFunnelRows } from "../funnel/query.js";
import { readDemand, readArtifact } from "../demands-store.js";
import { parseUseCase, parsePeople } from "../parse.js";
import { mapPool } from "../pool.js";
import { selectDigestItems, type DigestDemand, type DigestItem, type DigestReason, type Severity } from "./rules.js";

const FETCH_CONCURRENCY = 8;

export interface DigestPerson {
  person: string;
  /** The person's email, when the stored value is one (else a name → team-only). */
  email?: string;
  items: DigestItem[];
}

export interface DigestSummary {
  flagged: number;
  bySeverity: Record<Severity, number>;
  byReason: Record<DigestReason, number>;
}

export interface Digest {
  generatedAt: string;
  items: DigestItem[];
  byPerson: DigestPerson[];
  summary: DigestSummary;
}

/** Pull the business case's "Review on: YYYY-MM-DD" date, if present. */
function parseReviewOn(businessCaseMd: string): string | undefined {
  const m = /review on[:*\s]+([0-9]{4}-[0-9]{2}-[0-9]{2})/i.exec(businessCaseMd.replace(/\*/g, ""));
  return m?.[1];
}

/** Gather the per-demand facts the rules need, from the funnel + each README. */
export async function loadDigestDemands(baseDir?: string): Promise<DigestDemand[]> {
  const { rows } = await getFunnelRows();
  return mapPool(rows, FETCH_CONCURRENCY, async (row): Promise<DigestDemand> => {
    const md = await readDemand(row.id, baseDir).catch(() => undefined);
    let people: DigestDemand["people"] = {};
    let reviewOn: string | undefined;
    if (md) {
      people = parsePeople(md);
      reviewOn = parseUseCase(md).state.reviewOn;
    }
    if (!reviewOn) {
      const bc = await readArtifact(row.id, "business-case", baseDir).catch(() => undefined);
      if (bc) reviewOn = parseReviewOn(bc);
    }
    return {
      id: row.id,
      title: row.title,
      ...(row.stage ? { stage: row.stage } : {}),
      ...(row.lane ? { lane: row.lane } : {}),
      ...(row.plant ? { plant: row.plant } : {}),
      ...(row.status ? { status: row.status } : {}),
      ...(row.since ? { since: row.since } : {}),
      ...(row.needsAttention ? { needsAttention: true } : {}),
      ...(reviewOn ? { reviewOn } : {}),
      people,
    };
  });
}

/** Group flagged items by each accountable person (a demand appears under each). Pure. */
export function groupByPerson(items: readonly DigestItem[]): DigestPerson[] {
  const map = new Map<string, DigestPerson>();
  for (const item of items) {
    for (const a of item.accountable) {
      const key = a.person.toLowerCase();
      let entry = map.get(key);
      if (!entry) {
        entry = { person: a.person, ...(a.person.includes("@") ? { email: a.person } : {}), items: [] };
        map.set(key, entry);
      }
      entry.items.push(item);
    }
  }
  return [...map.values()].sort((x, y) => y.items.length - x.items.length);
}

/** Portfolio counts across the flagged items. Pure. */
export function summarize(items: readonly DigestItem[]): DigestSummary {
  const bySeverity: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
  const byReason: Record<DigestReason, number> = { stalled: 0, past_review: 0, missing_owner: 0, drift: 0, parked_overdue: 0 };
  for (const item of items) {
    bySeverity[item.severity]++;
    for (const r of item.reasons) byReason[r]++;
  }
  return { flagged: items.length, bySeverity, byReason };
}

/** Build the full digest: read git, apply rules, group + summarize. */
export async function buildDigest(nowIso: string, opts?: { baseDir?: string }): Promise<Digest> {
  const demands = await loadDigestDemands(opts?.baseDir);
  const items = selectDigestItems(demands, nowIso);
  return { generatedAt: nowIso, items, byPerson: groupByPerson(items), summary: summarize(items) };
}
