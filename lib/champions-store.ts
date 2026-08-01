/**
 * The champions register, stored in git — one JSON document for the whole
 * register, because it is a short list read as a whole and edited rarely.
 *
 * The register is the CURATED half. The other half is derived: coverage is
 * computed against the plants and domains the portal already manages, and load
 * and candidates come from the process engagements and the demand funnel. That
 * split is deliberate — a register nobody maintains goes stale in a month, so as
 * much as possible is read from work that is happening anyway.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getGitHost, hasGitHubCredentials, type RepoRef } from "./git/index.js";
import { completeChampion, nextChampionId, type Champion } from "./champions.js";

const FILE = "champions/register.json";

function live(): boolean {
  return hasGitHubCredentials();
}
function repo(): RepoRef {
  const org = process.env.GITHUB_ORG ?? "org";
  const name = process.env.CHAMPION_REPO ?? process.env.PROCESS_REPO ?? "du-processes";
  return { owner: org, name, url: `https://github.com/${org}/${name}`, local: false };
}
function localBase(): string {
  return process.env.CHAMPION_DATA_DIR ?? process.env.PROCESS_DATA_DIR ?? path.join(os.tmpdir(), "du-processes");
}

export async function listChampions(): Promise<Champion[]> {
  const raw = live()
    ? await getGitHost().getFile(repo(), FILE)
    : await readFile(path.join(localBase(), FILE), "utf8").catch(() => undefined);
  if (raw === undefined) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return (v as Partial<Champion>[])
      .filter((c) => typeof c?.id === "string")
      .map((c) => completeChampion(c, c.id!))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  } catch {
    // A corrupt register must not read as an empty one: an empty register makes
    // every cell a gap, and the next save would write that over the real list.
    throw Object.assign(new Error("the champions register is not valid JSON"), { status: 500 });
  }
}

async function put(all: Champion[], message: string): Promise<void> {
  const body = JSON.stringify(all, null, 2);
  if (live()) {
    await getGitHost().putFile(repo(), { path: FILE, content: body }, message, "main");
    return;
  }
  const abs = path.join(localBase(), FILE);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body);
}

export async function createChampion(input: Partial<Champion>, now: string): Promise<Champion> {
  const all = await listChampions();
  const c = completeChampion(input, nextChampionId(all.map((x) => x.id)), now);
  await put([...all, c], `Add champion ${c.id} ${c.name}`);
  return c;
}

export async function writeChampion(id: string, patch: Partial<Champion>, now: string): Promise<Champion> {
  const all = await listChampions();
  const i = all.findIndex((c) => c.id === id);
  if (i < 0) throw Object.assign(new Error(`no such champion: ${id}`), { status: 404 });
  const updated = completeChampion({ ...all[i]!, ...patch }, id, now);
  all[i] = updated;
  await put(all, `Update champion ${id} ${updated.name}`);
  return updated;
}

/**
 * Hand the role back. The record STAYS with an end date rather than being
 * deleted: the coverage map has to show the resulting hole, and the history of
 * who covered what is the only way to tell a gap that has always been there from
 * one that just opened.
 */
export async function standDown(id: string, on: string, now: string): Promise<Champion> {
  return writeChampion(id, { until: on.slice(0, 10) }, now);
}
