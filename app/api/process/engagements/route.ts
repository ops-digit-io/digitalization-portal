import { NextResponse } from "next/server";
import * as store from "@/lib/process/store";
import { byId, type Level } from "@/lib/process/criteria";
import { summarize } from "@/lib/process/summary";
import { deny, denyWrite, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The landscape. Each row carries its health summary so a tile can show the
 * traffic light and phase progress without the client fanning out per process.
 */
export async function GET() {
  const d = await deny();
  if (d) return d;
  const metas = await store.list();
  // The summary is read entirely off meta now (grader scores + gates), so the
  // landscape needs no per-engagement fan-out at all.
  const engagements = metas.map((m) => ({ ...m, summary: summarize(m) }));
  return NextResponse.json({ engagements });
}

export async function POST(req: Request) {
  const d = await denyWrite();
  if (d) return d;
  const body = (await req.json().catch(() => ({}))) as {
    title?: string; owner?: string; champion?: string; unit?: string;
    anflug?: store.Anflug; components?: string[];
    /** Seed ratings from the Kurzform self-assessment, by criterion id. */
    seedRatings?: Record<string, number>;
  };
  if (!String(body.title || "").trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  try {
    const ts = now();
    const m = await store.create(body as { title: string }, ts);
    // Carry the self-assessment's seven grobe Stufen into the full engagement.
    if (body.seedRatings) {
      for (const [critId, v] of Object.entries(body.seedRatings)) {
        const c = byId[critId];
        if (!c || c.perComponent || v == null) continue;
        await store.rate(m.slug, critId, { level: Math.min(5, Math.max(1, Math.round(Number(v)))) as Level, confidence: "S" }, ts);
      }
    }
    return NextResponse.json(m, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
