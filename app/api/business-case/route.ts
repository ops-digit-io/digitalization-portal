import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { parseUseCase } from "@/lib/parse";
import { parseDemandToAnswers } from "@/lib/demand";
import { draftBusinessCaseMarkdown, setBusinessCaseValue } from "@/lib/business-case-draft";
import { readDemand, readArtifact, saveArtifact } from "@/lib/demands-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Draft a business case (S3) from a demand and its requirements, and (by default)
 * store `business-case.md` in the case folder. `preview` returns the markdown without
 * writing. Deterministic engine (`lib/business-case-draft.ts`); a live model would
 * follow the same `business-case` playbook. Never states a value it can't support.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!can(session, "draft")) {
    return NextResponse.json({ error: "missing capability: draft" }, { status: 403 });
  }

  let body: {
    id?: string;
    action?: "generate" | "preview" | "set-value";
    annualGross?: number | null;
    buildEstimate?: string;
    annualRunEstimate?: string;
    baselineVerified?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Quantify an existing business case in place — the value/cost the human decides.
  if (body.action === "set-value") {
    const existing = await readArtifact(body.id, "business-case");
    if (existing === undefined) return NextResponse.json({ error: "Draft the business case first." }, { status: 404 });
    const updated = setBusinessCaseValue(existing, {
      ...(body.annualGross !== undefined ? { annualGross: body.annualGross } : {}),
      ...(body.buildEstimate !== undefined ? { buildEstimate: String(body.buildEstimate) } : {}),
      ...(body.annualRunEstimate !== undefined ? { annualRunEstimate: String(body.annualRunEstimate) } : {}),
      ...(body.baselineVerified !== undefined ? { baselineVerified: Boolean(body.baselineVerified) } : {}),
    });
    try {
      const saved = await saveArtifact(body.id, "business-case", updated, { message: `Quantify business case for ${body.id}` });
      return NextResponse.json({ id: body.id, saved: { host: saved.host } });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "save failed" }, { status: 500 });
    }
  }

  const md = await readDemand(body.id);
  if (md === undefined) return NextResponse.json({ error: `demand ${body.id} not found in the funnel` }, { status: 404 });

  const answers = parseDemandToAnswers(md);
  const title = parseUseCase(md).title?.replace(/^UC-\d{4}-\d+\s*·\s*/, "") ?? body.id;
  const generatedOn = new Date().toISOString().slice(0, 10);
  const requirementsMd = await readArtifact(body.id, "requirements");

  const businessCaseMd = draftBusinessCaseMarkdown({ id: body.id, title, generatedOn }, answers, requirementsMd);

  if (body.action === "preview") {
    return NextResponse.json({ id: body.id, businessCase: businessCaseMd, fromRequirements: requirementsMd !== undefined });
  }

  try {
    const saved = await saveArtifact(body.id, "business-case", businessCaseMd, { message: `Draft business case for ${body.id}` });
    return NextResponse.json({
      id: body.id,
      saved: { host: saved.host, target: saved.target, repo: saved.repo, path: saved.path },
      fromRequirements: requirementsMd !== undefined,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "save failed" }, { status: 500 });
  }
}
