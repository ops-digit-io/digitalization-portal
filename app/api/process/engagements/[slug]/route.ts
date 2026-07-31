import { NextResponse } from "next/server";
import * as store from "@/lib/process/store";
import { profileOf } from "@/lib/process/profile";
import { scoreProfile, trafficLight } from "@/lib/process/score-model";
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
  // The filled index is tracked on meta (updated on write) — no per-section fan-out.
  const [profile, ratings, digest] = await Promise.all([profileOf(slug), store.ratings(slug), store.readDigest(slug)]);
  // The score model's view: grader scores → five dimensions → the light.
  const gateResults: Record<string, boolean> = {};
  for (const [key, v] of Object.entries(m.gates ?? {})) if (v) gateResults[key] = v.passed;
  const score = scoreProfile(m.sectionScores ?? {}, gateResults);
  return NextResponse.json({
    meta: m,
    profile,          // the D1–D8 catalogue (its own tab)
    score,            // the score model
    light: trafficLight(score),
    digest,
    ratings,
    filledSections: store.filledOf(m),
  });
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
