/**
 * `/api/status` — runtime integration status for the header chip. Dynamic, so it
 * reflects the live environment (a statically prerendered layout would bake in the
 * build-time env). Returns only derived facts — provider name, model name, and
 * booleans — never the keys themselves (constraint #7).
 */

import { NextResponse } from "next/server";
import { describeProvider } from "@/lib/agent/provider";
import { probeProvider } from "@/lib/agent/health";
import { hasGitHubCredentials } from "@/lib/git/host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `?probe=1` additionally makes one minimal live request to verify the model key
 * actually works (returns `health`). Without it, only presence-derived facts are
 * returned — fast and free.
 */
export async function GET(req: Request) {
  const probe = new URL(req.url).searchParams.get("probe") === "1";
  const body: Record<string, unknown> = {
    model: describeProvider(),
    git: { live: hasGitHubCredentials() },
  };
  if (probe) body.health = await probeProvider();
  return NextResponse.json(body);
}
