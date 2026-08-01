/**
 * `/api/model-settings` — the runtime default-model selection behind the options
 * page. GET is open (it returns only non-secret facts: the catalogue, which
 * providers are configured, and the active choice). POST is admin-only, mirroring
 * `/api/categories`: only an administrator changes what the whole deployment
 * runs on.
 *
 * No key or base URL is ever read or written here — those stay in the
 * environment. This endpoint moves only the CHOICE of provider and model, which
 * is not a secret.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { modelOptions, saveModelOverride, resetModelOverride } from "@/lib/model-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, ...(await modelOptions()) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!can(session, "all")) {
    return NextResponse.json({ ok: false, error: "Only an administrator can change the default model." }, { status: 403 });
  }

  let body: { action?: string; provider?: unknown; model?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const result =
    body.action === "reset"
      ? await resetModelOverride()
      : await saveModelOverride({ provider: body.provider, model: body.model });

  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true, ...(await modelOptions()) });
}
