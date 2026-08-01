import { NextResponse } from "next/server";
import { renderReport } from "@/lib/process/report";
import { deny } from "@/lib/process/guard";
import type { Locale } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The whole engagement as one markdown document, in the requested language. */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  const url = new URL(req.url);
  const locale: Locale = url.searchParams.get("lang") === "de" ? "de" : "en";
  try {
    const md = await renderReport(params.slug, locale);
    if (url.searchParams.get("format") === "md") {
      return new NextResponse(md, { headers: { "content-type": "text/markdown; charset=utf-8" } });
    }
    return NextResponse.json({ markdown: md });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
}
