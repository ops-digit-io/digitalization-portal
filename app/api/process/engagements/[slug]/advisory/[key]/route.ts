import { NextResponse } from "next/server";
import { byKey } from "@/lib/process/advisory";
import * as store from "@/lib/process/store";
import * as advisor from "@/lib/process/advisor";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string; key: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, key } = params;
  if (!byKey[key]) return NextResponse.json({ error: "no such advisory item" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const content = await advisor.read(slug, key);
  return NextResponse.json({
    item: byKey[key],
    content,
    decisions: (await advisor.decisions(slug)).filter((dd) => dd.advisoryKey === key),
  });
}

export async function PUT(req: Request, { params }: { params: { slug: string; key: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, key } = params;
  if (!byKey[key]) return NextResponse.json({ error: "no such advisory item" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { content?: string };
  return NextResponse.json(await advisor.write(slug, key, String(body.content ?? ""), now()));
}
