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

/**
 * Memoised host. Returned as a module singleton so the GitHubHost's cached
 * installation token (an instance field) SURVIVES across calls — otherwise every
 * `getGitHost()` re-mints the token (two extra API round-trips), and the funnel
 * reads call it once per case. Keyed by credentials presence so a config that adds
 * or removes creds still switches host cleanly (and tests that flip env work).
 */
let cachedHost: { github: boolean; host: GitHost } | undefined;

export function getGitHost(env: Record<string, string | undefined> = process.env): GitHost {
  const github = hasGitHubCredentials(env);
  if (cachedHost && cachedHost.github === github) return cachedHost.host;
  const host = github ? GitHubHost.fromEnv(env) : new LocalHost();
  cachedHost = { github, host };
  return host;
}
