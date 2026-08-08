/**
 * Where the portal's EXTERNAL content lives — governance and templates.
 *
 * Neither is held in this repository any more. The agent library (playbooks,
 * skills, contracts) lives in `du-agent-registry`; the artefact templates live in
 * `du-templates`. The app repo carries the engines and the UI, and nothing that
 * encodes the method — that separation is the point: the portal can be read,
 * forked or handed over without handing over the intellectual property that makes
 * it work, and the method can be edited by the people who own it without touching
 * an application deploy.
 *
 * Resolution, in order:
 *
 *   1. GitHub, when the App is configured. The live source of truth: an edit in
 *      the registry takes effect on the next request, with no deploy.
 *   2. A local MIRROR directory outside the app repo (`npm run content:pull`
 *      populates it). This is what makes offline development and CI possible
 *      without the content ever sitting in this repository.
 *   3. Nothing — and the caller is told. `compose.ts` writes the absence into the
 *      prompt and marks the run unhealthy rather than letting an agent proceed
 *      quietly on partial governance.
 *
 * The mirror deliberately defaults to a path OUTSIDE the working tree. A default
 * inside it would be re-created by the first `content:pull` and quietly become
 * exactly the bundled copy this change removed.
 */

import { readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getGitHost, hasGitHubCredentials, type DirEntry, type RepoRef } from "./git/index.js";

export interface ContentRepo {
  /** Short name used in messages and env-var docs. */
  key: "registry" | "templates" | "specifications" | "organization";
  repoName: string;
  mirrorDir: string;
  /** Directory to list when probing reachability (a repo is "there" if this lists ≥1). */
  probe: string;
}

/** The agent library: playbooks, skills, contracts. */
export function registryRepo(env = process.env): ContentRepo {
  return {
    key: "registry",
    repoName: env.REGISTRY_REPO ?? "du-agent-registry",
    mirrorDir: env.REGISTRY_MIRROR_DIR ?? path.join(os.tmpdir(), "du-agent-registry"),
    probe: "playbooks",
  };
}

/** The artefact templates: what a produced document is shaped like. */
export function templatesRepo(env = process.env): ContentRepo {
  return {
    key: "templates",
    repoName: env.TEMPLATES_REPO ?? "du-templates",
    mirrorDir: env.TEMPLATES_MIRROR_DIR ?? path.join(os.tmpdir(), "du-templates"),
    probe: "sections",
  };
}

/** The specification documents — the portal's spec, surfaced by the /docs reader. */
export function specificationsRepo(env = process.env): ContentRepo {
  return {
    key: "specifications",
    repoName: env.SPECIFICATIONS_REPO ?? "du-specifications",
    mirrorDir: env.SPECIFICATIONS_MIRROR_DIR ?? path.join(os.tmpdir(), "du-specifications"),
    // Specs live at the repo root as flat markdown; the root itself is the probe.
    probe: "",
  };
}

/**
 * The organization context — Department OS. Each department is a folder of the
 * declarative context layer (charter, strategy, service-catalog, …), read so the
 * portal's tools know the org behind the demands and processes they run.
 */
export function organizationRepo(env = process.env): ContentRepo {
  return {
    key: "organization",
    repoName: env.ORGANIZATION_REPO ?? "du-organization-context",
    mirrorDir: env.ORGANIZATION_MIRROR_DIR ?? path.join(os.tmpdir(), "du-organization-context"),
    probe: "departments",
  };
}

export function live(): boolean {
  return hasGitHubCredentials();
}

function ref(c: ContentRepo): RepoRef {
  const org = process.env.GITHUB_ORG ?? "org";
  return { owner: org, name: c.repoName, url: `https://github.com/${org}/${c.repoName}`, local: false };
}

/** Guard against a name escaping its directory. */
export function safeRel(rel: string): string {
  return rel
    .split("/")
    .filter((seg) => seg !== "" && seg !== "." && seg !== "..")
    .join("/");
}

/**
 * Read one file. `undefined` means "not there" in BOTH modes — a live 404 and a
 * missing mirror file are the same answer to the caller, and a genuine outage
 * throws out of the GitHost rather than being flattened to absence.
 */
export async function readContent(c: ContentRepo, rel: string): Promise<string | undefined> {
  const clean = safeRel(rel);
  if (live()) return getGitHost().getFile(ref(c), clean);
  return readFile(path.join(c.mirrorDir, clean), "utf8").catch(() => undefined);
}

/** List a directory. Empty when the directory does not exist. */
export async function listContent(c: ContentRepo, rel: string): Promise<DirEntry[]> {
  const clean = safeRel(rel);
  if (live()) return getGitHost().listDir(ref(c), clean);
  const ents = await readdir(path.join(c.mirrorDir, clean), { withFileTypes: true }).catch(() => []);
  return ents.map((e) => ({
    name: e.name,
    type: e.isDirectory() ? ("dir" as const) : ("file" as const),
    path: `${clean}/${e.name}`,
  }));
}

/**
 * Whether the content is reachable at all right now — for `/api/status`, so an
 * unreachable registry shows up in the header instead of surfacing later as every
 * agent mysteriously losing its playbook.
 */
export async function contentReachable(c: ContentRepo): Promise<{ ok: boolean; source: "github" | "mirror" | "none"; detail: string }> {
  if (live()) {
    try {
      const ents = await getGitHost().listDir(ref(c), c.probe);
      return ents.length > 0
        ? { ok: true, source: "github", detail: `${c.repoName} · ${ents.length} entries` }
        : { ok: false, source: "github", detail: `${c.repoName} reachable but empty` };
    } catch (e) {
      return { ok: false, source: "github", detail: (e instanceof Error ? e.message : String(e)).slice(0, 160) };
    }
  }
  const probe = await readdir(path.join(c.mirrorDir, c.probe)).catch(() => null);
  if (probe === null) {
    return { ok: false, source: "none", detail: `no mirror at ${c.mirrorDir} — run: npm run content:pull` };
  }
  return { ok: true, source: "mirror", detail: `${c.mirrorDir} · ${probe.length} entries` };
}
