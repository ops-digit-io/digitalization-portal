import { NextResponse } from "next/server";
import { sectionByKey } from "@/lib/process/sections";
import * as store from "@/lib/process/store";
import * as coach from "@/lib/process/coach";
import { deny } from "@/lib/process/guard";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The assembled coaching prompt for one section, for pasting into an assistant
 * outside the portal.
 *
 * This is not a fallback for the generate route — without a model key it is the
 * only way to run a section, and the portal ships without one by default. It
 * therefore has no key requirement of its own: assembling text needs no model.
 */
export async function GET(req: Request, { params }: { params: { slug: string; key: string } }) {
  const t = getT();
  const d = await deny();
  if (d) return d;
  const { slug, key } = params;
  if (!sectionByKey[key]) return NextResponse.json({ error: t("api.process.noSection", "no such section") }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: t("api.noEngagement", "no such engagement") }, { status: 404 });
  const url = new URL(req.url);
  const locale = url.searchParams.get("lang") === "de" ? "de" : "en";
  const mode = url.searchParams.get("mode") === "live" ? "live" : "export";
  return NextResponse.json({ mode, prompt: await coach.buildSection(slug, key, locale, mode) });
}
