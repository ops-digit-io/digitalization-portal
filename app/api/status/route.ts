/**
 * `/api/status` — runtime integration status for the header chip. Dynamic, so it
 * reflects the live environment (a statically prerendered layout would bake in the
 * build-time env). Returns only derived facts — provider name, model name, and
 * booleans — never the keys themselves (constraint #7).
 */

import { NextResponse } from "next/server";
import { resolveStatus } from "@/lib/model-settings";
import { probeProvider } from "@/lib/agent/health";
import { hasGitHubCredentials } from "@/lib/git/host";
import { getGitHost } from "@/lib/git";
import { getCurrentUser } from "@/lib/auth/current";
import { contentReachable, registryRepo, templatesRepo } from "@/lib/content-repo";

/**
 * Does the git system-of-record actually answer? Presence of credentials says
 * nothing about a revoked key, a missing installation, or a renamed repo — the
 * same gap `probeProvider` closes for the model key. One bounded read, and the
 * error comes back sanitised (statuses and messages, never tokens).
 */
async function probeGit(): Promise<{ live: boolean; ok: boolean; error?: string }> {
  if (!hasGitHubCredentials()) return { live: false, ok: false };
  const org = process.env.GITHUB_ORG ?? "org";
  const name = process.env.PROCESS_REPO ?? "du-processes";
  try {
    await getGitHost().listDir({ owner: org, name, url: `https://github.com/${org}/${name}`, local: false }, "processes");
    return { live: true, ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { live: true, ok: false, error: msg.replace(/(token|Bearer)\s+\S+/gi, "$1 ***").slice(0, 200) };
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `?probe=1` additionally makes one minimal live request to verify the model key
 * actually works (returns `health`). Without it, only presence-derived facts are
 * returned — fast and free.
 */
export async function GET(req: Request) {
  const probe = new URL(req.url).searchParams.get("probe") === "1";
  const cu = await getCurrentUser();
  const body: Record<string, unknown> = {
    model: await resolveStatus(),
    git: { live: hasGitHubCredentials() },
    user: {
      name: cu.name ?? cu.session.user,
      email: cu.session.user,
      authenticated: cu.authenticated,
      demo: cu.demo,
      roles: cu.session.roles,
    },
  };
  // The library and the templates are in their own repos now, so "can we reach
  // them" is a first-class status question: unreachable governance surfaces here
  // rather than later as every agent mysteriously losing its playbook.
  const [registry, templates] = await Promise.all([
    contentReachable(registryRepo()),
    contentReachable(templatesRepo()),
  ]);
  body.content = { registry, templates };

  if (probe) {
    const [health, git] = await Promise.all([probeProvider(), probeGit()]);
    body.health = health;
    body.gitHealth = git;
  }
  return NextResponse.json(body);
}
