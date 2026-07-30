import { NextResponse } from "next/server";
import { DIMENSIONS, CRITERIA, KNOCKOUTS, SELF_ASSESSMENT } from "@/lib/process/criteria";
import { PHASES, BRANCHES, BRANCH_TIEBREAKER, RISK_CHECKS, RISK_CLASSES, CONFIDENCE_LADDER, ANFLUG, DIRECTION_RULES } from "@/lib/process/phases";
import * as llm from "@/lib/process/llm";
import { deny } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const d = await deny();
  if (d) return d;
  return NextResponse.json({
    dimensions: DIMENSIONS,
    criteria: CRITERIA,
    knockouts: KNOCKOUTS.map((k) => k.id),
    selfAssessment: SELF_ASSESSMENT,
    phases: PHASES,
    branches: BRANCHES,
    branchTiebreaker: BRANCH_TIEBREAKER,
    riskChecks: RISK_CHECKS,
    riskClasses: RISK_CLASSES,
    confidenceLadder: CONFIDENCE_LADDER,
    anflug: ANFLUG,
    directionRules: DIRECTION_RULES,
    liveCoaching: llm.available(),
    provider: llm.provider(),
    model: llm.available() ? llm.model() : null,
  });
}
