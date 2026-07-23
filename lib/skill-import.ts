/**
 * Import reference skills from the open Agent Skills ecosystem into the registry.
 *
 * Skills are an open `SKILL.md` standard (YAML frontmatter + markdown body — the
 * exact shape this registry uses), distributed through marketplaces like
 * skills.sh and SkillsMP whose `npx skills add …` commands resolve to GitHub-
 * hosted files. So the user can COPY-PASTE what a marketplace gives them — the
 * `npx` command, an `owner/repo@skill` reference, or a raw `SKILL.md` URL — and
 * this fetches the underlying file. Every imported skill is committed to the
 * registry repo (`du-agent-registry`), same as any other.
 *
 * SAFETY (unchanged): an imported skill later governs an agent, so this is a
 * REVIEW-then-commit flow, never an auto-load. Fetch is restricted to an
 * allowlist of ecosystem hosts (no SSRF), https only, size-capped; the content is
 * returned for a human to read and only enters git on save, with provenance
 * recorded. Nothing here injects remote content into a live model prompt.
 */

/** Marketplaces to browse (not agentskills.io — the user prefers these). */
export const REFERENCE_SOURCES = [
  { name: "skills.sh", url: "https://skills.sh", note: "npm-style marketplace — copy its `npx skills add …` command." },
  { name: "SkillsMP", url: "https://skillsmp.com", note: "Searchable index of SKILL.md files with their GitHub source." },
  { name: "LobeHub Skills", url: "https://lobehub.com/skills", note: "Skills directory backed by GitHub repos." },
] as const;

const DEFAULT_HOSTS = [
  "skills.sh",
  "www.skills.sh",
  "raw.githubusercontent.com",
  "github.com",
  "api.github.com",
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

export type SkillReference =
  | { kind: "url"; url: string }
  | { kind: "repo"; owner: string; repo: string; skill?: string };

const SEG = /^[A-Za-z0-9._-]+$/;

/**
 * Parse whatever the user pasted into a resolvable reference:
 *   - `npx skills add owner/repo@skill -y`  (skills.sh / SkillsMP install command)
 *   - `owner/repo` or `owner/repo@skill`
 *   - a github.com repo/blob URL, or a raw SKILL.md URL
 */
export function parseSkillReference(input: string): SkillReference | undefined {
  let s = input.trim();
  if (s === "") return undefined;

  // Strip a leading `npx [-y] skills add|install` wrapper.
  s = s.replace(/^npx\s+(?:-y\s+)?skills\s+(?:add|install)\s+/i, "").trim();

  // Pull out `--skill <name>` and drop standalone flags.
  let flagSkill: string | undefined;
  s = s.replace(/--skill[=\s]+([A-Za-z0-9._-]+)/i, (_m, n) => { flagSkill = n; return ""; });
  s = s.replace(/(?:^|\s)(?:-y|-g|--yes|--global)(?=\s|$)/gi, " ").trim();
  const target = s.split(/\s+/)[0] ?? "";
  if (target === "") return undefined;

  // A URL target.
  if (/^https?:\/\//i.test(target)) {
    try {
      const u = new URL(target);
      if (u.hostname === "github.com") {
        const blob = /^\/([^/]+)\/([^/]+)\/blob\/(.+)$/.exec(u.pathname);
        if (blob) return { kind: "url", url: normalizeSkillUrl(target) };
        const repo = /^\/([^/]+)\/([^/]+)\/?$/.exec(u.pathname);
        if (repo && repo[1] && repo[2]) {
          return { kind: "repo", owner: repo[1], repo: repo[2].replace(/\.git$/, ""), ...(flagSkill ? { skill: flagSkill } : {}) };
        }
      }
      return { kind: "url", url: target };
    } catch {
      return undefined;
    }
  }

  // An `owner/repo[@skill]` target.
  const [repoPart, atSkill] = target.split("@");
  const parts = (repoPart ?? "").split("/");
  if (parts.length === 2 && parts[0] && parts[1] && SEG.test(parts[0]) && SEG.test(parts[1])) {
    const skill = atSkill || flagSkill;
    return { kind: "repo", owner: parts[0], repo: parts[1], ...(skill && SEG.test(skill) ? { skill } : {}) };
  }
  return undefined;
}

/** Candidate fetch URLs for a reference, most-specific first. */
export function resolveCandidates(ref: SkillReference): string[] {
  if (ref.kind === "url") return [ref.url];
  const paths = ref.skill
    ? [`skills/${ref.skill}/SKILL.md`, `${ref.skill}/SKILL.md`, "SKILL.md"]
    : ["SKILL.md", "skills/SKILL.md"];
  return paths.map((p) => `https://api.github.com/repos/${ref.owner}/${ref.repo}/contents/${p}`);
}

/** A human-facing provenance URL for a reference. */
function provenanceUrl(ref: SkillReference): string {
  if (ref.kind === "url") return ref.url;
  return `https://github.com/${ref.owner}/${ref.repo}${ref.skill ? `#${ref.skill}` : ""}`;
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

/** Record the origin in the skill's frontmatter (provenance for review/audit). */
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

/** Fetch one candidate URL → the SKILL.md text, or undefined if absent. */
async function fetchOne(url: string, env: Record<string, string | undefined>, doFetch: typeof fetch): Promise<string | undefined> {
  if (!isAllowedSkillUrl(url, env)) return undefined;
  const isApi = new URL(url).hostname === "api.github.com";
  const res = await doFetch(url, {
    headers: isApi
      ? { accept: "application/vnd.github+json", "user-agent": "digitalization-portal" }
      : { accept: "text/plain, text/markdown, */*" },
  });
  if (!res.ok) return undefined;
  const raw = await res.text();
  if (raw.length > MAX_BYTES) throw new Error("Skill file is too large (>256 KB).");
  if (!isApi) return raw;
  try {
    const data = JSON.parse(raw) as { content?: string; encoding?: string };
    if (data.content && data.encoding === "base64") {
      const decoded = Buffer.from(data.content, "base64").toString("utf8");
      if (decoded.length > MAX_BYTES) throw new Error("Skill file is too large (>256 KB).");
      return decoded;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Resolve and fetch a reference skill from whatever the user pasted. Tries the
 * candidate locations and returns the first that is a valid SKILL.md. Throws a
 * clear, safe error otherwise. Saves nothing; reaches no model.
 */
export async function fetchReferenceSkill(
  input: string,
  env: Record<string, string | undefined> = process.env,
  doFetch: typeof fetch = fetch,
): Promise<FetchedSkill> {
  const ref = parseSkillReference(input);
  if (!ref) {
    throw new Error("Paste a `npx skills add owner/repo@skill` command, an owner/repo reference, or a raw SKILL.md URL.");
  }
  const candidates = resolveCandidates(ref);
  if (candidates.length === 0 || !candidates.some((c) => isAllowedSkillUrl(c, env))) {
    throw new Error(`That source isn't allowed. Import from: ${allowedHosts(env).join(", ")} (extend via SKILL_IMPORT_HOSTS).`);
  }
  for (const url of candidates) {
    const text = await fetchOne(url, env, doFetch);
    if (text === undefined) continue;
    const parsed = parseSkillMarkdown(text);
    if (parsed.name) {
      return {
        sourceUrl: provenanceUrl(ref),
        name: parsed.name,
        ...(parsed.description ? { description: parsed.description } : {}),
        body: parsed.body,
        raw: text,
      };
    }
  }
  throw new Error("Couldn't find a SKILL.md there. For a multi-skill repo, specify the skill: owner/repo@skill.");
}
