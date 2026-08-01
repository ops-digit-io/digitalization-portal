import { NextResponse } from "next/server";
import { dimById } from "@/lib/process/criteria";
import * as store from "@/lib/process/store";
import * as coach from "@/lib/process/coach";
import { deny } from "@/lib/process/guard";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The assembled coaching prompt for one catalogue dimension (D1–D8), for export. */
export async function GET(req: Request, { params }: { params: { slug: string; dim: string } }) {
  const t = getT();
  const d = await deny();
  if (d) return d;
  const { slug, dim } = params;
  if (!dimById[dim]) return NextResponse.json({ error: t("api.process.noDimension", "no such dimension") }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: t("api.noEngagement", "no such engagement") }, { status: 404 });
  const url = new URL(req.url);
  const locale = url.searchParams.get("lang") === "de" ? "de" : "en";
  const mode = url.searchParams.get("mode") === "live" ? "live" : "export";
  return NextResponse.json({ mode, prompt: await coach.build(slug, dim, locale, mode) });
}
