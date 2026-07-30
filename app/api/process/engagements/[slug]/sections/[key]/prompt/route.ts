import { NextResponse } from "next/server";
import { byKey } from "@/lib/process/sections";
import * as store from "@/lib/process/store";
import * as coach from "@/lib/process/coach";
import { deny } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { slug: string; key: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, key } = params;
  if (!byKey[key]) return NextResponse.json({ error: "no such section" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const mode = new URL(req.url).searchParams.get("mode") === "live" ? "live" : "export";
  return NextResponse.json({ mode, prompt: await coach.build(slug, key, mode) });
}
