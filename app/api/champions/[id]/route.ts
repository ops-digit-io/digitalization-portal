import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { validateChampion } from "@/lib/champions";
import { listChampions, standDown, writeChampion } from "@/lib/champions-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(e: unknown): NextResponse {
  const err = e as Error & { status?: number };
  return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!can(session, "draft")) return NextResponse.json({ error: "missing capability: draft" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const current = (await listChampions().catch(() => [])).find((c) => c.id === params.id);
  if (!current) return NextResponse.json({ error: "no such champion" }, { status: 404 });

  // Validate the merged record — a patch touching one field must still leave a
  // reachable person behind.
  const check = validateChampion({ ...current, ...body });
  if (!check.ok) return NextResponse.json({ error: check.errors.join(" "), errors: check.errors }, { status: 400 });

  try {
    return NextResponse.json({ champion: await writeChampion(params.id, body, new Date().toISOString()), warnings: check.warnings });
  } catch (e) {
    return fail(e);
  }
}

/**
 * Stand down, never delete. The record keeps its end date so the coverage map
 * shows the hole that just opened — which is the finding — and so "who covered
 * this before?" still has an answer.
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!can(session, "draft")) return NextResponse.json({ error: "missing capability: draft" }, { status: 403 });
  const now = new Date().toISOString();
  try {
    return NextResponse.json({ champion: await standDown(params.id, now, now), stoodDown: true });
  } catch (e) {
    return fail(e);
  }
}
