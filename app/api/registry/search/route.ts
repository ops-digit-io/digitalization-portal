import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { searchSkills } from "@/lib/skill-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Search the skill marketplace for a task and return importable hits. Read-only:
 * surfaces candidates only — importing is a separate, human-driven step.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!can(session, "draft")) {
    return NextResponse.json({ error: "missing capability: draft" }, { status: 403 });
  }

  let query = "";
  try {
    const body = await req.json();
    query = typeof body?.query === "string" ? body.query : "";
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (query.trim() === "") return NextResponse.json({ hits: [] });

  try {
    const hits = await searchSkills(query);
    return NextResponse.json({ hits });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "search failed" }, { status: 502 });
  }
}
