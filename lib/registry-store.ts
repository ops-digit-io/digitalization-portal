/**
 * Skills & Playbooks registry store (docs/10-skills.md, docs/11-playbooks.md).
 *
 * The registry is git — skills and playbooks are markdown files with frontmatter.
 * This module:
 *   - READS the live registry (the portal's `skills/` and `playbooks/` folders);
 *   - PROPOSES changes (add/edit) by opening a PULL REQUEST on a dedicated
 *     registry repo via the existing GitHost. It never commits to main and never
 *     merges — changes to skills/playbooks require a second approver at merge
 *     (§4.5), enforced by CODEOWNERS on the registry repo.
 *
 * Live GitHub when the App is configured and `REGISTRY_REPO` is set; otherwise a
 * local workspace, so browsing and proposing work with no credentials.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadPlaybook, loadSkill } from "./agent/skills.js";
import { getGitHost, type PullRequestRef, type RepoRef } from "./git/index.js";
import { LocalHost } from "./git/local-host.js";
import { slugify } from "./poc/scaffold.js";

export type EntryType = "skill" | "playbook";

export interface RegistryEntry {
  type: EntryType;
  /** File name without extension — the stable id. */
  name: string;
  title: string;
  description: string;
  capabilities: string[];
  tools: string[];
  skills: string[];
  checkpoints: string[];
}

const DIR: Record<EntryType, string> = { skill: "skills", playbook: "playbooks" };

function root(): string {
  return process.cwd();
}

async function listDir(type: EntryType): Promise<RegistryEntry[]> {
  const dir = join(root(), DIR[type]);
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md");
  } catch {
    return [];
  }
  const entries: RegistryEntry[] = [];
  for (const file of files.sort()) {
    const name = file.replace(/\.md$/, "");
    const source = await readFile(join(dir, file), "utf8").catch(() => "");
    if (type === "skill") {
      const s = loadSkill(source, name);
      entries.push({ type, name, title: s.name, description: s.description, capabilities: s.capabilities, tools: s.tools, skills: [], checkpoints: [] });
    } else {
      const p = loadPlaybook(source, name);
      entries.push({ type, name, title: p.name, description: p.description, capabilities: [], tools: [], skills: p.skills, checkpoints: p.checkpoints });
    }
  }
  return entries;
}

/** List the whole registry. */
export async function listRegistry(): Promise<{ skills: RegistryEntry[]; playbooks: RegistryEntry[] }> {
  const [skills, playbooks] = await Promise.all([listDir("skill"), listDir("playbook")]);
  return { skills, playbooks };
}

/** Raw markdown for one entry. Returns undefined if absent. */
export async function readEntry(type: EntryType, name: string): Promise<string | undefined> {
  const safe = name.replace(/[^a-z0-9-_]/gi, "");
  const path = join(root(), DIR[type], `${safe}.md`);
  return readFile(path, "utf8").catch(() => undefined);
}

export interface ProposeResult {
  host: "github" | "local";
  repo: string;
  path: string;
  pullRequest: PullRequestRef;
}

/** Templates for new entries. */
export function newEntryTemplate(type: EntryType, name: string): string {
  if (type === "skill") {
    return `---\nname: ${name}\ndescription: One line on what this skill does.\ncapabilities: [view_board]\ntools: []\n---\n\n# ${name}\n\nGuidance for the assistant. You draft; humans decide. You never pass a gate or merge.\n`;
  }
  return `---\nname: ${name}\ndescription: One line on what this playbook does.\nskills: []\ncheckpoints: []\n---\n\n# ${name}\n\nSteps the runner executes. Add a checkpoint before any step that writes.\n`;
}

/** Registry repo the proposal targets. */
function registryRepoName(env = process.env): string {
  return env.REGISTRY_REPO ?? "du-agent-registry";
}

async function resolveRepo(): Promise<RepoRef> {
  const host = getGitHost();
  const name = registryRepoName();
  if (host instanceof LocalHost) {
    // Idempotent: ensures the local workspace repo exists.
    return host.createRepo(name, { description: "Digital Unit agent registry (skills & playbooks)" });
  }
  const org = process.env.GITHUB_ORG ?? "org";
  return { owner: org, name, url: `https://github.com/${org}/${name}`, local: false };
}

/**
 * Propose an add or edit as a pull request. Never merges. The invoking session
 * must hold `draft` (checked by the route). The merge (with a second approver)
 * remains a human act under CODEOWNERS.
 */
export async function proposeChange(input: {
  type: EntryType;
  name: string;
  content: string;
  message: string;
}): Promise<ProposeResult> {
  const host = getGitHost();
  const repo = await resolveRepo();
  const safe = slugify(input.name) || input.name.replace(/[^a-z0-9-_]/gi, "").toLowerCase();
  const path = `${DIR[input.type]}/${safe}.md`;
  const branch = `registry/${input.type}-${safe}`;

  await host.createBranch(repo, branch, "main");
  await host.putFile(repo, { path, content: input.content }, input.message, branch);
  const pullRequest = await host.openPullRequest(repo, {
    title: `registry: ${input.type} ${safe}`,
    head: branch,
    base: "main",
    body: `${input.message}\n\nProposed via the portal. Changes to skills/playbooks require a second approver at merge (§4.5). The portal never merges.`,
  });

  return { host: host.kind, repo: repo.name, path, pullRequest };
}
