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
import { parseUseCase } from "./parse.js";
import { getGitHost, type RepoRef } from "./git/index.js";
import { LocalHost } from "./git/local-host.js";
import type { Lane, Stage, Status } from "./types.js";

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

/** All case ids present in the funnel (folders with a README.md). */
export async function listDemandIds(baseDir = root()): Promise<string[]> {
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
  return readFile(join(baseDir, readmePath(id)), "utf8").catch(() => undefined);
}

/** Names (without .md) of the standardized artifacts a case has, besides README. */
export async function listArtifacts(id: string, baseDir = root()): Promise<string[]> {
  const dir = join(baseDir, caseDir(id));
  const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".md") && f.toUpperCase() !== README.toUpperCase());
  return files.map((f) => f.replace(/\.md$/i, "")).sort();
}

/** Read one standardized artifact (e.g. "requirements"), or undefined. */
export async function readArtifact(id: string, name: string, baseDir = root()): Promise<string | undefined> {
  return readFile(join(baseDir, artifactPath(id, name)), "utf8").catch(() => undefined);
}

/** Parse every case into a board-ready summary; unreadable ones surface, never vanish. */
export async function listDemands(baseDir = root()): Promise<DemandSummary[]> {
  const ids = await listDemandIds(baseDir);
  const out: DemandSummary[] = [];
  for (const id of ids) {
    const md = await readDemand(id, baseDir);
    if (md === undefined) continue;
    const p = parseUseCase(md);
    const laneRaw = (p.state.raw["lane"] ?? "").toLowerCase();
    const otherErrors = p.parseErrors.filter(
      (e) => !(e.section === "state" && laneRaw === "unassigned" && /lane/i.test(e.message)),
    );
    const needsAttention = p.state.stage === undefined || otherErrors.some((e) => e.section === "state");
    out.push({
      id,
      title: p.title?.replace(/^UC-\d{4}-\d+\s*·\s*/, "") ?? id,
      ...(p.state.stage ? { stage: p.state.stage } : {}),
      lane: (p.state.lane ?? (laneRaw === "unassigned" ? "unassigned" : undefined)) as DemandSummary["lane"],
      ...(p.state.status ? { status: p.state.status } : {}),
      ...(p.state.plant ? { plant: p.state.plant } : {}),
      ...(p.state.domain ? { domain: p.state.domain } : {}),
      ...(p.state.created ? { created: p.state.created } : {}),
      needsAttention,
      artifacts: await listArtifacts(id, baseDir),
    });
  }
  return out;
}

export interface DemandSaveResult {
  host: "github" | "local";
  /** "main" for github, "working tree" for local. */
  target: string;
  repo: string;
  path: string;
}

function demandsRepoName(env = process.env): string {
  return env.DEMANDS_REPO ?? "du-demands";
}

/** Write a file at `path` (relative to the funnel repo) to GitHub main or the working tree. */
async function writeToFunnel(path: string, content: string, message: string, baseDir?: string): Promise<DemandSaveResult> {
  const host = getGitHost();
  if (host instanceof LocalHost) {
    const abs = join(baseDir ?? root(), path);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, content);
    return { host: "local", target: "working tree", repo: demandsRepoName(), path };
  }
  const org = process.env.GITHUB_ORG ?? "org";
  const repo: RepoRef = { owner: org, name: demandsRepoName(), url: `https://github.com/${org}/${demandsRepoName()}`, local: false };
  await host.putFile(repo, { path, content }, message, "main");
  return { host: "github", target: "main", repo: repo.name, path };
}

/** Persist a case record (README.md) to the funnel repo. */
export async function saveDemand(id: string, markdown: string, opts?: { baseDir?: string; message?: string }): Promise<DemandSaveResult> {
  return writeToFunnel(readmePath(id), markdown, opts?.message ?? `Capture demand ${id}`, opts?.baseDir);
}

/** Persist a standardized artifact (requirements / analysis / …) to the case folder. */
export async function saveArtifact(id: string, name: string, markdown: string, opts?: { baseDir?: string; message?: string }): Promise<DemandSaveResult> {
  return writeToFunnel(artifactPath(id, name), markdown, opts?.message ?? `Add ${name} for ${id}`, opts?.baseDir);
}
