import { NextResponse } from "next/server";
import * as store from "@/lib/process/store";
import { generate, NoDigestError } from "@/lib/process/digest";
import * as llm from "@/lib/process/llm";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  if (!(await store.exists(params.slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  return NextResponse.json({ digest: await store.readDigest(params.slug) });
}

/** Regenerate the derived digest. 503 without a model key — it cannot be faked. */
export async function POST(_req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  if (!(await store.exists(params.slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  if (!(await llm.available())) return NextResponse.json({ error: "live generation disabled", code: "NO_KEY" }, { status: 503 });
  try {
    return NextResponse.json({ digest: await generate(params.slug, now()) });
  } catch (e) {
    if (e instanceof NoDigestError) return NextResponse.json({ error: e.message, code: e.code, reply: e.reply }, { status: 502 });
    const err = e as Error & { code?: string };
    return NextResponse.json({ error: err.message, code: err.code || "ERROR" }, { status: err.code === "NO_KEY" ? 503 : 502 });
  }
}
