import { NextResponse } from "next/server";
import { SELF_CRITERIA, triage } from "@/lib/process/self-assessment";
import type { Level } from "@/lib/process/criteria";
import { deny } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The seven Kurzform criteria the spoke self-rates. */
export async function GET() {
  const d = await deny();
  if (d) return d;
  return NextResponse.json({ criteria: SELF_CRITERIA });
}

/** Triage a self-assessment: aufnehmen / enabler / zurückstellen / selbsthilfe. */
export async function POST(req: Request) {
  const d = await deny();
  if (d) return d;
  const body = (await req.json().catch(() => ({}))) as { levels?: Record<string, number> };
  const levels: Record<string, Level | undefined> = {};
  for (const c of SELF_CRITERIA) {
    const v = body.levels?.[c.id];
    if (v != null) levels[c.id] = Math.min(5, Math.max(1, Math.round(Number(v)))) as Level;
  }
  return NextResponse.json({ triage: triage(levels), criteria: SELF_CRITERIA });
}
