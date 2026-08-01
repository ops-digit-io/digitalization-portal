import { NextResponse } from "next/server";
import { sectionByKey } from "@/lib/process/sections";
import { grade } from "@/lib/process/grader";
import { schemaOf } from "@/lib/process/schemas";
import * as store from "@/lib/process/store";
import * as coach from "@/lib/process/coach";
import * as llm from "@/lib/process/llm";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Generate the section document live and save it. 503 when no key. */
export async function POST(req: Request, { params }: { params: { slug: string; key: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, key } = params;
  if (!sectionByKey[key]) return NextResponse.json({ error: "no such section" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  if (!(await llm.available())) return NextResponse.json({ error: "live generation disabled", code: "NO_KEY" }, { status: 503 });
  const locale = new URL(req.url).searchParams.get("lang") === "de" ? "de" : "en";
  const prompt = locale === "de" ? "Erzeuge den Abschnitt jetzt." : "Produce the section now.";
  try {
    const out = await llm.chat(await coach.buildSection(slug, key, locale), [{ role: "user", content: prompt }], { maxTokens: 6000, feature: "process.section" });
    const doc = llm.extractArtefact(out.text) || out.text;
    if (doc.trim().length <= 40) {
      return NextResponse.json({ error: "the model returned no document", code: "NO_ARTEFACT", reply: out.text.slice(0, 400) }, { status: 502 });
    }
    const schema = schemaOf(key);
    const result = schema ? grade(doc, schema) : null;
    await store.writeSection(slug, key, doc, now(), result?.score);
    return NextResponse.json({ saved: true, content: doc, model: out.model, grade: result, truncated: out.truncated });
  } catch (e) {
    const err = e as Error & { code?: string };
    return NextResponse.json({ error: err.message, code: err.code || "ERROR" }, { status: err.code === "NO_KEY" ? 503 : 502 });
  }
}
