import { NextResponse } from "next/server";
import { advisoryByKey, readiness } from "@/lib/process/advisory";
import * as store from "@/lib/process/store";
import { deny, now } from "@/lib/process/guard";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string; key: string } }) {
  const t = getT();
  const d = await deny();
  if (d) return d;
  const { slug, key } = params;
  const item = advisoryByKey[key];
  if (!item) return NextResponse.json({ error: t("api.process.noAdvisoryPass", "no such advisory pass") }, { status: 404 });
  const m = await store.meta(slug);
  if (!m || m.deleted) return NextResponse.json({ error: t("api.noEngagement", "no such engagement") }, { status: 404 });
  const [content, decisions] = await Promise.all([store.readAdvisory(slug, key), store.readDecisions(slug)]);
  return NextResponse.json({
    content,
    readiness: readiness(item, store.filledOf(m)),
    decisions: decisions.filter((x) => x.advisoryKey === key),
  });
}

/** Hand-edit an advisory artefact. It stays a derived proposal either way. */
export async function PUT(req: Request, { params }: { params: { slug: string; key: string } }) {
  const t = getT();
  const d = await deny();
  if (d) return d;
  const { slug, key } = params;
  if (!advisoryByKey[key]) return NextResponse.json({ error: t("api.process.noAdvisoryPass", "no such advisory pass") }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: t("api.noEngagement", "no such engagement") }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { content?: string };
  return NextResponse.json(await store.writeAdvisory(slug, key, String(body.content ?? ""), now()));
}
