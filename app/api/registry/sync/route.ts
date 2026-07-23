import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { syncBundledToRegistry } from "@/lib/registry-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Seed the registry (`du-agent-registry`) from the portal's bundled skills &
 * playbooks. Adds missing entries by default; `{ overwrite: true }` forces all.
 * Writes the registry repo's main directly (never a gated repo, never a merge).
 */
export async function POST(req: Request) {
  const session = await getSession(); // real deployment resolves this from the OIDC session
  if (!can(session, "draft")) {
    return NextResponse.json({ error: "missing capability: draft" }, { status: 403 });
  }

  let overwrite = false;
  try {
    const body = await req.json();
    overwrite = Boolean(body?.overwrite);
  } catch {
    /* no body — default add-missing-only */
  }

  try {
    const report = await syncBundledToRegistry({ overwrite });
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "sync failed" }, { status: 500 });
  }
}
