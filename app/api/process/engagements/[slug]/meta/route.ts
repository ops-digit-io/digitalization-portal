import { NextResponse } from "next/server";
import { BRANCHES, RISK_CLASSES, PHASES } from "@/lib/process/phases";
import * as store from "@/lib/process/store";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BRANCH_IDS = new Set(BRANCHES.map((b) => b.id));
const RISK_IDS = new Set(RISK_CLASSES.map((r) => r.id));
const PHASE_IDS = new Set(PHASES.map((p) => p.id));

/** Patch engagement header/decision fields: owner, champion, unit, components,
 *  current phase, chosen Zweig, Risikoklasse. Only known fields are applied. */
export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
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
  if (typeof body.phase === "string" && PHASE_IDS.has(body.phase)) patch.phase = body.phase;
  if (body.branch === null) patch.branch = undefined;
  else if (typeof body.branch === "string" && BRANCH_IDS.has(body.branch)) patch.branch = body.branch;
  if (body.riskClass === null) patch.riskClass = undefined;
  else if (typeof body.riskClass === "string" && RISK_IDS.has(body.riskClass)) patch.riskClass = body.riskClass;

  return NextResponse.json(await store.writeMeta(slug, patch, now()));
}
