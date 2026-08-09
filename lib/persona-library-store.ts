/**
 * The persona library, stored in git — one markdown file per persona.
 *
 * Same system-of-record pattern as the process store and the demands funnel:
 * GitHub `main` when the App is configured, a writable local base otherwise
 * (never `process.cwd()`, which is read-only on serverless). A persona change is
 * then a diff a human can review, and "who changed what P-03 wants, and when" has
 * an answer without an audit table.
 *
 * The library starts EMPTY and stays empty until a person describes a persona.
 * Seeding it from the domain baseline was tried and removed: a generated record
 * carries a role name and nothing anybody said, and once it has an id it gets
 * cited by a requirements document, at which point a placeholder has quietly
 * become a governed definition. An empty library is an honest one — the
 * requirements engine falls back to plain role names until real personas exist.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getGitHost, hasGitHubCredentials, type RepoRef } from "./git/index.js";
import { repoName as resolveRepo, repoRef } from "./repos.js";
import {
  completePersona, nextPersonaId, parsePersona, renderPersona, type Persona,
} from "./persona-library.js";

const DIR = "personas";

function live(): boolean {
  return hasGitHubCredentials();
}
function repoName(env = process.env): string {
  return resolveRepo("personas", env);
}
function repo(): RepoRef {
  return repoRef("personas");
}
function localBase(): string {
  return process.env.PERSONA_DATA_DIR ?? process.env.PROCESS_DATA_DIR ?? path.join(os.tmpdir(), "du-processes");
}

const fileOf = (id: string) => `${DIR}/${id}.md`;

async function getRaw(rel: string): Promise<string | undefined> {
  if (live()) return getGitHost().getFile(repo(), rel);
  return readFile(path.join(localBase(), rel), "utf8").catch(() => undefined);
}
async function putRaw(rel: string, content: string, message: string): Promise<void> {
  if (live()) {
    await getGitHost().putFile(repo(), { path: rel, content }, message, "main");
    return;
  }
  const abs = path.join(localBase(), rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, content);
}
async function listFiles(): Promise<string[]> {
  if (live()) {
    const ents = await getGitHost().listDir(repo(), DIR);
    return ents.filter((e) => e.type === "file" && e.name.endsWith(".md")).map((e) => e.name).sort();
  }
  const ents = await readdir(path.join(localBase(), DIR)).catch(() => [] as string[]);
  return ents.filter((f) => f.endsWith(".md")).sort();
}

// ── read ──────────────────────────────────────────────────────────────────────

/** Every persona, id order. Empty until somebody describes one. */
export async function listPersonas(): Promise<Persona[]> {
  const files = await listFiles();
  const raws = await Promise.all(files.map((f) => getRaw(`${DIR}/${f}`)));
  return raws
    .filter((r): r is string => typeof r === "string" && r.trim() !== "")
    .map(parsePersona)
    .filter((p) => p.id !== "")
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

export async function readPersona(id: string): Promise<Persona | null> {
  const raw = await getRaw(fileOf(safeId(id)));
  if (raw === undefined) return null;
  const p = parsePersona(raw);
  return p.id === "" ? null : p;
}

// ── write ─────────────────────────────────────────────────────────────────────

function safeId(id: string): string {
  const v = (id ?? "").trim().toUpperCase();
  if (!/^P-\d{2,}$/.test(v)) throw Object.assign(new Error("invalid persona id"), { status: 400 });
  return v;
}

export async function createPersona(input: Partial<Persona>, now: string): Promise<Persona> {
  const existing = await listPersonas();
  const p = completePersona(input, nextPersonaId(existing.map((x) => x.id)), now);
  await putRaw(fileOf(p.id), renderPersona(p), `Add persona ${p.id} ${p.name}`);
  return p;
}

export async function writePersona(id: string, input: Partial<Persona>, now: string): Promise<Persona> {
  const key = safeId(id);
  const current = await readPersona(key);
  // Refuse to fabricate: an edit to a persona that cannot be read would replace a
  // researched record with whatever the form happened to post.
  if (!current) throw Object.assign(new Error(`no such persona: ${key}`), { status: 404 });
  const p = completePersona({ ...current, ...input }, key, now);
  await putRaw(fileOf(key), renderPersona(p), `Update persona ${key} ${p.name}`);
  return p;
}

/**
 * Retire a persona. The FILE stays and is marked retired rather than deleted:
 * requirements written last year still cite the id, and a citation that resolves
 * to nothing is a worse document than one that resolves to "retired, see notes".
 */
export async function retirePersona(id: string, reason: string, now: string): Promise<Persona> {
  const key = safeId(id);
  const current = await readPersona(key);
  if (!current) throw Object.assign(new Error(`no such persona: ${key}`), { status: 404 });
  const p = completePersona(
    { ...current, sourcedFrom: `RETIRED ${now.slice(0, 10)}${reason.trim() ? ` — ${reason.trim()}` : ""}` },
    key,
    now,
  );
  await putRaw(fileOf(key), renderPersona(p), `Retire persona ${key}`);
  return p;
}

export function isRetired(p: Persona): boolean {
  return (p.sourcedFrom ?? "").startsWith("RETIRED");
}

export { live, repoName };
