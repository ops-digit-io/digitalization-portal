/**
 * Local Git host — materialises repositories to disk under a workspace directory.
 * The demo/offline path (no GitHub credentials needed). "Pull requests" are
 * recorded as JSON under `.pr/` so the flow is faithful without a real remote.
 *
 * Still no merge — a LocalHost PR is a record, never applied automatically.
 */

import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { DirEntry, FileWrite, GitHost, PullRequestRef, RepoRef } from "./host.js";

export class LocalHost implements GitHost {
  readonly kind = "local" as const;
  private readonly root: string;
  private readonly owner: string;

  constructor(opts?: { root?: string; owner?: string }) {
    this.root = opts?.root ?? join(process.cwd(), ".poc-workspace");
    this.owner = opts?.owner ?? "local";
  }

  private repoDir(name: string): string {
    return join(this.root, name);
  }

  async createRepo(name: string, opts?: { description?: string }): Promise<RepoRef> {
    const dir = this.repoDir(name);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".repo.json"),
      JSON.stringify({ name, description: opts?.description ?? "", createdBy: "portal-poc-builder" }, null, 2),
    );
    return { owner: this.owner, name, url: dir, local: true };
  }

  async putFile(repo: RepoRef, file: FileWrite, _message: string, branch: string): Promise<void> {
    // Branches map to subfolders under .branches/, main writes to the repo root.
    const base = branch === "main" ? repo.url : join(repo.url, ".branches", branch);
    const full = join(base, file.path);
    await mkdir(join(full, ".."), { recursive: true });
    await writeFile(full, file.content);
  }

  async getFile(repo: RepoRef, path: string, _ref?: string): Promise<string | undefined> {
    return readFile(join(repo.url, path), "utf8").catch(() => undefined);
  }

  async listDir(repo: RepoRef, path: string, _ref?: string): Promise<DirEntry[]> {
    const ents = await readdir(join(repo.url, path), { withFileTypes: true }).catch(() => []);
    return ents.map((e) => ({ name: e.name, type: e.isDirectory() ? "dir" : "file", path: path ? `${path}/${e.name}` : e.name }));
  }

  async createBranch(repo: RepoRef, branch: string, _fromBranch: string): Promise<void> {
    await mkdir(join(repo.url, ".branches", branch), { recursive: true });
  }

  async openPullRequest(
    repo: RepoRef,
    pr: { title: string; head: string; base: string; body: string },
  ): Promise<PullRequestRef> {
    const prDir = join(repo.url, ".pr");
    await mkdir(prDir, { recursive: true });
    // Number PRs by counting existing records.
    let number = 1;
    try {
      const idx = JSON.parse(await readFile(join(prDir, "index.json"), "utf8")) as number[];
      number = idx.length + 1;
      await writeFile(join(prDir, "index.json"), JSON.stringify([...idx, number]));
    } catch {
      await writeFile(join(prDir, "index.json"), JSON.stringify([number]));
    }
    const ref: PullRequestRef = {
      number,
      url: join(prDir, `${number}.json`),
      title: pr.title,
      head: pr.head,
      base: pr.base,
      local: true,
    };
    await writeFile(ref.url, JSON.stringify({ ...ref, body: pr.body }, null, 2));
    return ref;
  }
}
