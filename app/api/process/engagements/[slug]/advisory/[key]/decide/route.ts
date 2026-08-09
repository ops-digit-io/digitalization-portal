import { NextResponse } from "next/server";
import { advisoryByKey, decide, type Verdict } from "@/lib/process/advisory";
import * as store from "@/lib/process/store";
import { denyWrite, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERDICTS: Verdict[] = ["accepted", "rejected", "deferred"];

/**
 * Record a verdict on one proposal. A rejection without a reason is refused
 * here — a proposal that quietly disappears teaches nobody anything.
 */
export async function POST(req: Request, { params }: { params: { slug: string; key: string } }) {
  const d = await denyWrite();
  if (d) return d;
  const { slug, key } = params;
  if (!advisoryByKey[key]) return NextResponse.json({ error: "no such advisory pass" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as {
    proposalId?: string; title?: string; verdict?: string; reason?: string;
  };
  const verdict = String(body.verdict || "") as Verdict;
  const proposalId = String(body.proposalId || "").trim();
  if (!proposalId) return NextResponse.json({ error: "proposalId required" }, { status: 400 });
  if (!VERDICTS.includes(verdict)) return NextResponse.json({ error: `verdict must be one of ${VERDICTS.join(", ")}` }, { status: 400 });
  if (verdict === "rejected" && !String(body.reason || "").trim()) {
    return NextResponse.json({ error: "a rejection needs a reason" }, { status: 400 });
  }
  const entry = await decide(slug, { advisoryKey: key, proposalId, title: body.title, verdict, reason: body.reason }, now());
  return NextResponse.json({ decision: entry, decisions: (await store.readDecisions(slug)).filter((x) => x.advisoryKey === key) });
}
