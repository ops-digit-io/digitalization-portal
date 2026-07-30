import { NextResponse } from "next/server";
import { artefactById } from "@/lib/process/artefacts";
import * as store from "@/lib/process/store";
import * as coach from "@/lib/process/coach";
import { deny } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string; id: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, id } = params;
  if (!artefactById[id]) return NextResponse.json({ error: "no such artefact" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  return NextResponse.json({ prompt: await coach.buildArtefact(slug, id, "export") });
}
