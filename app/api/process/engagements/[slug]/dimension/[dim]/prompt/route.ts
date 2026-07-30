import { NextResponse } from "next/server";
import { dimById } from "@/lib/process/criteria";
import * as store from "@/lib/process/store";
import * as coach from "@/lib/process/coach";
import { deny } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string; dim: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, dim } = params;
  if (!dimById[dim]) return NextResponse.json({ error: "no such dimension" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  return NextResponse.json({ prompt: await coach.build(slug, dim, "export") });
}
