import { NextResponse } from "next/server";
import { byKey } from "@/lib/process/sections";
import * as store from "@/lib/process/store";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { slug: string; key: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, key } = params;
  if (!byKey[key] || !byKey[key]!.gate) return NextResponse.json({ error: "not a gate section" }, { status: 400 });
  if (!store.exists(slug)) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { passed?: boolean; reason?: string };
  if (typeof body.passed !== "boolean") return NextResponse.json({ error: "passed must be boolean" }, { status: 400 });
  if (!body.passed && !String(body.reason || "").trim()) {
    // A failed gate without a reason is how an engagement dies unexplained.
    return NextResponse.json({ error: "a failed gate needs a reason" }, { status: 400 });
  }
  return NextResponse.json(store.setGate(slug, key, body.passed, String(body.reason || ""), now()));
}
