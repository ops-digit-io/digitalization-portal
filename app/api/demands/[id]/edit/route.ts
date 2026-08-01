import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/current";
import { readDemand, saveDemand } from "@/lib/demands-store";
import { editDemand, canEditDemand, type EditPatch } from "@/lib/demand-edit";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Edit a demand's content in the portal (no GitHub round-trip). Section-surgical —
 * `editDemand` patches only prose/title/plant/domain/people and leaves
 * Stage/Status/Lane/Gates/History intact. Gate: `canEditDemand` (draft + own or
 * view_all). Overwrites the funnel README directly (not the interim buffer).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const t = getT();
  const session = await getSession();
  const id = params.id;

  const md = await readDemand(id);
  if (md === undefined) {
    return NextResponse.json({ ok: false, error: `${t("api.demands.demandPrefix", "Demand")} ${id} ${t("api.demands.notFound", "not found.")}` }, { status: 404 });
  }
  if (!canEditDemand(session, md)) {
    return NextResponse.json({ ok: false, error: t("api.demands.editForbidden", "You can only edit demands you raised (or need view-all).") }, { status: 403 });
  }

  let body: { patch?: EditPatch };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: t("api.invalidJson", "invalid JSON") }, { status: 400 });
  }

  const date = new Date().toISOString().slice(0, 10);
  const result = editDemand(md, body.patch ?? {}, { actor: session.user, date });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }
  const saved = await saveDemand(id, result.markdown, { message: `Edit ${id}` });
  return NextResponse.json({ ok: true, changed: result.changed, host: saved.host });
}
