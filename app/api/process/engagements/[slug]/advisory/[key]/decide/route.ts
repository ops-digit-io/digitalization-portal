import { NextResponse } from "next/server";
import { byKey } from "@/lib/process/advisory";
import * as store from "@/lib/process/store";
import * as advisor from "@/lib/process/advisor";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { slug: string; key: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug, key } = params;
  if (!byKey[key]) return NextResponse.json({ error: "no such advisory item" }, { status: 404 });
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { proposalId?: string; title?: string; verdict?: string; reason?: string };
  if (!String(body.proposalId || "").trim()) return NextResponse.json({ error: "proposalId required" }, { status: 400 });
  if (!["accepted", "rejected", "deferred"].includes(String(body.verdict))) {
    return NextResponse.json({ error: "verdict must be accepted, rejected or deferred" }, { status: 400 });
  }
  if (body.verdict !== "accepted" && !String(body.reason || "").trim()) {
    return NextResponse.json({ error: "rejecting or deferring a proposal needs a reason" }, { status: 400 });
  }
  return NextResponse.json(
    await advisor.decide(
      slug,
      {
        advisoryKey: key,
        proposalId: String(body.proposalId),
        title: body.title,
        verdict: body.verdict as "accepted" | "rejected" | "deferred",
        reason: body.reason,
      },
      now(),
    ),
  );
}
