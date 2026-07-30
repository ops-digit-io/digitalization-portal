import { NextResponse } from "next/server";
import * as store from "@/lib/process/store";
import * as digest from "@/lib/process/digest";
import * as llm from "@/lib/process/llm";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug } = params;
  if (!store.exists(slug)) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  if (!llm.available()) return NextResponse.json({ error: "live generation disabled", code: "NO_KEY" }, { status: 503 });
  try {
    return NextResponse.json({ digest: await digest.generate(slug, now()) });
  } catch (e) {
    const err = e as Error & { code?: string; reply?: string };
    return NextResponse.json({ error: err.message, code: err.code || "ERROR", reply: err.reply }, { status: 502 });
  }
}
