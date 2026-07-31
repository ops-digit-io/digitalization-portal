import { NextResponse } from "next/server";
import { DIMENSIONS, CRITERIA, KNOCKOUTS, SELF_ASSESSMENT } from "@/lib/process/criteria";
import { SECTION_GROUPS, SECTIONS } from "@/lib/process/sections";
import { ADVISORY } from "@/lib/process/advisory";
import { CONFIDENCE_LADDER, ANFLUG, DIRECTION_RULES } from "@/lib/process/phases";
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
    // The anamnesis: five stages, fourteen sections in a fixed sequence. The
    // template is deliberately NOT shipped here — it is large and only the open
    // section needs it (fetched per section).
    groups: SECTION_GROUPS,
    sections: SECTIONS.map((s) => ({
      key: s.key, label: s.label, order: s.order, group: s.group,
      gate: s.gate, blocking: s.blocking, description: s.description,
      ...(s.gateQuestion ? { gateQuestion: s.gateQuestion } : {}),
    })),
    // The advisory layer sits above the anamnesis — proposals, not findings.
    // `file` stays server-side; the client addresses a pass by key.
    advisory: ADVISORY.map((a) => ({
      key: a.key, label: a.label, order: a.order,
      icon: a.icon, description: a.description, needs: a.needs,
    })),
    confidenceLadder: CONFIDENCE_LADDER,
    anflug: ANFLUG,
    directionRules: DIRECTION_RULES,
    liveCoaching: llm.available(),
    provider: llm.provider(),
    model: llm.available() ? llm.model() : null,
  });
}
