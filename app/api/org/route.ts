import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { createDepartment, saveSection, startingPoint, OrgWriteError } from "@/lib/org/authoring";
import { scoreSection } from "@/lib/org/scoring";
import { sectionDef } from "@/lib/org/model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Department OS authoring: create a department, save a section, or score a draft
 * without saving (the editor's live coaching). Reads live on the pages; this is the
 * write side, gated on `draft` — the same contributor capability the champions
 * register uses. Scoring a draft is read-only and needs only `view_board`.
 */
export async function POST(req: Request) {
  const session = await getSession();
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    name?: string;
    slug?: string;
    key?: string;
    markdown?: string;
  };

  // Live score of a draft — no write, so the lighter capability.
  if (body.action === "score") {
    if (!can(session, "view_board")) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
    const def = body.key ? sectionDef(body.key) : undefined;
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
      const def = sectionDef(body.key);
      const where = await saveSection(body.slug, body.key, body.markdown ?? "", `Update ${body.slug}/${body.key}`);
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

/** The starting scaffold for a section — the editor loads this to begin an empty one. */
export async function GET(req: Request) {
  const session = await getSession();
  if (!can(session, "view_board")) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  const name = url.searchParams.get("name") ?? "New department";
  if (!sectionDef(key)) return NextResponse.json({ error: `unknown section: ${key}` }, { status: 400 });
  return NextResponse.json({ markdown: startingPoint(key, name) });
}
