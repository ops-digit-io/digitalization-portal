/**
 * Git host abstraction for the agentic PoC builder (Feature 3).
 *
 * The interface has NO merge method — by construction, nothing the portal calls
 * can merge a pull request (constraint #1). The host can create a repository,
 * write files, branch, and OPEN pull requests. The merge stays a human act under
 * CODEOWNERS, enforced by the platform outside this code's reach.
 *
 * Two implementations, chosen by `getGitHost()` from the environment:
 *   - `GitHubHost` — the real GitHub App path (live when GITHUB_APP_* is set).
 *   - `LocalHost`  — materialises to disk so the builder runs and demos with no
 *     credentials, exactly like the model provider's offline fallback.
 */

export interface RepoRef {
  owner: string;
  name: string;
  /** Web URL (real for GitHub, file path for local). */
  url: string;
  /** True for the local fallback. */
  local: boolean;
}

export interface FileWrite {
  path: string;
  content: string;
}

export interface PullRequestRef {
  number: number;
  url: string;
  title: string;
  head: string;
  base: string;
  /** True for the local fallback (recorded, not a real PR). */
  local: boolean;
}

export interface DirEntry {
  name: string;
  type: "file" | "dir";
  /** Path relative to the repo root. */
  path: string;
}

export interface GitHost {
  readonly kind: "github" | "local";
  /** Create a repository under the configured org/workspace. */
  createRepo(name: string, opts?: { description?: string; private?: boolean }): Promise<RepoRef>;
  /** Write (create or update) a file on a branch. */
  putFile(repo: RepoRef, file: FileWrite, message: string, branch: string): Promise<void>;
  /** Read a file's text (default branch, or `ref`). undefined if absent. */
  getFile(repo: RepoRef, path: string, ref?: string): Promise<string | undefined>;
  /** List a directory's entries (default branch, or `ref`). Empty if absent. */
  listDir(repo: RepoRef, path: string, ref?: string): Promise<DirEntry[]>;
  /** Create a branch from base (no-op if it exists). */
  createBranch(repo: RepoRef, branch: string, fromBranch: string): Promise<void>;
  /** Open a pull request. Never merges it. */
  openPullRequest(
    repo: RepoRef,
    pr: { title: string; head: string; base: string; body: string },
  ): Promise<PullRequestRef>;
}

/** True when GitHub App credentials are present. */
export function hasGitHubCredentials(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY && env.GITHUB_APP_INSTALLATION_ID && env.GITHUB_ORG);
}
