import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { decide } from "@/lib/approvals/service";
import { ProposalError } from "@/lib/approvals/model";
import { createDefaultRegistry } from "@/lib/agent/registry";
import { makeStartPocTool } from "@/lib/agent/tools/start-poc";
import { loadPortfolioRows } from "@/lib/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `POST /api/approvals/:id/decide` — the human yes or no (N2).
 *
 * The capability check is here as well as in the interface, so the button being
 * disabled is not the enforcement. Deciding needs `decide_proposal` AND the
 * action's own capability: approving runs the tool under THIS session
 * (constraint #3), so an approval can never reach further than its approver.
 *
 * Nothing here merges anything and no gate is passed — structurally, not by
 * policy: a proposal may only name a registered acting tool, and no such tool
 * may require a gate/merge/decision capability (constraint #2).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!can(session, "decide_proposal")) {
    return NextResponse.json({ error: "not permitted to decide proposals" }, { status: 403 });
  }

  let body: { decision?: string; reason?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (body.decision !== "approve" && body.decision !== "reject") {
    return NextResponse.json({ error: 'decision must be "approve" or "reject"' }, { status: 400 });
  }

  // The registry the decision executes against must be the same one the run was
  // offered, or an approved action could resolve to a different tool.
  const { rows } = await loadPortfolioRows();
  const registry = createDefaultRegistry().register(makeStartPocTool(rows));

  try {
    const result = await decide({
      id: params.id,
      decision: body.decision,
      ...(body.reason ? { reason: body.reason } : {}),
      session,
      registry,
    });
    return NextResponse.json({
      ok: result.proposal.status !== "failed",
      proposal: result.proposal,
      ...(result.output !== undefined ? { output: result.output } : {}),
    });
  } catch (err) {
    // A refused decision is the caller's problem (400/403), not a server fault:
    // already decided, missing reason, or beyond this session's authority.
    if (err instanceof ProposalError) {
      const forbidden = err.message.includes("may not decide");
      return NextResponse.json({ error: err.message }, { status: forbidden ? 403 : 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "decision failed" }, { status: 500 });
  }
}
