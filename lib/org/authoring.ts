/**
 * Writing the organization context — creating a department and saving its sections.
 *
 * Reads go through the content-repo seam (`store.ts`); writes are the mirror image and
 * follow the portal's system-of-record pattern (`champions-store.ts`, `process/store`):
 *   • live (the GitHub App configured): commit to `du-organization-context` on `main`.
 *     The repo is CREATED on first write if it does not exist yet — so "add a
 *     department" works end to end without a separate provisioning step.
 *   • local (no App): write under the same mirror directory the seam reads, so an
 *     authored department shows up immediately on `/org`.
 *
 * A section is validated against the grammar's key set before it is written — an
 * unknown section key never reaches a file path. Slugs are constrained the same way
 * the reader constrains them, so a name can never escape the `departments/` folder.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getGitHost, hasGitHubCredentials, type RepoRef } from "../git/index.js";
import { organizationRepo } from "../content-repo.js";
import { CORE_KEYS, MODULE_SECTIONS } from "./model.js";
import { scaffoldSection, slugifyDept } from "./scaffold.js";

const DEPTS = "departments";
const MODULE_KEYS = MODULE_SECTIONS.map((m) => m.key);
const KNOWN_KEYS = new Set<string>([...CORE_KEYS, ...MODULE_KEYS]);

function live(): boolean {
  return hasGitHubCredentials();
}

function repoRef(): RepoRef {
  const org = process.env.GITHUB_ORG ?? "org";
  const name = organizationRepo().repoName;
  return { owner: org, name, url: `https://github.com/${org}/${name}`, local: false };
}

/** A slug is valid iff it is `[a-z0-9][a-z0-9-]*` — no dots, slashes, or leading dash. */
function safeSlug(slug: string): string | null {
  return /^[a-z0-9][a-z0-9-]*$/.test(slug) ? slug : null;
}

export class OrgWriteError extends Error {}

/** Create the org repo on first write when it is missing (live mode only, best-effort). */
async function ensureRepo(): Promise<void> {
  const host = getGitHost();
  if (!host.getRepoMeta) return; // host cannot check — assume it exists (LocalHost path)
  const name = organizationRepo().repoName;
  const meta = await host.getRepoMeta(name).catch(() => ({ exists: true, isTemplate: false }));
  if (!meta.exists) {
    await host.createRepo(name, { description: "Department OS — organization context for the Digital Portal", private: true });
  }
}

/**
 * Save one section's markdown. Returns where it landed. Validates the slug and the
 * section key; a bad key is a caller error (`OrgWriteError`), not a written file.
 */
export async function saveSection(
  slugInput: string,
  key: string,
  markdown: string,
  message?: string,
): Promise<{ host: "github" | "local"; path: string }> {
  const slug = safeSlug(slugInput);
  if (!slug) throw new OrgWriteError(`invalid department slug: ${slugInput}`);
  if (!KNOWN_KEYS.has(key)) throw new OrgWriteError(`unknown section: ${key}`);

  const rel = `${DEPTS}/${slug}/${key}.md`;
  const msg = message?.trim() || `Update ${slug}/${key}`;

  if (live()) {
    await ensureRepo();
    await getGitHost().putFile(repoRef(), { path: rel, content: markdown }, msg, "main");
    return { host: "github", path: rel };
  }
  const abs = path.join(organizationRepo().mirrorDir, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, markdown);
  return { host: "local", path: abs };
}

/**
 * Create a department: turn a free-text name into a slug and write a scaffolded
 * charter, so it appears on `/org` immediately and opens onto the coached skeleton.
 * Returns the slug. The charter is the anchor file (its frontmatter carries the name).
 */
export async function createDepartment(name: string): Promise<{ slug: string }> {
  const trimmed = name.trim();
  if (!trimmed) throw new OrgWriteError("a department needs a name");
  const slug = slugifyDept(trimmed);
  if (!slug) throw new OrgWriteError(`could not derive a slug from “${name}”`);

  // Name lives in the charter frontmatter so the reader picks it up as the display name.
  const charter = scaffoldSection("charter", trimmed).replace("owner:", `name: ${trimmed}\nowner:`);
  await saveSection(slug, "charter", charter, `Create department ${slug}`);
  return { slug };
}

/** A blank section, scaffolded — for the editor's "start this section" action. */
export function startingPoint(key: string, deptName: string): string {
  return scaffoldSection(key, deptName);
}

export { safeSlug };
