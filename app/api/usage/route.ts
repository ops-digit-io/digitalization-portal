/**
 * `/api/usage` — the cost overview's data. Admin-only, mirroring the other admin
 * endpoints: usage is an operational, cross-tenant view, not something a demand
 * author should see. GET returns the rollup for a window; POST { action: "reset" }
 * clears it. Nothing here is a secret — it's counts and dollars.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { readUsage, resetUsage } from "@/lib/usage-meter";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const t = getT();
  const session = await getSession();
  if (!can(session, "all")) {
    return NextResponse.json({ ok: false, error: t("api.usage.adminOnlyView", "Only an administrator can view usage.") }, { status: 403 });
  }
  const daysParam = Number(new URL(req.url).searchParams.get("days") ?? 30);
  const days = Number.isFinite(daysParam) ? Math.min(120, Math.max(1, Math.round(daysParam))) : 30;
  return NextResponse.json({ ok: true, usage: await readUsage(days) });
}

export async function POST(req: Request) {
  const t = getT();
  const session = await getSession();
  if (!can(session, "all")) {
    return NextResponse.json({ ok: false, error: t("api.usage.adminOnlyReset", "Only an administrator can reset usage.") }, { status: 403 });
  }
  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: t("api.invalidJson", "invalid JSON") }, { status: 400 });
  }
  if (body.action !== "reset") return NextResponse.json({ ok: false, error: t("api.unknownAction", "unknown action") }, { status: 400 });
  await resetUsage();
  return NextResponse.json({ ok: true, usage: await readUsage(30) });
}
