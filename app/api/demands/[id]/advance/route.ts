import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { readDemand, saveDemand } from "@/lib/demands-store";
import { advanceDemand } from "@/lib/demand-advance";
import { ensureDerivedArtifacts } from "@/lib/funnel/derive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Advance a demand one stage forward in the funnel by recording a gate passage,
 * then persist the rewritten README to `du-demands`.
 *
 * Authority is the session's (constraint #3) — once OIDC is wired this reads the
 * real session; today it is the demo session. Enforcement (gate sequence,
 * sponsor/value-owner, self-approval) lives in `advanceDemand` → `canOpenGate`.
 * This never merges a pull request; it writes the funnel repo directly, which is
 * how the portal has always maintained the intake funnel.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  const id = params.id;

  const md = await readDemand(id);
  if (md === undefined) {
    return NextResponse.json({ ok: false, error: `Demand ${id} not found in the funnel.` }, { status: 404 });
  }

  // Compute the passage (pure — no write) so we know which gate authority to require.
  const date = new Date().toISOString().slice(0, 10);
  const result = advanceDemand(md, { actor: session.user, date });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }

  // Advancing a stage IS passing that gate — require authority for this specific gate.
  if (!can(session, "gate_pass", { gate: result.gate })) {
    return NextResponse.json({ ok: false, error: `You do not have authority to pass ${result.gate}.` }, { status: 403 });
  }

  const saved = await saveDemand(id, result.markdown, {
    message: `Pass ${result.gate} (${result.from}→${result.to}) for ${id}`,
  });

  // Backstop: a demand that reached the funnel by any path still gets its
  // deterministic artifacts. Idempotent and best-effort — never fails the advance.
  await ensureDerivedArtifacts(id).catch(() => {});

  return NextResponse.json({
    ok: true,
    from: result.from,
    to: result.to,
    gate: result.gate,
    host: saved.host,
    target: saved.target,
  });
}
