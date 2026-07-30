import { NextResponse } from "next/server";
import { PHASES } from "@/lib/process/phases";
import * as store from "@/lib/process/store";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOR_IDS = new Set(PHASES.map((p) => p.gate.id));

/** Record a Tor verdict. A failed gate needs a written reason (doc B §1.2). */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug } = params;
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { torId?: string; passed?: boolean; reason?: string };
  if (!TOR_IDS.has(String(body.torId))) return NextResponse.json({ error: "no such gate" }, { status: 400 });
  if (typeof body.passed !== "boolean") return NextResponse.json({ error: "passed must be boolean" }, { status: 400 });
  if (!body.passed && !String(body.reason || "").trim()) {
    return NextResponse.json({ error: "a failed gate needs a reason" }, { status: 400 });
  }
  return NextResponse.json(await store.setGate(slug, String(body.torId), body.passed, String(body.reason || ""), now()));
}
