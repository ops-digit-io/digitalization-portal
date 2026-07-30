import { NextResponse } from "next/server";
import { artefactById } from "@/lib/process/artefacts";
import * as store from "@/lib/process/store";
import * as coach from "@/lib/process/coach";
import * as llm from "@/lib/process/llm";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Generate the artefact live and save it. 503 when no key — the UI offers export. */
export async function POST(_req: Request, { params }: { params: { slug: string; id: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, id } = params;
  if (!artefactById[id]) return NextResponse.json({ error: "no such artefact" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  if (!llm.available()) return NextResponse.json({ error: "live generation disabled", code: "NO_KEY" }, { status: 503 });
  try {
    const out = await llm.chat(await coach.buildArtefact(slug, id), [{ role: "user", content: "Erzeuge das Artefakt jetzt." }], { maxTokens: 6000 });
    const artefact = llm.extractArtefact(out.text) || out.text;
    const looksLike = artefact.trim().length > 40;
    if (!looksLike) {
      return NextResponse.json({ error: "das Modell lieferte kein Artefakt", code: "NO_ARTEFACT", reply: out.text.slice(0, 400) }, { status: 502 });
    }
    await store.writeArtefact(slug, id, artefact, now());
    return NextResponse.json({ saved: true, content: artefact, model: out.model });
  } catch (e) {
    const err = e as Error & { code?: string };
    return NextResponse.json({ error: err.message, code: err.code || "ERROR" }, { status: err.code === "NO_KEY" ? 503 : 502 });
  }
}
