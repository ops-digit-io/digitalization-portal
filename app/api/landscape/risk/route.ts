import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { decideRisk, undecideRisk, listRiskAdjustments } from "@/lib/otx/tool-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Risk decisions on a tool.
 *
 * The score itself is derived and stays that way — there is deliberately no way to
 * type a number over it. What a person decides is recorded instead: a derived
 * factor ACCEPTED (it stops counting, and stays on the page with the reason and
 * the name behind it), or a risk the register cannot derive ADDED with its own
 * weight. Both are rows in `landscape/risk.md`, in git.
 *
 * DELETE takes a decision back, and the factor returns to counting as derived.
 */
export async function GET() {
  const session = await getSession();
  if (!can(session, "view_board")) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  return NextResponse.json({ adjustments: await listRiskAdjustments() });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!can(session, "draft")) return NextResponse.json({ error: "missing capability: draft" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const res = await decideRisk(body, {
    by: session?.user ?? "unknown",
    date: new Date().toISOString().slice(0, 10),
  });
  if (!res.ok) return NextResponse.json({ error: res.errors.join(" "), errors: res.errors }, { status: 400 });

  return NextResponse.json({ adjustment: res.adjustment }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!can(session, "draft")) return NextResponse.json({ error: "missing capability: draft" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const tool = typeof body.tool === "string" ? body.tool : "";
  const factor = typeof body.factor === "string" ? body.factor : "";
  if (tool === "" || factor === "") return NextResponse.json({ error: "tool and factor are required" }, { status: 400 });

  const res = await undecideRisk(tool, factor);
  if (!res.ok) return NextResponse.json({ error: "no such decision" }, { status: 404 });
  return NextResponse.json({ removed: res.removed });
}
