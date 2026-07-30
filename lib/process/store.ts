/**
 * Process-diagnostic engagements, stored in a GIT REPOSITORY — the portal's
 * system-of-record pattern, mirroring `lib/demands-store.ts`.
 *
 * Every engagement is a FOLDER in one repository (`du-processes`, overridable
 * with `PROCESS_REPO`):
 *
 *   processes/<slug>/meta.json       header, Spoke, Anflug, Kernkomponenten,
 *                                     current phase, chosen Zweig, Risikoklasse,
 *                                     gate (Tor) verdicts
 *   processes/<slug>/ratings.json    S1–S5 rating per K-criterion (+ S/P/I, evidence)
 *   processes/<slug>/D<n>.md         per-dimension coaching evidence (narrative)
 *   processes/<slug>/risk.json       the 7 Änderungsrisiko Prüfpunkte
 *
 * Live-or-offline like the demands funnel: GitHub `main` when the App is
 * configured, else a WRITABLE local base (PROCESS_DATA_DIR, default under the OS
 * temp dir — never process.cwd(), which is read-only on serverless). Removal is a
 * soft-delete flag (GitHost has no destroy; an assessment is never thrown away).
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getGitHost, hasGitHubCredentials, FileExistsError, type RepoRef } from "../git/index";
import type { Rating } from "./health-model";

const DIR = "processes";
const META = "meta.json";
const RATINGS = "ratings.json";
const RISK = "risk.json";

export type Anflug = "process" | "technology";

export interface Component {
  id: string;
  label: string;
}

export interface GateVerdict {
  passed: boolean;
  reason: string;
  at: string;
}

export interface EngagementMeta {
  slug: string;
  title: string;
  owner: string; // Prozessverantwortlicher
  champion: string; // Prozess-Champion
  unit: string;
  anflug: Anflug;
  components: Component[];
  phase: string; // current phase id "P0".."P5"
  branch?: string; // chosen Zweig "Z0".."Z3"
  riskClass?: string; // "R1".."R3"
  gates: Record<string, GateVerdict>; // by Tor id "T0".."T5"
  createdAt: string;
  updatedAt: string;
  deleted?: string | null;
}

export interface Ratings {
  /** Non-per-component criteria. */
  criteria: Record<string, Rating>;
  /** D7 ratings per Kernkomponente id. */
  components: Record<string, Record<string, Rating>>;
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
function localBase(): string {
  return process.env.PROCESS_DATA_DIR ?? path.join(os.tmpdir(), "du-processes");
}

export function slugify(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function relDir(slug: string): string {
  const clean = slugify(slug);
  if (!clean) throw new Error("invalid slug");
  return `${DIR}/${clean}`;
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
    m.gates = m.gates || {};
    m.components = m.components || [];
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

export async function create(
  input: { title: string; owner?: string; champion?: string; unit?: string; anflug?: Anflug; components?: string[] },
  now: string,
): Promise<EngagementMeta> {
  const slug = slugify(input.title);
  if (!slug) throw new Error("title yields empty slug");
  const components: Component[] = (input.components ?? [])
    .map((l) => l.trim())
    .filter(Boolean)
    .map((label, i) => ({ id: `k${i + 1}`, label }));
  const m: EngagementMeta = {
    slug,
    title: String(input.title).trim(),
    owner: String(input.owner || "").trim(),
    champion: String(input.champion || "").trim(),
    unit: String(input.unit || "").trim(),
    anflug: input.anflug === "technology" ? "technology" : "process",
    components,
    phase: "P0",
    gates: {},
    createdAt: now,
    updatedAt: now,
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
  const current = (await meta(slug)) ?? ({ slug: slugify(slug), gates: {}, components: [] } as unknown as EngagementMeta);
  const m = { ...current, ...patch, updatedAt: now } as EngagementMeta;
  await putRaw(`${relDir(slug)}/${META}`, JSON.stringify(m, null, 2), `Update process engagement ${slug}`);
  return m;
}

/** Record a gate (Tor) verdict; a failed gate needs a reason (enforced at the route). */
export async function setGate(slug: string, torId: string, passed: boolean, reason: string, now: string): Promise<EngagementMeta> {
  const m = (await meta(slug))!;
  m.gates = m.gates || {};
  m.gates[torId] = { passed: !!passed, reason: String(reason || ""), at: now };
  return writeMeta(slug, { gates: m.gates }, now);
}

// ------------------------------------------------------------- ratings
export async function ratings(slug: string): Promise<Ratings> {
  const raw = await getRaw(`${relDir(slug)}/${RATINGS}`);
  if (raw === undefined) return { criteria: {}, components: {} };
  try {
    const r = JSON.parse(raw) as Ratings;
    return { criteria: r.criteria || {}, components: r.components || {} };
  } catch {
    return { criteria: {}, components: {} };
  }
}

/** Set one criterion's rating. For D7 (perComponent) pass componentId. */
export async function rate(
  slug: string,
  critId: string,
  rating: Rating | null,
  now: string,
  componentId?: string,
): Promise<Ratings> {
  const r = await ratings(slug);
  if (componentId) {
    r.components[componentId] = r.components[componentId] || {};
    if (rating) r.components[componentId]![critId] = rating;
    else delete r.components[componentId]![critId];
  } else if (rating) r.criteria[critId] = rating;
  else delete r.criteria[critId];
  await putRaw(`${relDir(slug)}/${RATINGS}`, JSON.stringify(r, null, 2), `Rate ${critId} on ${slugify(slug)}`);
  await writeMeta(slug, {}, now);
  return r;
}

// ------------------------------------------------------- dimension evidence
export async function readDimension(slug: string, dimId: string): Promise<string> {
  return (await getRaw(`${relDir(slug)}/${dimId}.md`)) ?? "";
}
export async function writeDimension(slug: string, dimId: string, content: string, now: string): Promise<{ changed: boolean }> {
  const rel = `${relDir(slug)}/${dimId}.md`;
  const prev = await getRaw(rel);
  if (prev === content) return { changed: false };
  await putRaw(rel, content, `Update ${dimId} evidence on ${slugify(slug)}`);
  await writeMeta(slug, {}, now);
  return { changed: true };
}

// -------------------------------------------- phase artefacts (Markdown)
export async function readArtefact(slug: string, artefactId: string): Promise<string> {
  return (await getRaw(`${relDir(slug)}/${artefactId}.md`)) ?? "";
}
export async function writeArtefact(slug: string, artefactId: string, content: string, now: string): Promise<{ changed: boolean }> {
  const rel = `${relDir(slug)}/${artefactId}.md`;
  const prev = await getRaw(rel);
  if (prev === content) return { changed: false };
  await putRaw(rel, content, `Update artefact ${artefactId} on ${slugify(slug)}`);
  await writeMeta(slug, {}, now);
  return { changed: true };
}

// ------------------------------------------------------- risk checks (Tor T3)
export async function riskChecks(slug: string): Promise<Record<string, { answer: string; evidence: string }>> {
  const raw = await getRaw(`${relDir(slug)}/${RISK}`);
  if (raw === undefined) return {};
  try {
    return JSON.parse(raw) as Record<string, { answer: string; evidence: string }>;
  } catch {
    return {};
  }
}
export async function setRiskCheck(slug: string, n: number, answer: string, evidence: string, now: string): Promise<void> {
  const r = await riskChecks(slug);
  r[String(n)] = { answer: String(answer || ""), evidence: String(evidence || "") };
  await putRaw(`${relDir(slug)}/${RISK}`, JSON.stringify(r, null, 2), `Risk check ${n} on ${slugify(slug)}`);
  await writeMeta(slug, {}, now);
}

export async function remove(slug: string, now: string): Promise<{ removed: string; recoverableAt: string }> {
  const m = await meta(slug);
  if (!m || m.deleted) throw new Error("no such engagement");
  await writeMeta(slug, { deleted: now }, now);
  return { removed: slugify(slug), recoverableAt: `${relDir(slug)} (meta.deleted=${now})` };
}

export { live, repoName };
