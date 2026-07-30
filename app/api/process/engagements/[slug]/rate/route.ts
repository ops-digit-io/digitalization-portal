import { NextResponse } from "next/server";
import { byId } from "@/lib/process/criteria";
import * as store from "@/lib/process/store";
import { profileOf } from "@/lib/process/profile";
import { deny, now } from "@/lib/process/guard";
import type { Level, Confidence } from "@/lib/process/criteria";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Set (or clear) one criterion's S1–S5 rating. For D7 pass componentId. */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug } = params;
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as {
    critId?: string; level?: number | null; confidence?: Confidence; evidence?: string; componentId?: string;
  };
  const c = byId[String(body.critId)];
  if (!c) return NextResponse.json({ error: "no such criterion" }, { status: 400 });
  if (c.perComponent && !body.componentId) return NextResponse.json({ error: "componentId required for a per-component criterion" }, { status: 400 });

  const rating =
    body.level == null
      ? null
      : {
          level: Math.min(5, Math.max(1, Math.round(Number(body.level)))) as Level,
          ...(body.confidence ? { confidence: body.confidence } : {}),
          ...(body.evidence ? { evidence: String(body.evidence) } : {}),
        };
  await store.rate(slug, c.id, rating, now(), body.componentId);
  return NextResponse.json({ saved: true, profile: await profileOf(slug), ratings: await store.ratings(slug) });
}
