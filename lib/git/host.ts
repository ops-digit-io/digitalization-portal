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

/**
 * Thrown by `putFile` with `{ createOnly: true }` when the target path already
 * exists. The funnel's id allocator catches this to retry with a fresh id instead
 * of overwriting a concurrently-created demand (the write-race that risks data loss
 * at scale).
 */
export class FileExistsError extends Error {
  constructor(path: string) {
    super(`File already exists: ${path}`);
    this.name = "FileExistsError";
  }
}

export interface PutFileOptions {
  /** When true, never overwrite: throw `FileExistsError` if the path already exists. */
  createOnly?: boolean;
}

export interface GitHost {
  readonly kind: "github" | "local";
  /** Create a repository under the configured org/workspace. `template: true` marks
   *  it as a GitHub template repository (so others can generate from it). */
  createRepo(name: string, opts?: { description?: string; private?: boolean; template?: boolean }): Promise<RepoRef>;
  /**
   * Create a repository FROM a GitHub template repository (generate-from-template).
   * Optional: a host that cannot do this omits it, and the caller falls back to
   * `createRepo` + writing the files. GitHub copies template files verbatim (no
   * placeholder substitution), so the caller still overlays any seed-specific files.
   */
  createRepoFromTemplate?(
    name: string,
    template: { owner: string; repo: string },
    opts?: { description?: string; private?: boolean },
  ): Promise<RepoRef>;
  /** Whether a repo exists and whether it is flagged a GitHub template — for the
   *  template-repo health check. Optional: a host that cannot look this up omits it,
   *  and the caller reports the status as unknown. */
  getRepoMeta?(name: string): Promise<{ exists: boolean; isTemplate: boolean }>;
  /** Write a file on a branch. `opts.createOnly` refuses to overwrite an existing path. */
  putFile(repo: RepoRef, file: FileWrite, message: string, branch: string, opts?: PutFileOptions): Promise<void>;
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

/**
 * True when GitHub App credentials are present. The installation id is NOT
 * required — the host discovers it from the org (`GET /orgs/{org}/installation`),
 * so a missing or wrong `GITHUB_APP_INSTALLATION_ID` can never break auth.
 */
export function hasGitHubCredentials(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY && env.GITHUB_ORG);
}
