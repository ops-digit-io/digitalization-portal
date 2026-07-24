import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { readDemand, saveDemand } from "@/lib/demands-store";
import { assignLane, rejectDemand, isLane } from "@/lib/demand-triage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Triage write actions on a demand — the two acts besides acceptance (which is a
 * gate passage, handled by `/advance`):
 *   - `assign_lane` — confirm/override the lane (`assign_lane` capability);
 *   - `reject` — park with a required reason and reroute to backlog (`park`).
 *
 * Authority is the session's (constraint #3). Neither passes a gate or merges; both
 * write the funnel repo directly, the way the portal maintains the intake funnel.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  const id = params.id;

  let body: { action?: string; lane?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const md = await readDemand(id);
  if (md === undefined) {
    return NextResponse.json({ ok: false, error: `Demand ${id} not found in the funnel.` }, { status: 404 });
  }

  const date = new Date().toISOString().slice(0, 10);

  if (body.action === "assign_lane") {
    if (!can(session, "assign_lane")) {
      return NextResponse.json({ ok: false, error: "You do not have authority to assign a lane." }, { status: 403 });
    }
    const lane = String(body.lane ?? "");
    if (!isLane(lane)) {
      return NextResponse.json({ ok: false, error: `Unknown lane "${lane}".` }, { status: 400 });
    }
    const result = assignLane(md, lane, { actor: session.user, date });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
    const saved = await saveDemand(id, result.markdown, { message: `Assign lane ${lane} for ${id}` });
    return NextResponse.json({ ok: true, action: "assign_lane", lane, host: saved.host, target: saved.target });
  }

  if (body.action === "reject") {
    if (!can(session, "park")) {
      return NextResponse.json({ ok: false, error: "You do not have authority to reject/park a demand." }, { status: 403 });
    }
    const result = rejectDemand(md, String(body.reason ?? ""), { actor: session.user, date });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
    const saved = await saveDemand(id, result.markdown, { message: `Reject ${id} at triage` });
    return NextResponse.json({ ok: true, action: "reject", host: saved.host, target: saved.target });
  }

  return NextResponse.json({ ok: false, error: "action must be 'assign_lane' or 'reject'" }, { status: 400 });
}
