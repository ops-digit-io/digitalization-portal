/**
 * The persona library, stored in git — one markdown file per persona.
 *
 * Same system-of-record pattern as the process store and the demands funnel:
 * GitHub `main` when the App is configured, a writable local base otherwise
 * (never `process.cwd()`, which is read-only on serverless). A persona change is
 * then a diff a human can review, and "who changed what P-03 wants, and when" has
 * an answer without an audit table.
 *
 * The library SEEDS itself from `domain-knowledge.ts` the first time it is read.
 * Those role names are already what the requirements engine writes into stories,
 * so seeding turns an existing implicit vocabulary into an explicit one instead of
 * starting from an empty page nobody fills in. Seeded records are marked as such:
 * they are honest stubs, not researched personas, and the UI says so.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getGitHost, hasGitHubCredentials, type RepoRef } from "./git/index.js";
import { DOMAINS } from "./demand.js";
import { knowledgeFor } from "./domain-knowledge.js";
import {
  completePersona, nextPersonaId, parsePersona, renderPersona, type Persona, type PersonaKind,
} from "./persona-library.js";

const DIR = "personas";

/** The marker that says a record is a stub the portal wrote, not a person's words. */
export const SEED_SOURCE = "seeded from the domain baseline — not yet confirmed with a person";

function live(): boolean {
  return hasGitHubCredentials();
}
function repoName(env = process.env): string {
  return env.PERSONA_REPO ?? env.PROCESS_REPO ?? "du-processes";
}
function repo(): RepoRef {
  const org = process.env.GITHUB_ORG ?? "org";
  const name = repoName();
  return { owner: org, name, url: `https://github.com/${org}/${name}`, local: false };
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

// ── seed ──────────────────────────────────────────────────────────────────────

/**
 * The starting library: for each domain, its primary role as a `user` persona and
 * its decision-maker as a `buyer`, drawn from the domain baseline the requirements
 * engine already uses. Deliberately thin — a seeded persona carries the role, the
 * domain and nothing invented. Goals read as the one thing the role is for, which
 * is checkable and therefore correctable.
 */
export function seedPersonas(now?: string): Persona[] {
  const out: Persona[] = [];
  let n = 0;
  const add = (name: string, kind: PersonaKind, domain: string, authority: Persona["authority"], goal: string) => {
    n += 1;
    out.push(
      completePersona(
        {
          name: name.replace(/^\w/, (c) => c.toUpperCase()),
          kind,
          authority,
          domains: [domain],
          summary: `${name.replace(/^\w/, (c) => c.toUpperCase())} in ${domain}.`,
          goals: [goal],
          sourcedFrom: SEED_SOURCE,
        },
        `P-${String(n).padStart(2, "0")}`,
        now,
      ),
    );
  };
  for (const domain of DOMAINS) {
    const kb = knowledgeFor(domain);
    const [primary, , decider] = kb.personas;
    if (primary) add(primary, "user", domain, "uses", `Get through the ${domain} work of the day without fighting the tools.`);
    if (decider) add(decider, "buyer", domain, "approves budget", `Spend the ${domain} budget where it removes the most friction.`);
  }
  return out;
}

// ── read ──────────────────────────────────────────────────────────────────────

/**
 * Every persona, id order. Seeds the library on first read and PERSISTS the seed,
 * so the ids handed to a requirements document are stable from that moment —
 * a citation that changed meaning on the next deploy would be worse than no id.
 */
export async function listPersonas(): Promise<Persona[]> {
  const files = await listFiles();
  if (files.length === 0) {
    const seeded = seedPersonas(new Date().toISOString());
    await Promise.all(seeded.map((p) => putRaw(fileOf(p.id), renderPersona(p), `Seed persona ${p.id} ${p.name}`)));
    return seeded;
  }
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

/** True when a record is a portal-written stub rather than a described person. */
export function isSeeded(p: Persona): boolean {
  return (p.sourcedFrom ?? "").startsWith(SEED_SOURCE.slice(0, 20));
}
export function isRetired(p: Persona): boolean {
  return (p.sourcedFrom ?? "").startsWith("RETIRED");
}

export { live, repoName };
