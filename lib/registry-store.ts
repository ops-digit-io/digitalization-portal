/**
 * Skills & Playbooks registry store (docs/10-skills.md, docs/11-playbooks.md).
 *
 * The registry is git. Following the Agent Skills convention, a SKILL is a
 * BUNDLE — a directory `skills/<name>/SKILL.md` plus supporting files
 * (`references/`, `scripts/`, `assets/`, `templates/`). Playbooks are single
 * markdown files. Legacy single-file skills (`skills/<name>.md`) are still read.
 *
 * This module READS the live registry and PROPOSES changes (add/edit/delete
 * across multiple files) by opening ONE pull request on a dedicated registry repo
 * via GitHost. It never commits to main and never merges — skill/playbook changes
 * require a second approver at merge (§4.5), enforced by CODEOWNERS.
 *
 * Live GitHub when the App + REGISTRY_REPO are set; local workspace fallback.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { loadPlaybook, loadSkill } from "./agent/skills.js";
import { getGitHost, type PullRequestRef, type RepoRef } from "./git/index.js";
import { LocalHost } from "./git/local-host.js";
import { slugify } from "./poc/scaffold.js";

export type EntryType = "skill" | "playbook";

export interface RegistryEntry {
  type: EntryType;
  name: string;
  title: string;
  description: string;
  capabilities: string[];
  tools: string[];
  skills: string[];
  checkpoints: string[];
  /** True when the entry is a directory bundle (skills). */
  bundle: boolean;
  /** Files in the entry, relative to the entry root. Entry file first. */
  files: string[];
}

const DIR: Record<EntryType, string> = { skill: "skills", playbook: "playbooks" };
/** The entry file inside a skill bundle. */
export const ENTRY_FILE = "SKILL.md";

function root(): string {
  return process.cwd();
}

async function isDir(p: string): Promise<boolean> {
  return stat(p).then((s) => s.isDirectory()).catch(() => false);
}

async function walk(dir: string, base = ""): Promise<string[]> {
  const out: string[] = [];
  const ents = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of ents) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(join(dir, e.name), rel)));
    else out.push(rel);
  }
  return out;
}

/** SKILL.md / entry file first, then the rest alphabetically. */
function orderFiles(files: string[], entryFile: string): string[] {
  const rest = files.filter((f) => f !== entryFile).sort();
  return files.includes(entryFile) ? [entryFile, ...rest] : rest;
}

async function metaFrom(type: EntryType, name: string, entrySource: string, bundle: boolean, files: string[]): Promise<RegistryEntry> {
  if (type === "skill") {
    const s = loadSkill(entrySource, name);
    return { type, name, title: s.name, description: s.description, capabilities: s.capabilities, tools: s.tools, skills: [], checkpoints: [], bundle, files };
  }
  const p = loadPlaybook(entrySource, name);
  return { type, name, title: p.name, description: p.description, capabilities: [], tools: [], skills: p.skills, checkpoints: p.checkpoints, bundle, files };
}

async function listSkills(): Promise<RegistryEntry[]> {
  const dir = join(root(), DIR.skill);
  const ents = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const out: RegistryEntry[] = [];
  for (const e of ents) {
    if (e.name.toLowerCase() === "readme.md") continue;
    if (e.isDirectory()) {
      const entryPath = join(dir, e.name, ENTRY_FILE);
      const source = await readFile(entryPath, "utf8").catch(() => undefined);
      if (source === undefined) continue; // a dir without SKILL.md is not a bundle
      const files = orderFiles(await walk(join(dir, e.name)), ENTRY_FILE);
      out.push(await metaFrom("skill", e.name, source, true, files));
    } else if (e.name.endsWith(".md")) {
      const name = e.name.replace(/\.md$/, "");
      const source = await readFile(join(dir, e.name), "utf8").catch(() => "");
      out.push(await metaFrom("skill", name, source, false, [`${name}.md`]));
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

async function listPlaybooks(): Promise<RegistryEntry[]> {
  const dir = join(root(), DIR.playbook);
  const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md");
  const out: RegistryEntry[] = [];
  for (const file of files.sort()) {
    const name = file.replace(/\.md$/, "");
    const source = await readFile(join(dir, file), "utf8").catch(() => "");
    out.push(await metaFrom("playbook", name, source, false, [file]));
  }
  return out;
}

export async function listRegistry(): Promise<{ skills: RegistryEntry[]; playbooks: RegistryEntry[] }> {
  const [skills, playbooks] = await Promise.all([listSkills(), listPlaybooks()]);
  return { skills, playbooks };
}

function safe(seg: string): string {
  return seg.replace(/[^a-z0-9._/-]/gi, "").replace(/\.\.+/g, ".");
}

/** Absolute on-disk path for a file within an entry (default: the entry file). */
async function resolvePath(type: EntryType, name: string, relPath?: string): Promise<{ path: string; bundle: boolean }> {
  if (type === "skill") {
    const bundleDir = join(root(), DIR.skill, safe(name));
    if (await isDir(bundleDir)) {
      return { path: join(bundleDir, safe(relPath ?? ENTRY_FILE)), bundle: true };
    }
    return { path: join(root(), DIR.skill, `${safe(name)}.md`), bundle: false };
  }
  return { path: join(root(), DIR.playbook, `${safe(name)}.md`), bundle: false };
}

/** Read one file within an entry. Returns undefined if absent. */
export async function readEntryFile(type: EntryType, name: string, relPath?: string): Promise<string | undefined> {
  const { path } = await resolvePath(type, name, relPath);
  return readFile(path, "utf8").catch(() => undefined);
}

/** Templates for new files. */
export function newFileTemplate(type: EntryType, name: string, relPath: string): string {
  if (type === "skill" && relPath === ENTRY_FILE) {
    return `---\nname: ${name}\ndescription: One line on what this skill does and when to use it.\ncapabilities: [view_board]\ntools: []\n---\n\n# ${name}\n\nGuidance for the assistant. You draft; humans decide. You never pass a gate or merge.\n\n## References\n\n- [references/notes.md](references/notes.md) — load only when needed.\n`;
  }
  if (type === "playbook") {
    return `---\nname: ${name}\ndescription: One line on what this playbook does.\nskills: []\ncheckpoints: []\n---\n\n# ${name}\n\nSteps the runner executes. Add a checkpoint before any step that writes.\n`;
  }
  // A supporting bundle file (reference/script/template).
  const title = relPath.split("/").pop()?.replace(/\.md$/, "") ?? relPath;
  return `# ${title}\n\nReference material for the ${name} skill.\n`;
}

export interface ProposeFile {
  /** Path relative to the entry (e.g. "SKILL.md", "references/metrics.md"). */
  path: string;
  content: string;
}

export interface ProposeResult {
  host: "github" | "local";
  repo: string;
  branch: string;
  paths: string[];
  pullRequest: PullRequestRef;
}

function registryRepoName(env = process.env): string {
  return env.REGISTRY_REPO ?? "du-agent-registry";
}

async function resolveRepo(): Promise<RepoRef> {
  const host = getGitHost();
  const name = registryRepoName();
  if (host instanceof LocalHost) {
    return host.createRepo(name, { description: "Digital Unit agent registry (skills & playbooks)" });
  }
  const org = process.env.GITHUB_ORG ?? "org";
  return { owner: org, name, url: `https://github.com/${org}/${name}`, local: false };
}

/** Map an entry-relative path to its path in the registry repo. */
function repoPath(type: EntryType, name: string, bundle: boolean, relPath: string): string {
  const slug = slugify(name) || safe(name).toLowerCase();
  if (type === "skill" && bundle) return `${DIR.skill}/${slug}/${safe(relPath)}`;
  if (type === "skill") return `${DIR.skill}/${slug}.md`;
  return `${DIR.playbook}/${slug}.md`;
}

/**
 * Propose an add/edit across one or more files of an entry as a SINGLE pull
 * request. Never merges. `bundle` selects the skill-bundle layout.
 */
export async function proposeChange(input: {
  type: EntryType;
  name: string;
  bundle: boolean;
  files: ProposeFile[];
  message: string;
}): Promise<ProposeResult> {
  const host = getGitHost();
  const repo = await resolveRepo();
  const slug = slugify(input.name) || safe(input.name).toLowerCase();
  const branch = `registry/${input.type}-${slug}`;

  await host.createBranch(repo, branch, "main");
  const paths: string[] = [];
  for (const f of input.files) {
    const path = repoPath(input.type, input.name, input.bundle, f.path);
    await host.putFile(repo, { path, content: f.content }, input.message, branch);
    paths.push(path);
  }

  const pullRequest = await host.openPullRequest(repo, {
    title: `registry: ${input.type} ${slug} (${paths.length} file${paths.length > 1 ? "s" : ""})`,
    head: branch,
    base: "main",
    body: `${input.message}\n\nFiles:\n${paths.map((p) => `- ${p}`).join("\n")}\n\nProposed via the portal. Changes to skills/playbooks require a second approver at merge (§4.5). The portal never merges.`,
  });

  return { host: host.kind, repo: repo.name, branch, paths, pullRequest };
}
