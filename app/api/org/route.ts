import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import {
  createDepartment,
  saveSection,
  startingPoint,
  createLane,
  saveLaneFile,
  saveLaneDoc,
  setLaneAuthority,
  laneStartingPoint,
  OrgWriteError,
} from "@/lib/org/authoring";
import { scoreSection } from "@/lib/org/scoring";
import { anyDef } from "@/lib/org/model";
import { laneFileDef } from "@/lib/org/lane";
import { readLane } from "@/lib/org/lane-store";
import { canRaiseTo, isAuthorityLevel } from "@/lib/org/autonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Department OS authoring: create a department or a lane, save a section or a lane-pack
 * file, or score a draft without saving (the editor's live coaching). Writes are gated
 * on `draft` — the same contributor capability the champions register uses; scoring a
 * draft is read-only and needs only `view_board`. Lane files resolve their grammar from
 * `lane.ts`, department sections from `model.ts`.
 */
export async function POST(req: Request) {
  const session = await getSession();
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    name?: string;
    slug?: string;
    lane?: string;
    dir?: string;
    key?: string;
    level?: string;
    markdown?: string;
  };

  const defFor = (key: string | undefined, isLane: boolean) => (key ? (isLane ? laneFileDef(key) : anyDef(key)) : undefined);

  // Live score of a draft — no write, so the lighter capability. `score-lane` scores
  // against the lane grammar; `score` against the department-section grammar.
  if (body.action === "score" || body.action === "score-lane") {
    if (!can(session, "view_board")) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
    const def = defFor(body.key, body.action === "score-lane");
    if (!def) return NextResponse.json({ error: `unknown section: ${body.key}` }, { status: 400 });
    return NextResponse.json({ score: scoreSection(def, body.markdown ?? "") });
  }

  if (!can(session, "draft")) return NextResponse.json({ error: "missing capability: draft" }, { status: 403 });

  try {
    if (body.action === "create") {
      const { slug } = await createDepartment(body.name ?? "");
      return NextResponse.json({ slug }, { status: 201 });
    }
    if (body.action === "save") {
      if (!body.slug || !body.key) return NextResponse.json({ error: "slug and key are required" }, { status: 400 });
      const where = await saveSection(body.slug, body.key, body.markdown ?? "", `Update ${body.slug}/${body.key}`);
      const def = anyDef(body.key);
      const score = def ? scoreSection(def, body.markdown ?? "") : undefined;
      return NextResponse.json({ ok: true, host: where.host, ...(score ? { score } : {}) });
    }
    if (body.action === "create-lane") {
      if (!body.slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
      const { slug } = await createLane(body.slug, body.name ?? "");
      return NextResponse.json({ slug }, { status: 201 });
    }
    if (body.action === "save-lane") {
      if (!body.slug || !body.lane || !body.key) return NextResponse.json({ error: "slug, lane and key are required" }, { status: 400 });
      const where = await saveLaneFile(body.slug, body.lane, body.key, body.markdown ?? "");
      const def = laneFileDef(body.key);
      const score = def ? scoreSection(def, body.markdown ?? "") : undefined;
      return NextResponse.json({ ok: true, host: where.host, ...(score ? { score } : {}) });
    }
    if (body.action === "save-lane-doc") {
      if (!body.slug || !body.lane || !body.dir || !body.name) {
        return NextResponse.json({ error: "slug, lane, dir and name are required" }, { status: 400 });
      }
      const where = await saveLaneDoc(body.slug, body.lane, body.dir, body.name, body.markdown ?? "");
      return NextResponse.json({ ok: true, host: where.host, slug: where.slug });
    }
    if (body.action === "set-authority") {
      if (!body.slug || !body.lane || !isAuthorityLevel(body.level)) {
        return NextResponse.json({ error: "slug, lane and a valid level are required" }, { status: 400 });
      }
      // The ladder's guardrail: a lane cannot be raised to a rung that ACTS until its
      // agent-brief is written down. Enforced here, where the lane's score is known.
      const lane = await readLane(body.slug, body.lane);
      const brief = lane?.files.find((f) => f.key === "agent-brief");
      const gate = canRaiseTo(body.level, {
        agentBriefPresent: brief?.score.present ?? false,
        agentBriefScore: brief?.score.score ?? 0,
      });
      if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 409 });
      const where = await setLaneAuthority(body.slug, body.lane, body.level);
      return NextResponse.json({ ok: true, host: where.host, level: body.level });
    }
    return NextResponse.json({ error: `unknown action: ${body.action}` }, { status: 400 });
  } catch (e) {
    if (e instanceof OrgWriteError) return NextResponse.json({ error: e.message }, { status: 400 });
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `write failed: ${detail}` }, { status: 502 });
  }
}

/**
 * The starting scaffold for a section or lane file — the editor loads this to begin an
 * empty one. `lane=1` selects the lane grammar; otherwise the department-section grammar.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!can(session, "view_board")) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  const name = url.searchParams.get("name") ?? "New";
  const isLane = url.searchParams.get("lane") === "1";
  if (isLane) {
    if (!laneFileDef(key)) return NextResponse.json({ error: `unknown lane file: ${key}` }, { status: 400 });
    return NextResponse.json({ markdown: laneStartingPoint(key, name) });
  }
  if (!anyDef(key)) return NextResponse.json({ error: `unknown section: ${key}` }, { status: 400 });
  return NextResponse.json({ markdown: startingPoint(key, name) });
}
