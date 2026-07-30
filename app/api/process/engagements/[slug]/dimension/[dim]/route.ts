import { NextResponse } from "next/server";
import { dimById, criteriaOf } from "@/lib/process/criteria";
import * as store from "@/lib/process/store";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One dimension: its criteria, the current ratings, and the coaching-evidence note. */
export async function GET(_req: Request, { params }: { params: { slug: string; dim: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, dim } = params;
  if (!dimById[dim]) return NextResponse.json({ error: "no such dimension" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const [evidence, ratings, m] = await Promise.all([store.readDimension(slug, dim), store.ratings(slug), store.meta(slug)]);
  return NextResponse.json({ dimension: dimById[dim], criteria: criteriaOf(dim), evidence, ratings, components: m?.components ?? [] });
}

/** Save the dimension's coaching-evidence note. */
export async function PUT(req: Request, { params }: { params: { slug: string; dim: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, dim } = params;
  if (!dimById[dim]) return NextResponse.json({ error: "no such dimension" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { content?: string };
  return NextResponse.json(await store.writeDimension(slug, dim, String(body.content ?? ""), now()));
}
