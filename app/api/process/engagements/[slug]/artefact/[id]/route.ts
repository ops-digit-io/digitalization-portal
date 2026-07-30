import { NextResponse } from "next/server";
import { artefactById } from "@/lib/process/artefacts";
import * as store from "@/lib/process/store";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string; id: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, id } = params;
  if (!artefactById[id]) return NextResponse.json({ error: "no such artefact" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  return NextResponse.json({ artefact: artefactById[id], content: await store.readArtefact(slug, id) });
}

export async function PUT(req: Request, { params }: { params: { slug: string; id: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, id } = params;
  if (!artefactById[id]) return NextResponse.json({ error: "no such artefact" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { content?: string };
  return NextResponse.json(await store.writeArtefact(slug, id, String(body.content ?? ""), now()));
}
