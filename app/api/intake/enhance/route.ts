import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { EMPTY_ANSWERS, type DemandAnswers } from "@/lib/demand";
import { enhanceDemand } from "@/lib/agent/intake-enhance";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function coerce(a: unknown): DemandAnswers {
  const src = (a ?? {}) as Record<string, unknown>;
  const out = { ...EMPTY_ANSWERS };
  for (const k of Object.keys(out) as (keyof DemandAnswers)[]) {
    if (typeof src[k] === "string") out[k] = src[k] as string;
  }
  return out;
}

/**
 * Intake enhancement. Sharpens the raw answers through the configured model
 * (Anthropic/OpenAI), or a deterministic offline pass with no key. Drafts only —
 * the response is a proposal the requester reviews and applies; nothing is saved
 * here (constraint: AI drafts, humans decide).
 */
export async function POST(req: Request) {
  const t = getT();
  const session = await getSession(); // real deployment resolves this from the OIDC session
  if (!can(session, "draft")) {
    return NextResponse.json({ error: t("api.intake.draftCapabilityRequired", "missing capability: draft") }, { status: 403 });
  }

  let body: { answers?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: t("api.invalidJson", "invalid JSON") }, { status: 400 });
  }

  const answers = coerce(body.answers);
  if (ENHANCEABLE_EMPTY(answers)) {
    return NextResponse.json({ error: t("api.intake.nothingToEnhance", "Nothing to enhance yet — describe the problem first.") }, { status: 400 });
  }

  const result = await enhanceDemand(answers);
  return NextResponse.json(result);
}

/** True when there is no prose to work with (title + problem both empty). */
function ENHANCEABLE_EMPTY(a: DemandAnswers): boolean {
  return a.title.trim() === "" && a.problem.trim() === "";
}
