import { NextResponse } from "next/server";
import { RISK_CHECKS } from "@/lib/process/phases";
import * as store from "@/lib/process/store";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug } = params;
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  return NextResponse.json({ checks: RISK_CHECKS, answers: await store.riskChecks(slug) });
}

/** Answer one of the 7 Änderungsrisiko Prüfpunkte (doc B §5). */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug } = params;
  if (!(await store.exists(slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { n?: number; answer?: string; evidence?: string };
  const n = Number(body.n);
  if (!RISK_CHECKS.some((c) => c.n === n)) return NextResponse.json({ error: "no such check" }, { status: 400 });
  await store.setRiskCheck(slug, n, String(body.answer || ""), String(body.evidence || ""), now());
  return NextResponse.json({ saved: true, answers: await store.riskChecks(slug) });
}
