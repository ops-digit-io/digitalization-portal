import { NextResponse } from "next/server";
import * as store from "@/lib/process/store";
import { buildPrompt } from "@/lib/process/digest";
import { deny } from "@/lib/process/guard";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The assembled digest prompt, for pasting into an outside assistant.
 *
 * The digest answers in JSON, so what comes back has to be pasted into the digest
 * file rather than typed by hand — but that is still the whole workflow when no
 * model key is configured.
 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const t = getT();
  const d = await deny();
  if (d) return d;
  if (!(await store.exists(params.slug))) return NextResponse.json({ error: t("api.noEngagement", "no such engagement") }, { status: 404 });
  return NextResponse.json({ mode: "export", prompt: await buildPrompt(params.slug) });
}
