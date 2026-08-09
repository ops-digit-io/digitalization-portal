/**
 * The central intake funnel store (`docs/ARCHITECTURE-intake.md`).
 *
 * Every case the Digital Unit takes in lives as a FOLDER in ONE repository —
 * `du-demands`, the input funnel. There is no repository per case at intake; a
 * case earns its own `uc-*` repository only at the PoC stage. The case folder holds
 * all of the case's markdown in a defined format:
 *
 *   demands/<UC-ID>/
 *     README.md        the case record — the intake (State, Gates, the problem)
 *     requirements.md  standardized requirements (epics, user stories, NFRs, …)
 *     analysis.md      domain analysis & enhancement of the intake
 *
 * README.md is the future use-case README, so parsing reuses `parseUseCase`.
 *
 * Same live-or-offline shape as the skills registry: LIST reads the working tree
 * the app ships; SAVE commits to `du-demands`'s `main` when the GitHub App is
 * configured, else writes the working tree. This is the funnel repo, not a gated
 * use-case repo — writing it directly is correct (no gate is crossed).
 */

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseUseCase, parsePeople, type ParsedUseCase } from "./parse.js";
import { parseBusinessCase } from "./businesscase.js";
import { nextDemandId } from "./demand.js";
import { mapPool } from "./pool.js";
import { canOpenGate } from "./gates.js";
import { exitGate } from "./stages.js";
import { getGitHost, hasGitHubCredentials, FileExistsError, type RepoRef } from "./git/index.js";
import { LocalHost } from "./git/local-host.js";
import { repoName, repoRef } from "./repos.js";
import type { RegistryRow } from "./registry.js";
import { type Gate, type Lane, type Stage, type Status, GATES } from "./types.js";

const DIR = "demands";
const README = "README.md";

export interface DemandSummary {
  id: string;
  title: string;
  stage?: Stage;
  lane?: Lane | "unassigned";
  status?: Status;
  plant?: string;
  domain?: string;
  created?: string;
  needsAttention: boolean;
  /** Names (without .md) of the standardized artifacts present, e.g. ["requirements","analysis"]. */
  artifacts: string[];
}

function root(): string {
  return process.cwd();
}

/** Sanitised case id, e.g. "UC-2026-0071". */
function safeId(id: string): string {
  return id.toUpperCase().replace(/[^A-Z0-9-]/g, "");
}
function safeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function caseDir(id: string): string {
  return `${DIR}/${safeId(id)}`;
}
/** The case record path: demands/<UC-ID>/README.md. */
function readmePath(id: string): string {
  return `${caseDir(id)}/${README}`;
}
/** A standardized artifact path: demands/<UC-ID>/<name>.md. */
function artifactPath(id: string, name: string): string {
  return `${caseDir(id)}/${safeName(name)}.md`;
}

async function isDir(p: string): Promise<boolean> {
  return stat(p).then((s) => s.isDirectory()).catch(() => false);
}

function demandsRepoName(env = process.env): string {
  return repoName("demands", env);
}

/** True when the funnel is read/written live over GitHub rather than the local tree. */
function live(): boolean {
  return hasGitHubCredentials();
}

/** The funnel repo ref (GitHub). */
function funnelRepo(): RepoRef {
  return repoRef("demands");
}

/** All case ids present in the funnel (folders with a README.md). */
export async function listDemandIds(baseDir = root()): Promise<string[]> {
  if (live()) {
    const ents = await getGitHost().listDir(funnelRepo(), DIR);
    return ents.filter((e) => e.type === "dir").map((e) => e.name).sort();
  }
  const dir = join(baseDir, DIR);
  const ents = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const ids: string[] = [];
  for (const e of ents) {
    if (!e.isDirectory()) continue;
    if (await stat(join(dir, e.name, README)).then(() => true).catch(() => false)) ids.push(e.name);
  }
  return ids.sort();
}

/** Raw markdown of the case record (README.md), or undefined if absent. */
export async function readDemand(id: string, baseDir = root()): Promise<string | undefined> {
  if (live()) return getGitHost().getFile(funnelRepo(), readmePath(id));
  return readFile(join(baseDir, readmePath(id)), "utf8").catch(() => undefined);
}

/** Names (without .md) of the standardized artifacts a case has, besides README. */
export async function listArtifacts(id: string, baseDir = root()): Promise<string[]> {
  if (live()) {
    const ents = await getGitHost().listDir(funnelRepo(), caseDir(id));
    return ents
      .filter((e) => e.type === "file" && e.name.endsWith(".md") && e.name.toUpperCase() !== README.toUpperCase())
      .map((e) => e.name.replace(/\.md$/i, ""))
      .sort();
  }
  const dir = join(baseDir, caseDir(id));
  const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".md") && f.toUpperCase() !== README.toUpperCase());
  return files.map((f) => f.replace(/\.md$/i, "")).sort();
}

/** Read one standardized artifact (e.g. "requirements"), or undefined. */
export async function readArtifact(id: string, name: string, baseDir = root()): Promise<string | undefined> {
  if (live()) return getGitHost().getFile(funnelRepo(), artifactPath(id, name));
  return readFile(join(baseDir, artifactPath(id, name)), "utf8").catch(() => undefined);
}

/** Case title with the `UC-… · ` id prefix stripped, falling back to the id. */
function demandTitle(p: ParsedUseCase, id: string): string {
  return p.title?.replace(/^UC-\d{4}-\d+\s*·\s*/, "") ?? id;
}

/**
 * Whether a parsed demand should be flagged "needs attention". A missing/unknown
 * stage or any unreadable `## State` key qualifies — except a deliberately
 * "unassigned" lane, which is a valid pre-triage state, not a parse failure.
 */
function demandNeedsAttention(p: ParsedUseCase): boolean {
  const laneRaw = (p.state.raw["lane"] ?? "").toLowerCase();
  const otherErrors = p.parseErrors.filter(
    (e) => !(e.section === "state" && laneRaw === "unassigned" && /lane/i.test(e.message)),
  );
  return p.state.stage === undefined || otherErrors.some((e) => e.section === "state");
}

/** How many funnel cases to fetch from GitHub at once (bounded to respect rate limits). */
const FETCH_CONCURRENCY = 8;

/** Parse every case into a board-ready summary; unreadable ones surface, never vanish. */
export async function listDemands(baseDir = root()): Promise<DemandSummary[]> {
  const ids = await listDemandIds(baseDir);
  // Fan out per-case reads with bounded concurrency (was a serial N+1 loop).
  const summaries = await mapPool(ids, FETCH_CONCURRENCY, async (id): Promise<DemandSummary | null> => {
    const md = await readDemand(id, baseDir);
    if (md === undefined) return null;
    const p = parseUseCase(md);
    const laneRaw = (p.state.raw["lane"] ?? "").toLowerCase();
    const artifacts = await listArtifacts(id, baseDir);
    return {
      id,
      title: demandTitle(p, id),
      ...(p.state.stage ? { stage: p.state.stage } : {}),
      lane: (p.state.lane ?? (laneRaw === "unassigned" ? "unassigned" : undefined)) as DemandSummary["lane"],
      ...(p.state.status ? { status: p.state.status } : {}),
      ...(p.state.plant ? { plant: p.state.plant } : {}),
      ...(p.state.domain ? { domain: p.state.domain } : {}),
      ...(p.state.created ? { created: p.state.created } : {}),
      needsAttention: demandNeedsAttention(p),
      artifacts,
    };
  });
  return summaries.filter((s): s is DemandSummary => s !== null);
}

/**
 * Parse every case into a `RegistryRow` — the shape the portfolio board and
 * funnel consume. This is what wires those views to the live `du-demands` funnel
 * instead of static seed data: the same reconciler-style mapping the registry
 * cache would produce, computed on demand from each case's `README.md`.
 *
 * `since` falls back to `Created` so stage-age / dwell works for freshly captured
 * demands (which carry `Created`, not yet a stage-entry `Since`). Value figures
 * are left absent until a business case is drafted — the board renders them as
 * indicative/empty, never as committed (constraint #8).
 */
/** Map one demand's markdown to a board/funnel row. Reused for git cases and the
 *  interim buffer, so a pending demand renders identically to a committed one. */
export function demandRowFromMarkdown(id: string, md: string): RegistryRow {
  const p = parseUseCase(md);
  const people = parsePeople(md);
  const since = p.state.raw["since"] ?? p.state.created;

  // Next-gate readiness, derived and viewer-independent (no `actor`, so the
  // self-approval check is skipped). Cheap: canOpenGate is pure over the parsed
  // case + people we already have. G5's baseline check needs the business case,
  // which this row-level read doesn't load, so G5 readiness is approximate.
  const stage = p.state.stage as Stage | undefined;
  const openGate = GATES.find((g) => p.gates.find((x) => x.id === g)?.status === "open");
  const targetGate: Gate | undefined = openGate ?? (stage ? exitGate(stage) : undefined);
  const nextGateReady = targetGate ? canOpenGate(targetGate, { readme: p, people }).permitted : false;

  return {
    id,
    title: demandTitle(p, id),
    ...(p.state.stage ? { stage: p.state.stage } : {}),
    ...(p.state.lane ? { lane: p.state.lane } : {}),
    ...(p.state.status ? { status: p.state.status } : {}),
    ...(p.state.plant ? { plant: p.state.plant } : {}),
    ...(p.state.domain ? { domain: p.state.domain } : {}),
    ...(p.state.level ? { level: p.state.level } : {}),
    ...(p.state.heat ? { heat: p.state.heat } : {}),
    ...(people.sponsor ? { sponsor: people.sponsor } : {}),
    ...(people.requester ? { requester: people.requester } : {}),
    ...(since ? { since } : {}),
    ...(p.state.confidential ? { confidential: true } : {}),
    ...(demandNeedsAttention(p) ? { needsAttention: true } : {}),
    ...(targetGate ? { targetGate } : {}),
    ...(nextGateReady ? { nextGateReady: true } : {}),
  };
}

export async function listDemandRows(baseDir = root()): Promise<RegistryRow[]> {
  const ids = await listDemandIds(baseDir);
  // Fan out per-case reads with bounded concurrency (was a serial N+1 loop).
  const parsed = await mapPool(ids, FETCH_CONCURRENCY, async (id): Promise<RegistryRow | null> => {
    const md = await readDemand(id, baseDir);
    if (md === undefined) return null;
    return demandRowFromMarkdown(id, md);
  });
  return parsed.filter((r): r is RegistryRow => r !== null);
}

/**
 * Portfolio rows enriched with REAL value from each case's `business-case.md`, when
 * one exists. A demand carries no value until a business case is drafted — so this
 * reads the actual artifact (never a seeded figure): its annual-gross becomes
 * `valueRealized` when the case's confidence is "realized", else `valueProjected`.
 * Cases without a business case simply have no value, which is the honest state of
 * a fresh funnel.
 */
export async function listDemandRowsWithValue(baseDir = root()): Promise<RegistryRow[]> {
  const rows = await listDemandRows(baseDir);
  await mapPool(rows, FETCH_CONCURRENCY, async (r) => {
    const bc = await readArtifact(r.id, "business-case", baseDir).catch(() => undefined);
    if (!bc) return;
    const facts = parseBusinessCase(bc);
    if (facts.annualGross === undefined) return;
    if (facts.confidence === "realized") r.valueRealized = facts.annualGross;
    else r.valueProjected = facts.annualGross;
  });
  return rows;
}

export interface DemandSaveResult {
  host: "github" | "local";
  /** "main" for github, "working tree" for local. */
  target: string;
  repo: string;
  path: string;
}

/**
 * Write a file at `path` (relative to the funnel repo) to GitHub main or the working
 * tree. `createOnly` refuses to overwrite an existing path (throws `FileExistsError`)
 * — the guard the id allocator relies on so a race can never clobber a demand.
 */
async function writeToFunnel(path: string, content: string, message: string, baseDir?: string, createOnly?: boolean): Promise<DemandSaveResult> {
  const host = getGitHost();
  if (host instanceof LocalHost) {
    const abs = join(baseDir ?? root(), path);
    await mkdir(dirname(abs), { recursive: true });
    // createOnly → atomic O_CREAT|O_EXCL so a race can't clobber (see LocalHost.putFile).
    try {
      await writeFile(abs, content, createOnly ? { flag: "wx" } : undefined);
    } catch (err) {
      if (createOnly && (err as NodeJS.ErrnoException).code === "EEXIST") throw new FileExistsError(path);
      throw err;
    }
    return { host: "local", target: "working tree", repo: demandsRepoName(), path };
  }
  const repo = funnelRepo();
  await host.putFile(repo, { path, content }, message, "main", { createOnly: createOnly ?? false });
  return { host: "github", target: "main", repo: repo.name, path };
}

/** Persist a case record (README.md) to the funnel repo. `createOnly` refuses to overwrite. */
export async function saveDemand(id: string, markdown: string, opts?: { baseDir?: string; message?: string; createOnly?: boolean }): Promise<DemandSaveResult> {
  return writeToFunnel(readmePath(id), markdown, opts?.message ?? `Capture demand ${id}`, opts?.baseDir, opts?.createOnly);
}

/**
 * Allocate a unique id and write a NEW demand, retrying on collision. Two concurrent
 * captures can compute the same `UC-YYYY-NNNN`; a create-only write makes the loser
 * fail with `FileExistsError` instead of silently overwriting the winner, and we
 * re-allocate against the now-larger id set. Converges in a couple of rounds even
 * under heavy concurrency; throws if it can't after `maxAttempts`.
 */
export async function saveNewDemand(
  year: number,
  build: (id: string) => string,
  opts?: { baseDir?: string; maxAttempts?: number },
): Promise<{ id: string; result: DemandSaveResult; markdown: string }> {
  const maxAttempts = opts?.maxAttempts ?? 12;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const existing = await listDemandIds(opts?.baseDir);
    const id = nextDemandId(existing, year);
    const markdown = build(id);
    try {
      const result = await saveDemand(id, markdown, { baseDir: opts?.baseDir, createOnly: true, message: `Capture demand ${id}` });
      return { id, result, markdown };
    } catch (err) {
      if (err instanceof FileExistsError) { lastErr = err; continue; } // id race — retry with a fresh id
      throw err;
    }
  }
  throw new Error(`Could not allocate a unique demand id after ${maxAttempts} attempts: ${lastErr instanceof Error ? lastErr.message : "unknown"}`);
}

/** Persist a standardized artifact (requirements / analysis / …) to the case folder. */
export async function saveArtifact(id: string, name: string, markdown: string, opts?: { baseDir?: string; message?: string }): Promise<DemandSaveResult> {
  return writeToFunnel(artifactPath(id, name), markdown, opts?.message ?? `Add ${name} for ${id}`, opts?.baseDir);
}
