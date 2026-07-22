/**
 * The central intake store (`docs/ARCHITECTURE-intake.md`).
 *
 * Every demand the Digital Unit takes in lives as one markdown page in ONE
 * repository — `du-demands`. There is no repository per demand at intake. A demand
 * earns its own `uc-*` repository only at the PoC stage, when the PoC builder
 * calls `createRepo` (`lib/poc/scaffold.ts`); until then the central repo is its
 * home through S1–S3. This keeps the fleet legible: the whole early funnel is one
 * repo of markdown, not hundreds of near-empty repositories.
 *
 * Same live-or-offline shape as the skills registry: LIST reads the working tree
 * the app ships (`demands/`), so the demo has content with no credentials; SAVE
 * commits to `du-demands`'s `main` when the GitHub App is configured, else writes
 * the working tree so the change is live at once. This is the central intake repo,
 * not a use-case gate PR — writing it directly is correct (no gate is crossed).
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseUseCase } from "./parse.js";
import { getGitHost, type RepoRef } from "./git/index.js";
import { LocalHost } from "./git/local-host.js";
import type { Lane, Stage, Status } from "./types.js";

const DIR = "demands";

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
}

function root(): string {
  return process.cwd();
}

/** The file for a demand id: demands/<UC-ID>.md (uppercased, sanitised). */
function fileFor(id: string): string {
  const safe = id.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return `${DIR}/${safe}.md`;
}

/** All demand ids present in the central store (working tree). */
export async function listDemandIds(baseDir = root()): Promise<string[]> {
  const dir = join(baseDir, DIR);
  const files = (await readdir(dir).catch(() => [])).filter(
    (f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md",
  );
  return files.map((f) => f.replace(/\.md$/i, "")).sort();
}

/** Raw markdown for one demand, or undefined if absent. */
export async function readDemand(id: string, baseDir = root()): Promise<string | undefined> {
  return readFile(join(baseDir, fileFor(id)), "utf8").catch(() => undefined);
}

/** Parse every demand into a board-ready summary; unreadable ones surface, never vanish. */
export async function listDemands(baseDir = root()): Promise<DemandSummary[]> {
  const ids = await listDemandIds(baseDir);
  const out: DemandSummary[] = [];
  for (const id of ids) {
    const md = await readDemand(id, baseDir);
    if (md === undefined) continue;
    const p = parseUseCase(md);
    const laneRaw = (p.state.raw["lane"] ?? "").toLowerCase();
    // "unassigned" is a normal demand state, not a broken one — the lane is
    // decided at triage, not at intake. Ignore the parser's lane error for it.
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

/**
 * Persist a demand's markdown to the central intake repo. GitHub → commit to
 * `main` (no PR: the central repo is not a gated use-case repo); local → write
 * the working tree. `opts.baseDir` overrides the local root (tests).
 */
export async function saveDemand(
  id: string,
  markdown: string,
  opts?: { baseDir?: string; message?: string },
): Promise<DemandSaveResult> {
  const host = getGitHost();
  const path = fileFor(id);

  if (host instanceof LocalHost) {
    const abs = join(opts?.baseDir ?? root(), path);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, markdown);
    return { host: "local", target: "working tree", repo: demandsRepoName(), path };
  }

  const org = process.env.GITHUB_ORG ?? "org";
  const repo: RepoRef = {
    owner: org,
    name: demandsRepoName(),
    url: `https://github.com/${org}/${demandsRepoName()}`,
    local: false,
  };
  await host.putFile(repo, { path, content: markdown }, opts?.message ?? `Capture demand ${id}`, "main");
  return { host: "github", target: "main", repo: repo.name, path };
}
