/**
 * Git host factory — picks the real GitHub App path when credentials are present,
 * otherwise the local disk fallback. Same live-or-offline pattern as the model
 * provider, so the PoC builder runs here today and goes live when the GitHub App
 * is installed and credentialed.
 */

import { hasGitHubCredentials, type GitHost } from "./host.js";
import { GitHubHost } from "./github-host.js";
import { LocalHost } from "./local-host.js";

export { type GitHost, type RepoRef, type PullRequestRef, hasGitHubCredentials } from "./host.js";
export { LocalHost } from "./local-host.js";
export { GitHubHost } from "./github-host.js";

export function getGitHost(env: Record<string, string | undefined> = process.env): GitHost {
  if (hasGitHubCredentials(env)) return GitHubHost.fromEnv(env);
  return new LocalHost();
}
