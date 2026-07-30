import { NextResponse } from "next/server";
import { byKey } from "@/lib/process/advisory";
import * as store from "@/lib/process/store";
import * as advisor from "@/lib/process/advisor";
import * as llm from "@/lib/process/llm";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Run the advisory pass, get proposals back. Only persists a real artefact. */
export async function POST(_req: Request, { params }: { params: { slug: string; key: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, key } = params;
  if (!byKey[key]) return NextResponse.json({ error: "no such advisory item" }, { status: 404 });
  if (!store.exists(slug)) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  if (!llm.available()) return NextResponse.json({ error: "live generation disabled", code: "NO_KEY" }, { status: 503 });
  try {
    const out = await llm.chat(advisor.build(slug, key), [{ role: "user", content: "Run this pass now." }], { maxTokens: 8192 });
    const fenced = llm.extractArtefact(out.text);
    const candidate = fenced || out.text;

    // A model that declines produces a short answer with no structure; writing that
    // to disk would replace a pass's output with an apology. Refuse to save instead.
    const looksLikeArtefact = candidate.length > 400 && /^#{1,3}\s|\n#{1,3}\s|\n\|/.test(candidate);
    if (!looksLikeArtefact) {
      return NextResponse.json(
        { error: "the model did not return an artefact — nothing was saved", code: "NO_ARTEFACT", reply: out.text.slice(0, 600) },
        { status: 502 },
      );
    }

    advisor.write(slug, key, candidate, now());
    return NextResponse.json({ text: out.text, artefact: candidate, usage: out.usage, model: out.model });
  } catch (e) {
    const err = e as Error & { code?: string };
    return NextResponse.json({ error: err.message, code: err.code || "ERROR" }, { status: err.code === "NO_KEY" ? 503 : 502 });
  }
}
