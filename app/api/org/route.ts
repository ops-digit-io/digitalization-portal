import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import {
  createDepartment,
  saveSection,
  startingPoint,
  createLane,
  saveLaneFile,
  laneStartingPoint,
  OrgWriteError,
} from "@/lib/org/authoring";
import { scoreSection } from "@/lib/org/scoring";
import { sectionDef } from "@/lib/org/model";
import { laneFileDef } from "@/lib/org/lane";

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
    key?: string;
    markdown?: string;
  };

  const defFor = (key: string | undefined, isLane: boolean) => (key ? (isLane ? laneFileDef(key) : sectionDef(key)) : undefined);

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
      const def = sectionDef(body.key);
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
  if (!sectionDef(key)) return NextResponse.json({ error: `unknown section: ${key}` }, { status: 400 });
  return NextResponse.json({ markdown: startingPoint(key, name) });
}
