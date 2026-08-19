import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { readRegistry } from "@/lib/otx/source";
import { parseTools } from "@/lib/otx/toolscape";
import { parseLandscape } from "@/lib/otx/landscape";
import { addTool, listManualTools } from "@/lib/otx/tool-store";
import { consolidate, budget, summariseConsolidated } from "@/lib/otx/consolidate";
import { listDemandDocs } from "@/lib/demands-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The consolidated tool register — every source in one list.
 *
 * GET returns what `/landscape` renders, so the agent and any other client see
 * exactly the page's answer rather than re-deriving it. Each source degrades on
 * its own: a funnel that cannot be read costs the use-case links, not the
 * register, because the register is the answer this endpoint exists to give.
 *
 * POST records a tool by hand. It writes markdown to git (`landscape/tools.md`),
 * never a database row — adding a tool is a reviewable diff like every other
 * artifact here.
 */
export async function GET() {
  const session = await getSession();
  if (!can(session, "view_board")) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const [registerMd, landscapeMd, manual, demands] = await Promise.all([
    readRegistry("tools"),
    readRegistry("landscape"),
    listManualTools().catch(() => []),
    listDemandDocs().catch(() => []),
  ]);

  const entries = consolidate({
    register: parseTools(registerMd),
    manual,
    systems: parseLandscape(landscapeMd),
    demands,
  });

  return NextResponse.json({
    tools: entries,
    summary: summariseConsolidated(entries),
    budget: budget(entries),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!can(session, "draft")) return NextResponse.json({ error: "missing capability: draft" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // Ids must not collide with the shipped master's, which this route cannot write.
  const taken = parseTools(await readRegistry("tools")).map((t) => t.id);
  const res = await addTool(body, taken);
  if (!res.ok) return NextResponse.json({ error: res.errors.join(" "), errors: res.errors }, { status: 400 });

  return NextResponse.json({ tool: res.tool, warnings: res.warnings }, { status: 201 });
}
