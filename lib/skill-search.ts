/**
 * Search the Agent Skills ecosystem to build a baseline library.
 *
 * Queries the SkillsMP marketplace API (https://skillsmp.com/docs/api) and maps
 * each hit to an importable reference (a github URL, an `owner/repo@skill`, or an
 * `npx skills add …` command) that the existing importer resolves and pulls into
 * the registry — WITH its whole bundle. Search only surfaces candidates; nothing
 * is imported until a human picks it (AI drafts, humans decide).
 *
 * The result schema isn't contractually fixed, so extraction is DEFENSIVE: we
 * scan each hit for a GitHub source / install command rather than assuming field
 * names, and skip hits we can't resolve. An optional SKILLSMP_API_KEY raises the
 * rate limit; anonymous search works without one.
 */

export interface SkillHit {
  name: string;
  description?: string;
  /** An importable reference for /api/registry/import (owner/repo@skill | url | npx cmd). */
  reference: string;
  /** A human-facing source link, when known. */
  source?: string;
}

const GH_URL = /^https:\/\/(github\.com|raw\.githubusercontent\.com|gist\.githubusercontent\.com)\//i;
const OWNER_REPO = /^[\w.-]+\/[\w.-]+$/;
const REPO_KEYS = new Set(["repo", "repository", "github", "githubrepo", "github_repo", "source", "fullname", "full_name", "slug"]);
const SKILL_KEYS = new Set(["skill", "skillname", "skill_name", "skillslug", "skill_slug"]);
const NAME_KEYS = new Set(["name", "title", "displayname", "display_name"]);
const DESC_KEYS = new Set(["description", "summary", "desc", "tagline"]);

/** Visit every string value in a JSON value with its (lowercased) key. */
function walkStrings(value: unknown, visit: (key: string, val: string) => void, key = ""): void {
  if (value == null) return;
  if (typeof value === "string") { visit(key.toLowerCase(), value); return; }
  if (Array.isArray(value)) { for (const v of value) walkStrings(v, visit, key); return; }
  if (typeof value === "object") { for (const [k, v] of Object.entries(value)) walkStrings(v, visit, k); }
}

/** Best importable reference for one hit, or undefined if none can be found. */
export function extractReference(hit: unknown): string | undefined {
  let installCmd: string | undefined;
  let githubUrl: string | undefined;
  let repoRef: string | undefined;
  let skill: string | undefined;

  walkStrings(hit, (key, val) => {
    const v = val.trim();
    if (!installCmd && /(^|\s)skills\s+(add|install)\s+/i.test(v)) installCmd = v;
    if (!githubUrl && GH_URL.test(v)) githubUrl = v;
    if (!repoRef && REPO_KEYS.has(key) && OWNER_REPO.test(v)) repoRef = v;
    if (!skill && SKILL_KEYS.has(key) && /^[\w.-]+$/.test(v)) skill = v;
  });

  if (installCmd) return installCmd;
  if (githubUrl) return githubUrl;
  if (repoRef) return skill && !repoRef.includes("@") ? `${repoRef}@${skill}` : repoRef;
  return undefined;
}

function firstByKeys(hit: unknown, keys: Set<string>): string | undefined {
  let found: string | undefined;
  walkStrings(hit, (key, val) => {
    if (!found && keys.has(key) && val.trim() !== "") found = val.trim();
  });
  return found;
}

/** Find the results array regardless of the envelope shape. */
function extractItems(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const obj = (data ?? {}) as Record<string, unknown>;
  for (const k of ["results", "skills", "data", "items", "hits"]) {
    if (Array.isArray(obj[k])) return obj[k] as unknown[];
  }
  return [];
}

/** Map a raw search payload to importable hits. Exported for testing. */
export function hitsFromPayload(data: unknown): SkillHit[] {
  const out: SkillHit[] = [];
  const seen = new Set<string>();
  for (const item of extractItems(data)) {
    const reference = extractReference(item);
    if (!reference || seen.has(reference)) continue;
    seen.add(reference);
    const name = firstByKeys(item, NAME_KEYS) ?? reference;
    out.push({
      name,
      ...(firstByKeys(item, DESC_KEYS) ? { description: firstByKeys(item, DESC_KEYS) } : {}),
      reference,
      ...(GH_URL.test(reference) ? { source: reference } : {}),
    });
  }
  return out;
}

/**
 * A baseline of agentic tasks across the demand lifecycle — one search per item
 * seeds a proper starter library. Surfaced as one-click chips in the Skill Library.
 */
export const BASELINE_TASKS: readonly string[] = [
  "intake conversation",
  "requirements analysis",
  "duplicate detection",
  "business case drafting",
  "value quantification",
  "market research",
  "domain research",
  "proof of concept",
  "kpi specification",
  "adoption analysis",
  "rollout planning",
  "handover documentation",
];

export function searchEndpoint(query: string, limit = 20): string {
  return `https://skillsmp.com/api/v1/skills/search?q=${encodeURIComponent(query)}&limit=${limit}`;
}

/** Search the marketplace and return importable hits. */
export async function searchSkills(
  query: string,
  env: Record<string, string | undefined> = process.env,
  doFetch: typeof fetch = fetch,
): Promise<SkillHit[]> {
  const q = query.trim();
  if (q === "") return [];
  const headers: Record<string, string> = { accept: "application/json", "user-agent": "digitalization-portal" };
  if (env.SKILLSMP_API_KEY) headers.authorization = `Bearer ${env.SKILLSMP_API_KEY}`;
  const res = await doFetch(searchEndpoint(q), { headers });
  if (!res.ok) {
    throw new Error(`Marketplace search failed (${res.status}). You can still import by pasting a skill reference below.`);
  }
  const data = await res.json().catch(() => undefined);
  return hitsFromPayload(data);
}
