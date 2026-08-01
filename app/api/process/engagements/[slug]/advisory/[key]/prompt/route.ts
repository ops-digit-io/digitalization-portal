import { NextResponse } from "next/server";
import { advisoryByKey, build } from "@/lib/process/advisory";
import * as store from "@/lib/process/store";
import { deny } from "@/lib/process/guard";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The assembled prompt for one advisory pass, for pasting into an outside
 * assistant. An advisory pass is single-shot by construction — it reads the whole
 * anamnesis and produces one artefact — so there is no separate export framing to
 * apply: the same prompt works in either place.
 */
export async function GET(_req: Request, { params }: { params: { slug: string; key: string } }) {
  const t = getT();
  const d = await deny();
  if (d) return d;
  const { slug, key } = params;
  if (!advisoryByKey[key]) return NextResponse.json({ error: t("api.process.noAdvisoryPass", "no such advisory pass") }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: t("api.noEngagement", "no such engagement") }, { status: 404 });
  return NextResponse.json({ mode: "export", prompt: await build(slug, key) });
}
