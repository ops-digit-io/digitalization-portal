import { NextResponse } from "next/server";
import * as store from "@/lib/process/store";
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
  };
  if (!String(body.title || "").trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  try {
    return NextResponse.json(await store.create(body as { title: string }, now()), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
