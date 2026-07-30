import { NextResponse } from "next/server";
import { dimById } from "@/lib/process/criteria";
import * as store from "@/lib/process/store";
import * as coach from "@/lib/process/coach";
import * as llm from "@/lib/process/llm";
import { deny } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Live coaching turn for a dimension. 503 when no key — the UI offers export. */
export async function POST(req: Request, { params }: { params: { slug: string; dim: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, dim } = params;
  if (!dimById[dim]) return NextResponse.json({ error: "no such dimension" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  if (!llm.available()) return NextResponse.json({ error: "live coaching disabled", code: "NO_KEY" }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { messages?: { role: "user" | "assistant"; content: string }[] };
  const history = Array.isArray(body.messages) ? body.messages : [];
  const msgs = history.length ? history : [{ role: "user" as const, content: "Starte die Erhebung dieser Dimension." }];
  try {
    const out = await llm.chat(await coach.build(slug, dim, "live"), msgs, { maxTokens: 4096 });
    return NextResponse.json({ text: out.text, usage: out.usage, model: out.model });
  } catch (e) {
    const err = e as Error & { code?: string };
    return NextResponse.json({ error: err.message, code: err.code || "ERROR" }, { status: err.code === "NO_KEY" ? 503 : 502 });
  }
}
