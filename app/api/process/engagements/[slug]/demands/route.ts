import { NextResponse } from "next/server";
import * as store from "@/lib/process/store";
import { createDemands, type DemandProposal } from "@/lib/process/analysis";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Create the selected proposed demands in the demand funnel (du-demands). */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug } = params;
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { demands?: DemandProposal[] };
  const proposals = Array.isArray(body.demands) ? body.demands.filter((p) => p && String(p.title || "").trim()) : [];
  if (!proposals.length) return NextResponse.json({ error: "no demands to create" }, { status: 400 });
  try {
    const created = await createDemands(slug, proposals, now());
    return NextResponse.json({ created });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
