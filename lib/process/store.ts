/**
 * Process-funnel engagements, stored in a GIT REPOSITORY — the portal's
 * system-of-record pattern, mirroring `lib/demands-store.ts`.
 *
 * Every engagement is a FOLDER in one repository (`du-processes`, overridable
 * with `PROCESS_REPO`), holding all of its markdown:
 *
 *   processes/<slug>/meta.json          title, owner, unit, gate verdicts, flags
 *   processes/<slug>/<nn-section>.md     the section artefacts (the product)
 *   processes/<slug>/A<n>-*.md           advisory artefacts
 *   processes/<slug>/digest.json         the derived one-screen digest
 *   processes/<slug>/decisions.json      the advisory accept/reject ledger
 *
 * Same live-or-offline shape as the demands funnel: when the GitHub App is
 * configured the funnel is read/written over GitHub `main`; otherwise it uses a
 * LOCAL working tree. The local base is a WRITABLE dir (default under the OS temp
 * dir, overridable with `PROCESS_DATA_DIR`) — never `process.cwd()`, which is
 * read-only on serverless (that was the `/var/task/.process-workspace` ENOENT).
 *
 * Git has no delete in the portal's `GitHost` interface (nothing here
 * merges/destroys), so removal is a SOFT delete — a `deleted` flag on meta — which
 * also matches PDT's "move aside, never destroy an assessment" rule.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SECTIONS, byKey } from "./sections";
import { getGitHost, hasGitHubCredentials, FileExistsError, type RepoRef } from "../git/index";

const DIR = "processes";
const META = "meta.json";

export interface EngagementMeta {
  slug: string;
  title: string;
  owner: string;
  unit: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  gates: Record<string, { passed: boolean; reason: string; at: string }>;
  deleted?: string | null;
}

// ---------------------------------------------------------------- placement
function live(): boolean {
  return hasGitHubCredentials();
}

function repoName(env = process.env): string {
  return env.PROCESS_REPO ?? "du-processes";
}

function processRepo(): RepoRef {
  const org = process.env.GITHUB_ORG ?? "org";
  const name = repoName();
  return { owner: org, name, url: `https://github.com/${org}/${name}`, local: false };
}

/** Writable local base for the offline fallback (never the read-only cwd). */
function localBase(): string {
  return process.env.PROCESS_DATA_DIR ?? path.join(os.tmpdir(), "du-processes");
}

export function slugify(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function relDir(slug: string): string {
  const clean = slugify(slug);
  if (!clean) throw new Error("invalid slug");
  return `${DIR}/${clean}`;
}

/** Path of a section artefact within the engagement folder. */
function sectionFile(sectionKey: string): string {
  const s = byKey[sectionKey];
  if (!s) throw new Error(`unknown section ${sectionKey}`);
  return s.file;
}

// ------------------------------------------------------- generic file I/O
async function getRaw(rel: string): Promise<string | undefined> {
  if (live()) return getGitHost().getFile(processRepo(), rel);
  return readFile(path.join(localBase(), rel), "utf8").catch(() => undefined);
}

async function putRaw(rel: string, content: string, message: string, opts?: { createOnly?: boolean }): Promise<void> {
  if (live()) {
    await getGitHost().putFile(processRepo(), { path: rel, content }, message, "main", { createOnly: opts?.createOnly ?? false });
    return;
  }
  const abs = path.join(localBase(), rel);
  await mkdir(path.dirname(abs), { recursive: true });
  try {
    await writeFile(abs, content, opts?.createOnly ? { flag: "wx" } : undefined);
  } catch (err) {
    if (opts?.createOnly && (err as NodeJS.ErrnoException).code === "EEXIST") throw new FileExistsError(rel);
    throw err;
  }
}

async function listSlugs(): Promise<string[]> {
  if (live()) {
    const ents = await getGitHost().listDir(processRepo(), DIR);
    return ents.filter((e) => e.type === "dir").map((e) => e.name).sort();
  }
  const dir = path.join(localBase(), DIR);
  const ents = await readdir(dir, { withFileTypes: true }).catch(() => []);
  return ents.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

// -------------------------------------------------------------- meta / list
export async function meta(slug: string): Promise<EngagementMeta | null> {
  const raw = await getRaw(`${relDir(slug)}/${META}`);
  if (raw === undefined) return null;
  try {
    const m = JSON.parse(raw) as EngagementMeta;
    m.slug = slugify(slug);
    return m;
  } catch {
    return null;
  }
}

export async function exists(slug: string): Promise<boolean> {
  const m = await meta(slug);
  return m !== null && !m.deleted;
}

export async function list(): Promise<EngagementMeta[]> {
  const slugs = await listSlugs();
  const metas = await Promise.all(slugs.map((s) => meta(s).catch(() => null)));
  return metas
    .filter((m): m is EngagementMeta => m !== null && !m.deleted)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export async function create(input: { title: string; owner?: string; unit?: string; note?: string }, now: string): Promise<EngagementMeta> {
  const slug = slugify(input.title);
  if (!slug) throw new Error("title yields empty slug");
  const m: EngagementMeta = {
    slug,
    title: String(input.title).trim(),
    owner: String(input.owner || "").trim(),
    unit: String(input.unit || "").trim(),
    note: String(input.note || "").trim(),
    createdAt: now,
    updatedAt: now,
    gates: {},
  };
  try {
    await putRaw(`${DIR}/${slug}/${META}`, JSON.stringify(m, null, 2), `Create process engagement ${slug}`, { createOnly: true });
  } catch (err) {
    if (err instanceof FileExistsError) throw new Error("engagement already exists");
    throw err;
  }
  return m;
}

export async function writeMeta(slug: string, patch: Partial<EngagementMeta>, now: string): Promise<EngagementMeta> {
  const current = (await meta(slug)) ?? ({ slug: slugify(slug), gates: {} } as EngagementMeta);
  const m = { ...current, ...patch, updatedAt: now } as EngagementMeta;
  await putRaw(`${relDir(slug)}/${META}`, JSON.stringify(m, null, 2), `Update process engagement ${slug}`);
  return m;
}

// ------------------------------------------------------------- section I/O
export async function read(slug: string, sectionKey: string): Promise<string> {
  return (await getRaw(`${relDir(slug)}/${sectionFile(sectionKey)}`)) ?? "";
}

/** Write a section artefact. Git commits are the history trail. */
export async function write(slug: string, sectionKey: string, content: string, now: string): Promise<{ changed: boolean }> {
  const rel = `${relDir(slug)}/${sectionFile(sectionKey)}`;
  const prev = await getRaw(rel);
  if (prev === content) return { changed: false };
  await putRaw(rel, content, `Update ${sectionKey} on ${slugify(slug)}`);
  await writeMeta(slug, {}, now);
  return { changed: true };
}

export async function setGate(slug: string, sectionKey: string, passed: boolean, reason: string, now: string): Promise<EngagementMeta> {
  const m = (await meta(slug)) ?? ({ slug: slugify(slug), gates: {} } as EngagementMeta);
  m.gates = m.gates || {};
  m.gates[sectionKey] = { passed: !!passed, reason: String(reason || ""), at: now };
  return writeMeta(slug, { gates: m.gates }, now);
}

export interface SectionState {
  key: string;
  label: string;
  group: string;
  order: number;
  gate: boolean;
  blocking: string[];
  filled: boolean;
  chars: number;
  gateResult: { passed: boolean; reason: string; at: string } | null;
  score?: unknown;
  locked?: boolean;
}

/** Everything the overview needs, in one read of the engagement folder. */
export async function state(slug: string): Promise<{ meta: EngagementMeta; sections: SectionState[] }> {
  const m = (await meta(slug))!;
  const contents = await Promise.all(SECTIONS.map((s) => read(slug, s.key)));
  const sections: SectionState[] = SECTIONS.map((s, i) => {
    const content = contents[i] ?? "";
    return {
      key: s.key,
      label: s.label,
      group: s.group,
      order: s.order,
      gate: s.gate,
      blocking: s.blocking,
      filled: content.trim().length > 0,
      chars: content.length,
      gateResult: (m.gates || {})[s.key] || null,
    };
  });
  return { meta: m, sections };
}

/** Soft-delete: flag the engagement (Git has no destroy; PDT never destroys one). */
export async function remove(slug: string, now: string): Promise<{ removed: string; recoverableAt: string }> {
  const m = await meta(slug);
  if (!m || m.deleted) throw new Error("no such engagement");
  await writeMeta(slug, { deleted: now }, now);
  return { removed: slugify(slug), recoverableAt: `${relDir(slug)} (meta.deleted=${now})` };
}

/** Read/write arbitrary sidecar files in the engagement folder (digest, decisions, advisory). */
export async function readFileRaw(slug: string, filename: string): Promise<string | undefined> {
  return getRaw(`${relDir(slug)}/${filename}`);
}
export async function writeFileRaw(slug: string, filename: string, content: string, now: string, message?: string): Promise<void> {
  await putRaw(`${relDir(slug)}/${filename}`, content, message ?? `Update ${filename} on ${slugify(slug)}`);
  await writeMeta(slug, {}, now);
}

/** Git commits are the history trail; the sidecar-history mechanism is retired. */
export async function history(_slug: string, _sectionKey: string): Promise<string[]> {
  return [];
}

export { live, repoName };
