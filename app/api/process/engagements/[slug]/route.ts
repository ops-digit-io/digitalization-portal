import { NextResponse } from "next/server";
import * as store from "@/lib/process/store";
import { profileOf } from "@/lib/process/profile";
import { ARTEFACTS } from "@/lib/process/artefacts";
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
  const [profile, ratings, filledArtefacts] = await Promise.all([
    profileOf(slug),
    store.ratings(slug),
    Promise.all(ARTEFACTS.map(async (a) => ((await store.readArtefact(slug, a.id)).trim() ? a.id : null))).then((xs) => xs.filter((x): x is string => x !== null)),
  ]);
  return NextResponse.json({ meta: m, profile, ratings, filledArtefacts });
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
