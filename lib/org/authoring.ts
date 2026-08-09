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
import { CORE_KEYS, MODULE_KEYS, sectionSubdir } from "./model.js";
import { LANE_KEYS } from "./lane.js";
import { scaffoldSection, scaffoldLane, scaffoldLaneFile, slugifyDept } from "./scaffold.js";

const DEPTS = "departments";
const KNOWN_KEYS = new Set<string>([...CORE_KEYS, ...MODULE_KEYS]);
const LANE_KEY_SET = new Set<string>(LANE_KEYS);

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

  const rel = `${DEPTS}/${slug}/${sectionSubdir(key)}/${key}.md`;
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
  // A function replacer avoids String.replace interpreting `$&`/`$1`/`$$` in a name
  // like "A$&B" — a literal `$` in the department name must survive verbatim.
  const charter = scaffoldSection("charter", trimmed).replace("owner:", () => `name: ${trimmed}\nowner:`);
  await saveSection(slug, "charter", charter, `Create department ${slug}`);
  return { slug };
}

/**
 * Save one lane-pack file (`departments/<slug>/lanes/<lane>/<key>.md`). Same live/local
 * split and same guards as `saveSection`; the key must be a known lane-pack file.
 */
export async function saveLaneFile(
  deptSlugInput: string,
  laneSlugInput: string,
  key: string,
  markdown: string,
  message?: string,
): Promise<{ host: "github" | "local"; path: string }> {
  const deptSlug = safeSlug(deptSlugInput);
  const laneSlug = safeSlug(laneSlugInput);
  if (!deptSlug) throw new OrgWriteError(`invalid department slug: ${deptSlugInput}`);
  if (!laneSlug) throw new OrgWriteError(`invalid lane slug: ${laneSlugInput}`);
  if (!LANE_KEY_SET.has(key)) throw new OrgWriteError(`unknown lane file: ${key}`);

  const rel = `${DEPTS}/${deptSlug}/lanes/${laneSlug}/${key}.md`;
  const msg = message?.trim() || `Update ${deptSlug}/lanes/${laneSlug}/${key}`;

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
 * Create a lane in a department: write its two anchor files (playbook + agent-brief),
 * scaffolded, so the lane appears immediately and opens onto the coached skeleton.
 */
export async function createLane(deptSlugInput: string, laneName: string): Promise<{ slug: string }> {
  const deptSlug = safeSlug(deptSlugInput);
  if (!deptSlug) throw new OrgWriteError(`invalid department slug: ${deptSlugInput}`);
  const trimmed = laneName.trim();
  if (!trimmed) throw new OrgWriteError("a lane needs a name");
  const laneSlug = slugifyDept(trimmed);
  if (!laneSlug) throw new OrgWriteError(`could not derive a slug from “${laneName}”`);

  const files = scaffoldLane(trimmed);
  for (const [key, md] of Object.entries(files)) {
    await saveLaneFile(deptSlug, laneSlug, key, md, `Create lane ${deptSlug}/${laneSlug}`);
  }
  return { slug: laneSlug };
}

/** A blank section, scaffolded — for the editor's "start this section" action. */
export function startingPoint(key: string, deptName: string): string {
  return scaffoldSection(key, deptName);
}

/** A blank lane-pack file, scaffolded — for the lane editor's "start" action. */
export function laneStartingPoint(key: string, laneName: string): string {
  return scaffoldLaneFile(key, laneName);
}

export { safeSlug };
