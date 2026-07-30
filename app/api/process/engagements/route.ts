import { NextResponse } from "next/server";
import * as store from "@/lib/process/store";
import { byId, type Level } from "@/lib/process/criteria";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const d = await deny();
  if (d) return d;
  return NextResponse.json({ engagements: await store.list() });
}

export async function POST(req: Request) {
  const d = await deny();
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
