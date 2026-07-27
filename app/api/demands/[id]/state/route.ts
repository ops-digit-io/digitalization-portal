import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { readDemand, saveDemand } from "@/lib/demands-store";
import { parsePeople } from "@/lib/parse";
import { killDemand, reactivateDemand } from "@/lib/demand-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Status transitions beyond the gate flow: `kill` (stop, cap `kill`, reason
 * required, requester can't kill their own) and `reactivate` (un-park/un-kill, cap
 * `park`). Pure mutators in `lib/demand-state.ts`; writes the funnel directly.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  const id = params.id;

  const md = await readDemand(id);
  if (md === undefined) {
    return NextResponse.json({ ok: false, error: `Demand ${id} not found.` }, { status: 404 });
  }

  let body: { action?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const date = new Date().toISOString().slice(0, 10);

  if (body.action === "kill") {
    if (!can(session, "kill", { requester: parsePeople(md).requester })) {
      return NextResponse.json({ ok: false, error: "You do not have authority to kill this demand." }, { status: 403 });
    }
    const result = killDemand(md, String(body.reason ?? ""), { actor: session.user, date });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
    const saved = await saveDemand(id, result.markdown, { message: `Kill ${id}` });
    return NextResponse.json({ ok: true, action: "kill", host: saved.host });
  }

  if (body.action === "reactivate") {
    if (!can(session, "park")) {
      return NextResponse.json({ ok: false, error: "You do not have authority to reactivate this demand." }, { status: 403 });
    }
    const result = reactivateDemand(md, { actor: session.user, date });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
    const saved = await saveDemand(id, result.markdown, { message: `Reactivate ${id}` });
    return NextResponse.json({ ok: true, action: "reactivate", host: saved.host });
  }

  return NextResponse.json({ ok: false, error: "action must be 'kill' or 'reactivate'" }, { status: 400 });
}
