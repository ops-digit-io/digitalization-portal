import { NextResponse } from "next/server";
import { SECTION_GROUPS } from "@/lib/process/sections";
import * as store from "@/lib/process/store";
import { denyWrite, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAGE_IDS = new Set(SECTION_GROUPS.map((g) => g.id));

/**
 * Patch engagement header fields: owner, champion, unit, components and the
 * current stage. The chosen branch is no longer a header field — it is recorded
 * in the `diagnosis` section, where its evidence sits.
 */
export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  const d = await denyWrite();
  if (d) return d;
  const { slug } = params;
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Partial<store.EngagementMeta> = {};

  for (const k of ["owner", "champion", "unit"] as const) if (typeof body[k] === "string") patch[k] = (body[k] as string).trim();
  if (body.anflug === "process" || body.anflug === "technology") patch.anflug = body.anflug;
  if (Array.isArray(body.components)) {
    patch.components = (body.components as unknown[])
      .map((l) => String(l).trim())
      .filter(Boolean)
      .map((label, i) => ({ id: `k${i + 1}`, label }));
  }
  if (typeof body.phase === "string" && STAGE_IDS.has(body.phase)) patch.phase = body.phase;

  return NextResponse.json(await store.writeMeta(slug, patch, now()));
}
