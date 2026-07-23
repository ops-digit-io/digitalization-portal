/**
 * Real GitHub host via the GitHub App (Feature 3, live path).
 *
 * Mints an app JWT (RS256) → exchanges it for an installation token → drives the
 * REST API with `fetch`. No SDK dependency. Server-side only; credentials never
 * reach the browser (constraint #7). It creates repos, writes files, branches,
 * and opens pull requests — and, deliberately, has no way to merge (constraint #1).
 *
 * Live when GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY / GITHUB_APP_INSTALLATION_ID /
 * GITHUB_ORG are set. Untested inside this sandbox (no credentials); the LocalHost
 * fallback is what runs here.
 */

import { createSign } from "node:crypto";
import type { DirEntry, FileWrite, GitHost, PullRequestRef, RepoRef } from "./host.js";

const API = "https://api.github.com";

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface GitHubHostConfig {
  appId: string;
  privateKey: string;
  installationId: string;
  org: string;
}

export class GitHubHost implements GitHost {
  readonly kind = "github" as const;
  private token?: { value: string; expiresAt: number };

  constructor(private readonly cfg: GitHubHostConfig) {}

  static fromEnv(env: Record<string, string | undefined> = process.env): GitHubHost {
    return new GitHubHost({
      appId: env.GITHUB_APP_ID!,
      privateKey: (env.GITHUB_APP_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      installationId: env.GITHUB_APP_INSTALLATION_ID ?? "", // optional — discovered from the org if empty/wrong
      org: env.GITHUB_ORG!,
    });
  }

  /** Look up this App's installation on the org via the App JWT — the source of truth. */
  private async discoverInstallationId(): Promise<string> {
    const res = await fetch(`${API}/orgs/${this.cfg.org}/installation`, {
      headers: {
        authorization: `Bearer ${this.appJwt()}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
      },
    });
    if (res.status === 401) {
      throw new Error("GitHub App JWT rejected (401) — GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be from the SAME App, and the private key pasted in full.");
    }
    if (res.status === 404) {
      throw new Error(`GitHub App is not installed on org "${this.cfg.org}" (404). Open the App → Install App → install it on ${this.cfg.org} with access to the repos.`);
    }
    if (!res.ok) throw new Error(`GitHub org-installation lookup ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { id: number };
    return String(data.id);
  }

  private async requestToken(installationId: string): Promise<Response> {
    return fetch(`${API}/app/installations/${installationId}/access_tokens`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.appJwt()}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
      },
    });
  }

  private appJwt(): string {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = base64url(JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: this.cfg.appId }));
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${payload}`);
    const sig = base64url(signer.sign(this.cfg.privateKey));
    return `${header}.${payload}.${sig}`;
  }

  private async installationToken(): Promise<string> {
    if (this.token && this.token.expiresAt - 60_000 > Date.now()) return this.token.value;

    // Use the configured id if given, else discover it from the org.
    let id = this.cfg.installationId.trim() || (await this.discoverInstallationId());
    let res = await this.requestToken(id);

    // A configured id that 404s is wrong for this App/org — self-heal by discovering.
    if (res.status === 404 && this.cfg.installationId.trim()) {
      id = await this.discoverInstallationId();
      res = await this.requestToken(id);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const hint = res.status === 401 ? " — check GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY (same App, full key)." : "";
      throw new Error(`GitHub installation token ${res.status}${hint} :: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as { token: string; expires_at: string };
    this.token = { value: data.token, expiresAt: Date.parse(data.expires_at) };
    return data.token;
  }

  private async api<T>(path: string, init: RequestInit & { method: string }): Promise<T> {
    const token = await this.installationToken();
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        authorization: `token ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`GitHub ${init.method} ${path} → ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  async createRepo(name: string, opts?: { description?: string; private?: boolean }): Promise<RepoRef> {
    const data = await this.api<{ full_name: string; html_url: string }>(`/orgs/${this.cfg.org}/repos`, {
      method: "POST",
      body: JSON.stringify({
        name,
        description: opts?.description ?? "",
        private: opts?.private ?? true,
        auto_init: true,
      }),
    });
    return { owner: this.cfg.org, name, url: data.html_url, local: false };
  }

  async putFile(repo: RepoRef, file: FileWrite, message: string, branch: string): Promise<void> {
    // Look up an existing sha (update) — ignore 404 (create).
    let sha: string | undefined;
    try {
      const existing = await this.api<{ sha: string }>(
        `/repos/${repo.owner}/${repo.name}/contents/${encodeURI(file.path)}?ref=${branch}`,
        { method: "GET" },
      );
      sha = existing.sha;
    } catch {
      /* new file */
    }
    await this.api(`/repos/${repo.owner}/${repo.name}/contents/${encodeURI(file.path)}`, {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: Buffer.from(file.content).toString("base64"),
        branch,
        ...(sha ? { sha } : {}),
      }),
    });
  }

  async getFile(repo: RepoRef, path: string, ref?: string): Promise<string | undefined> {
    const q = ref ? `?ref=${encodeURIComponent(ref)}` : "";
    try {
      const data = await this.api<{ content?: string; encoding?: string }>(
        `/repos/${repo.owner}/${repo.name}/contents/${encodeURI(path)}${q}`,
        { method: "GET" },
      );
      if (data.content && data.encoding === "base64") return Buffer.from(data.content, "base64").toString("utf8");
      return undefined;
    } catch {
      return undefined; // 404 / not a file
    }
  }

  async listDir(repo: RepoRef, path: string, ref?: string): Promise<DirEntry[]> {
    const q = ref ? `?ref=${encodeURIComponent(ref)}` : "";
    try {
      const data = await this.api<{ name: string; type: string; path: string }[]>(
        `/repos/${repo.owner}/${repo.name}/contents/${encodeURI(path)}${q}`,
        { method: "GET" },
      );
      if (!Array.isArray(data)) return [];
      return data.map((e) => ({ name: e.name, type: e.type === "dir" ? "dir" : "file", path: e.path }));
    } catch {
      return []; // 404 / empty
    }
  }

  async createBranch(repo: RepoRef, branch: string, fromBranch: string): Promise<void> {
    const ref = await this.api<{ object: { sha: string } }>(
      `/repos/${repo.owner}/${repo.name}/git/ref/heads/${fromBranch}`,
      { method: "GET" },
    );
    await this.api(`/repos/${repo.owner}/${repo.name}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: ref.object.sha }),
    }).catch(() => {
      /* branch may already exist */
    });
  }

  async openPullRequest(
    repo: RepoRef,
    pr: { title: string; head: string; base: string; body: string },
  ): Promise<PullRequestRef> {
    const data = await this.api<{ number: number; html_url: string }>(
      `/repos/${repo.owner}/${repo.name}/pulls`,
      { method: "POST", body: JSON.stringify(pr) },
    );
    return { number: data.number, url: data.html_url, title: pr.title, head: pr.head, base: pr.base, local: false };
  }
}
