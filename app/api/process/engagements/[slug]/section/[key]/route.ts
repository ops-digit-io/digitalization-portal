import { NextResponse } from "next/server";
import { sectionByKey } from "@/lib/process/sections";
import { grade } from "@/lib/process/grader";
import { schemaOf } from "@/lib/process/schemas";
import * as store from "@/lib/process/store";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string; key: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, key } = params;
  if (!sectionByKey[key]) return NextResponse.json({ error: "no such section" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  // The template ships with the section, not with /config: it is large and only
  // the section actually being worked needs it.
  return NextResponse.json({ template: sectionByKey[key]!.template, content: await store.readSection(slug, key) });
}

export async function PUT(req: Request, { params }: { params: { slug: string; key: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, key } = params;
  if (!sectionByKey[key]) return NextResponse.json({ error: "no such section" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { content?: string };
  const content = String(body.content ?? "");
  // Grade against the section's schema on the way in, so the score is always in
  // step with the document rather than a stale number from an earlier save.
  const schema = schemaOf(key);
  const result = schema ? grade(content, schema) : null;
  const saved = await store.writeSection(slug, key, content, now(), result?.score);
  return NextResponse.json({ ...saved, grade: result });
}
