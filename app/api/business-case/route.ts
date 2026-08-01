import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { parseUseCase } from "@/lib/parse";
import { parseDemandToAnswers } from "@/lib/demand";
import { draftBusinessCaseMarkdown, setBusinessCaseValue, setAssumptionTested, logBusinessCaseChange } from "@/lib/business-case-draft";
import { parseBusinessCase } from "@/lib/businesscase";
import { readDemand, readArtifact, saveArtifact } from "@/lib/demands-store";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Draft a business case (S3) from a demand and its requirements, and (by default)
 * store `business-case.md` in the case folder. `preview` returns the markdown without
 * writing. Deterministic engine (`lib/business-case-draft.ts`); a live model would
 * follow the same `business-case` playbook. Never states a value it can't support.
 */
export async function POST(req: Request) {
  const t = getT();
  const session = await getSession();
  if (!can(session, "draft")) {
    return NextResponse.json({ error: t("api.businessCase.missingDraftCapability", "missing capability: draft") }, { status: 403 });
  }

  let body: {
    id?: string;
    action?: "generate" | "preview" | "set-value" | "set-assumption";
    annualGross?: number | null;
    buildEstimate?: string;
    annualRunEstimate?: string;
    baselineVerified?: boolean;
    index?: number;
    tested?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: t("api.invalidJson", "invalid JSON") }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: t("api.idRequired", "id is required") }, { status: 400 });

  const date = new Date().toISOString().slice(0, 10);

  // Quantify an existing business case in place — the value/cost the human decides.
  if (body.action === "set-value") {
    const existing = await readArtifact(body.id, "business-case");
    if (existing === undefined) return NextResponse.json({ error: t("api.businessCase.draftFirst", "Draft the business case first.") }, { status: 404 });
    let updated = setBusinessCaseValue(existing, {
      ...(body.annualGross !== undefined ? { annualGross: body.annualGross } : {}),
      ...(body.buildEstimate !== undefined ? { buildEstimate: String(body.buildEstimate) } : {}),
      ...(body.annualRunEstimate !== undefined ? { annualRunEstimate: String(body.annualRunEstimate) } : {}),
      ...(body.baselineVerified !== undefined ? { baselineVerified: Boolean(body.baselineVerified) } : {}),
    });
    if (updated !== existing) {
      const parts: string[] = [];
      if (body.annualGross !== undefined) {
        const g = parseBusinessCase(updated).annualGross;
        parts.push(g !== undefined ? `annual gross set to EUR ${g.toLocaleString("en-US")}` : "annual gross cleared to 'to be quantified'");
      }
      if (body.buildEstimate !== undefined) parts.push("build estimate updated");
      if (body.annualRunEstimate !== undefined) parts.push("run estimate updated");
      if (body.baselineVerified !== undefined) parts.push(`baseline marked ${body.baselineVerified ? "verified" : "unverified"}`);
      updated = logBusinessCaseChange(updated, { actor: session.user, date, summary: parts.join("; ") || "value updated" });
    }
    try {
      const saved = await saveArtifact(body.id, "business-case", updated, { message: `Quantify business case for ${body.id}` });
      return NextResponse.json({ id: body.id, saved: { host: saved.host } });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "save failed" }, { status: 500 });
    }
  }

  // Mark an assumption tested/untested — moves it out of (or into) the downside band.
  if (body.action === "set-assumption") {
    if (typeof body.index !== "number" || body.index < 0) {
      return NextResponse.json({ error: t("api.businessCase.indexNonNegative", "index must be a non-negative number") }, { status: 400 });
    }
    const existing = await readArtifact(body.id, "business-case");
    if (existing === undefined) return NextResponse.json({ error: t("api.businessCase.draftFirst", "Draft the business case first.") }, { status: 404 });
    const tested = Boolean(body.tested);
    const before = parseBusinessCase(existing).assumptions[body.index];
    if (before === undefined) return NextResponse.json({ error: `${t("api.businessCase.noAssumptionAtIndex", "No assumption at index")} ${body.index}.` }, { status: 400 });
    let updated = setAssumptionTested(existing, body.index, tested);
    if (updated !== existing) {
      updated = logBusinessCaseChange(updated, {
        actor: session.user,
        date,
        summary: `assumption "${before.name}" marked ${tested ? "tested" : "untested"}`,
      });
    }
    try {
      const saved = await saveArtifact(body.id, "business-case", updated, { message: `Test assumption for ${body.id}` });
      return NextResponse.json({ id: body.id, saved: { host: saved.host } });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "save failed" }, { status: 500 });
    }
  }

  const md = await readDemand(body.id);
  if (md === undefined) return NextResponse.json({ error: `${t("api.businessCase.demand", "demand")} ${body.id} ${t("api.businessCase.notFoundInFunnel", "not found in the funnel")}` }, { status: 404 });

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
