import { NextResponse } from "next/server";
import { ordered } from "@/lib/process/sections";
import * as store from "@/lib/process/store";
import { deny } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The whole engagement as one markdown document. */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug } = params;
  if (!store.exists(slug)) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const m = store.meta(slug);
  const parts = [`# ${m.title}`, "", `**Process owner:** ${m.owner || "—"}`, `**Unit:** ${m.unit || "—"}`, ""];
  for (const s of ordered()) {
    const c = store.read(slug, s.key).trim();
    if (!c) continue;
    parts.push(`\n---\n\n## ${s.order}. ${s.label}\n`, c, "");
  }
  const md = parts.join("\n");
  if (new URL(req.url).searchParams.get("format") === "md") {
    return new NextResponse(md, { headers: { "content-type": "text/markdown; charset=utf-8" } });
  }
  return NextResponse.json({ markdown: md });
}
