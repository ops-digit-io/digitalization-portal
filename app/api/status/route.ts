/**
 * `/api/status` — runtime integration status for the header chip. Dynamic, so it
 * reflects the live environment (a statically prerendered layout would bake in the
 * build-time env). Returns only derived facts — provider name, model name, and
 * booleans — never the keys themselves (constraint #7).
 */

import { NextResponse } from "next/server";
import { describeProvider } from "@/lib/agent/provider";
import { hasGitHubCredentials } from "@/lib/git/host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    model: describeProvider(),
    git: { live: hasGitHubCredentials() },
  });
}
