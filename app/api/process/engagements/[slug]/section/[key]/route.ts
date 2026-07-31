import { NextResponse } from "next/server";
import { sectionByKey } from "@/lib/process/sections";
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
  return NextResponse.json(await store.writeSection(slug, key, String(body.content ?? ""), now()));
}
