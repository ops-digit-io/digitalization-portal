import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/current";
import { readDemand, saveDemand } from "@/lib/demands-store";
import { canEditDemand } from "@/lib/demand-edit";
import { toggleVerification } from "@/lib/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tick / untick a PoC-pilot verification key (an epic, feature/story, or acceptance
 * criterion). The state lives in the demand README's `## Verification` section so it
 * survives re-analysis of `requirements.md`. Gate: `canEditDemand` (draft + own or
 * view_all) — the same people who may change a demand may record its verification.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  const id = params.id;

  const md = await readDemand(id);
  if (md === undefined) {
    return NextResponse.json({ ok: false, error: `Demand ${id} not found.` }, { status: 404 });
  }
  if (!canEditDemand(session, md)) {
    return NextResponse.json({ ok: false, error: "You can only verify demands you own (or need view-all)." }, { status: 403 });
  }

  let body: { key?: string; checked?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const key = String(body.key ?? "");
  const checked = Boolean(body.checked);
  const date = new Date().toISOString().slice(0, 10);

  const result = toggleVerification(md, key, checked, { actor: session.user, date });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }
  const saved = await saveDemand(id, result.markdown, { message: `Verify ${key} (${checked ? "on" : "off"}) on ${id}` });
  return NextResponse.json({ ok: true, key, checked, host: saved.host });
}
