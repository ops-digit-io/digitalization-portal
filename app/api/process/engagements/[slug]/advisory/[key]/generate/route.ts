import { NextResponse } from "next/server";
import { advisoryByKey, build } from "@/lib/process/advisory";
import * as store from "@/lib/process/store";
import * as llm from "@/lib/process/llm";
import { deny, now } from "@/lib/process/guard";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Run one advisory pass. Its output is a PROPOSAL and is stored apart from the sections. */
export async function POST(_req: Request, { params }: { params: { slug: string; key: string } }) {
  const t = getT();
  const d = await deny();
  if (d) return d;
  const { slug, key } = params;
  if (!advisoryByKey[key]) return NextResponse.json({ error: t("api.process.noAdvisoryPass", "no such advisory pass") }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: t("api.noEngagement", "no such engagement") }, { status: 404 });
  if (!(await llm.available())) return NextResponse.json({ error: t("api.liveGenDisabled", "live generation disabled"), code: "NO_KEY" }, { status: 503 });
  try {
    const out = await llm.chat(await build(slug, key), [{ role: "user", content: "Run the pass now." }], { maxTokens: 8000, feature: "process.advisory" });
    const doc = llm.extractArtefact(out.text) || out.text;
    if (doc.trim().length <= 40) {
      return NextResponse.json({ error: t("api.process.noArtefact", "the model returned no artefact"), code: "NO_ARTEFACT", reply: out.text.slice(0, 400) }, { status: 502 });
    }
    await store.writeAdvisory(slug, key, doc, now());
    return NextResponse.json({ saved: true, content: doc, model: out.model, truncated: out.truncated });
  } catch (e) {
    const err = e as Error & { code?: string };
    return NextResponse.json({ error: err.message, code: err.code || "ERROR" }, { status: err.code === "NO_KEY" ? 503 : 502 });
  }
}
