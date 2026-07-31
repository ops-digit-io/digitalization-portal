import { NextResponse } from "next/server";
import * as store from "@/lib/process/store";
import { analyse } from "@/lib/process/analysis";
import { deny } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Run the analysis agent — disassemble the diagnosis into proposed demands.
 *  Returns proposals only; creation is a separate, confirmed step. */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug } = params;
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  try {
    const locale = new URL(req.url).searchParams.get("lang") === "de" ? "de" : "en";
    return NextResponse.json(await analyse(slug, locale));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
