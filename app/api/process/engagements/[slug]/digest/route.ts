import { NextResponse } from "next/server";
import * as store from "@/lib/process/store";
import * as digest from "@/lib/process/digest";
import * as llm from "@/lib/process/llm";
import { deny } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug } = params;
  if (!store.exists(slug)) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  return NextResponse.json({ digest: digest.read(slug), liveAvailable: llm.available() });
}
