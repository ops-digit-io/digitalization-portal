/**
 * Import reference skills from the open Agent Skills ecosystem.
 *
 * Skills are an open standard (agentskills.io): a `SKILL.md` is YAML frontmatter
 * + a markdown body — the exact shape this portal's registry already uses. So a
 * skill from agentskills.io, skills.sh, or a GitHub repo can be imported directly.
 *
 * SAFETY. An imported skill is THIRD-PARTY CONTENT that will later govern an agent
 * (it becomes part of a system prompt). So this is deliberately a REVIEW-then-
 * commit flow, never an auto-load:
 *   - Fetch is restricted to an allowlist of skill hosts (no SSRF to internal
 *     services), https only, with a size cap.
 *   - The fetched skill is returned for a human to READ, not fed to a model.
 *   - Only on human save does it enter the git registry, with its `source:`
 *     recorded for provenance — after which it is a normal, reviewable, git-
 *     managed skill under the same governance as any other.
 * Nothing here injects remote content into a live model prompt (constraint #5).
 */

/** Curated starting points — where to browse reference skills. */
export const REFERENCE_SOURCES = [
  { name: "agentskills.io", url: "https://agentskills.io", note: "The open Agent Skills standard and directory." },
  { name: "skills.sh", url: "https://skills.sh", note: "A community SKILL.md marketplace — every skill is a free download." },
  { name: "agentskills (GitHub)", url: "https://github.com/agentskills/agentskills", note: "Spec + reference skills, importable by raw file URL." },
] as const;

const DEFAULT_HOSTS = [
  "agentskills.io",
  "www.agentskills.io",
  "skills.sh",
  "www.skills.sh",
  "raw.githubusercontent.com",
  "github.com",
  "gist.githubusercontent.com",
];

const MAX_BYTES = 256_000;

/** The hosts an import may fetch from — the defaults plus `SKILL_IMPORT_HOSTS`. */
export function allowedHosts(env: Record<string, string | undefined> = process.env): string[] {
  const extra = (env.SKILL_IMPORT_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...DEFAULT_HOSTS, ...extra];
}

/** True when `url` is https and its host is on the allowlist. */
export function isAllowedSkillUrl(url: string, env: Record<string, string | undefined> = process.env): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && allowedHosts(env).includes(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** Rewrite a GitHub blob URL to its raw-file equivalent; pass others through. */
export function normalizeSkillUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "github.com") {
      const m = /^\/([^/]+)\/([^/]+)\/blob\/(.+)$/.exec(u.pathname);
      if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`;
    }
    return url;
  } catch {
    return url;
  }
}

export interface ParsedSkill {
  name?: string;
  description?: string;
  frontmatter: Record<string, string>;
  body: string;
  hasFrontmatter: boolean;
}

/** Parse a SKILL.md into frontmatter + body. Never throws. */
export function parseSkillMarkdown(raw: string): ParsedSkill {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  const frontmatter: Record<string, string> = {};
  let body = raw;
  if (m && m[1] !== undefined) {
    body = raw.slice(m[0].length);
    for (const line of m[1].split(/\r?\n/)) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const k = line.slice(0, idx).trim().toLowerCase();
      const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (k) frontmatter[k] = v;
    }
  }
  return {
    name: frontmatter["name"],
    description: frontmatter["description"],
    frontmatter,
    body: body.trim(),
    hasFrontmatter: Boolean(m),
  };
}

/** Record the origin URL in the skill's frontmatter (provenance for review/audit). */
export function ensureProvenance(raw: string, sourceUrl: string): string {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (m && m[1] !== undefined) {
    let fm = m[1];
    fm = /^source:/m.test(fm) ? fm.replace(/^source:.*$/m, `source: ${sourceUrl}`) : `${fm}\nsource: ${sourceUrl}`;
    return `---\n${fm}\n---\n${raw.slice(m[0].length)}`;
  }
  const parsed = parseSkillMarkdown(raw);
  return `---\nname: ${parsed.name ?? "imported-skill"}\nsource: ${sourceUrl}\n---\n\n${raw.trim()}\n`;
}

export interface FetchedSkill {
  sourceUrl: string;
  name: string;
  description?: string;
  body: string;
  raw: string;
}

/**
 * Fetch and parse a reference skill from an allowlisted host. Throws a clear,
 * safe error on a blocked host, a failed fetch, an oversized file, or content
 * that is not a SKILL.md. Does NOT save anything and does NOT reach a model.
 */
export async function fetchReferenceSkill(
  url: string,
  env: Record<string, string | undefined> = process.env,
  doFetch: typeof fetch = fetch,
): Promise<FetchedSkill> {
  const normalized = normalizeSkillUrl(url.trim());
  if (!isAllowedSkillUrl(normalized, env)) {
    throw new Error(`That host isn't allowed. Import from: ${allowedHosts(env).join(", ")} (extend via SKILL_IMPORT_HOSTS).`);
  }
  const res = await doFetch(normalized, { headers: { accept: "text/plain, text/markdown, */*" } });
  if (!res.ok) throw new Error(`Could not fetch the skill (${res.status}) from ${normalized}.`);
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new Error("Skill file is too large (>256 KB).");
  const parsed = parseSkillMarkdown(text);
  if (!parsed.name) throw new Error("That doesn't look like a SKILL.md — it has no `name:` in its frontmatter.");
  return {
    sourceUrl: normalized,
    name: parsed.name,
    ...(parsed.description ? { description: parsed.description } : {}),
    body: parsed.body,
    raw: text,
  };
}
