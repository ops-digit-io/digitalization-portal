import { NextResponse } from "next/server";
import { byKey, unlocked } from "@/lib/process/sections";
import { grade } from "@/lib/process/grader";
import { allSchemas } from "@/lib/process/assets";
import * as store from "@/lib/process/store";
import { scoreProfile, trafficLight } from "@/lib/process/score-model";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Full state: every section with its score, gate status, lock status and the roll-up. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug } = params;
  if (!store.exists(slug)) return NextResponse.json({ error: "no such engagement" }, { status: 404 });

  const schemas = allSchemas();
  const st = store.state(slug);
  const scores: Record<string, number> = {};
  const gateResults: Record<string, boolean | null> = {};
  for (const s of st.sections) {
    const schema = schemas[s.key];
    const content = store.read(slug, s.key);
    s.score = schema && content.trim() ? grade(content, schema) : null;
    if (s.score) scores[s.key] = (s.score as { score: number }).score;
    const g = s.gateResult;
    if (byKey[s.key]!.gate) gateResults[s.key] = g ? g.passed : null;
  }
  const done = st.sections.filter((s) => s.filled).map((s) => s.key);
  const open = unlocked(done).map((s) => s.key);
  for (const s of st.sections) s.locked = !open.includes(s.key) && !s.filled;

  let profile: unknown = null;
  let light: unknown = null;
  try {
    profile = scoreProfile(scores, gateResults);
    light = trafficLight(profile);
  } catch (e) {
    profile = { error: (e as Error).message };
  }
  return NextResponse.json({ ...st, profile, trafficLight: light });
}

/** Remove: caller must type the slug back as confirmation. Tree is moved aside. */
export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug } = params;
  if (!store.exists(slug)) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (String(body.confirm || "") !== store.slugify(slug)) {
    return NextResponse.json({ error: `to remove this, send {"confirm":"${store.slugify(slug)}"}` }, { status: 400 });
  }
  try {
    return NextResponse.json(store.remove(slug, now()));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
