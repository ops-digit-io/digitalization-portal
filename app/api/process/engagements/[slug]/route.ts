import { NextResponse } from "next/server";
import * as store from "@/lib/process/store";
import { profileOf } from "@/lib/process/profile";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Full engagement state: meta (Spoke, Anflug, phase, branch, risk, gates), the
 *  health profile, and the raw ratings for the assessment UI. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug } = params;
  const m = await store.meta(slug);
  if (!m || m.deleted) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  // filledArtefacts is tracked on meta (updated on write) — no per-artefact fan-out.
  const [profile, ratings] = await Promise.all([profileOf(slug), store.ratings(slug)]);
  return NextResponse.json({ meta: m, profile, ratings, filledArtefacts: m.filledArtefacts ?? [] });
}

export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug } = params;
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (String(body.confirm || "") !== store.slugify(slug)) {
    return NextResponse.json({ error: `to remove this, send {"confirm":"${store.slugify(slug)}"}` }, { status: 400 });
  }
  return NextResponse.json(await store.remove(slug, now()));
}
