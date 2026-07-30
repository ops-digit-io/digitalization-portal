import { NextResponse } from "next/server";
import { byKey } from "@/lib/process/sections";
import { grade } from "@/lib/process/grader";
import { schema as loadSchema, template } from "@/lib/process/assets";
import * as store from "@/lib/process/store";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string; key: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, key } = params;
  if (!byKey[key]) return NextResponse.json({ error: "no such section" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const content = await store.read(slug, key);
  const schema = loadSchema(key);
  return NextResponse.json({
    section: byKey[key],
    content,
    template: template(key),
    score: schema && content.trim() ? grade(content, schema) : null,
    schema,
    gateResult: ((await store.meta(slug))!.gates || {})[key] || null,
    history: await store.history(slug, key),
  });
}

export async function PUT(req: Request, { params }: { params: { slug: string; key: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, key } = params;
  if (!byKey[key]) return NextResponse.json({ error: "no such section" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { content?: string };
  const content = String(body.content ?? "");
  const r = await store.write(slug, key, content, now());
  const schema = loadSchema(key);
  return NextResponse.json({
    saved: true,
    changed: r.changed,
    score: schema && content.trim() ? grade(content, schema) : null,
  });
}
