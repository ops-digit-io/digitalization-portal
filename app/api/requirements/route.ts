import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { parseUseCase } from "@/lib/parse";
import { parseDemandToAnswers } from "@/lib/demand";
import { analyseIntake, buildRequirementsMarkdown, buildAnalysisMarkdown } from "@/lib/requirements";
import { runResearch } from "@/lib/agent/research-runner";
import { readDemand, saveArtifact } from "@/lib/demands-store";
import { listPersonas } from "@/lib/persona-library-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Requirements analysis & enhancement. Reads a demand from the funnel, analyses and
 * enhances it with domain knowledge, derives standardized requirements, and (by
 * default) stores analysis.md + requirements.md in the case folder. `preview`
 * returns the markdown without writing. Deterministic engine (offline); a live
 * model would follow the same playbook.
 */
export async function POST(req: Request) {
  const session = await getSession(); // real deployment resolves this from the OIDC session
  if (!can(session, "draft")) {
    return NextResponse.json({ error: "missing capability: draft" }, { status: 403 });
  }

  let body: { id?: string; action?: "generate" | "preview" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const md = await readDemand(body.id);
  if (md === undefined) return NextResponse.json({ error: `demand ${body.id} not found in the funnel` }, { status: 404 });

  const answers = parseDemandToAnswers(md);
  const title = parseUseCase(md).title?.replace(/^UC-\d{4}-\d+\s*·\s*/, "") ?? body.id;
  const generatedOn = new Date().toISOString().slice(0, 10);
  const meta = { id: body.id, title, generatedOn };

  // Research the demand against public data (live) or emit the seed plan (offline),
  // then analyse and derive requirements grounded in it.
  const research = await runResearch(answers, meta);
  // Stories cite the persona library, so "As a P-03 · Maintenance Planner" points
  // at a record a reviewer can open. A library read that fails must not sink the
  // whole analysis — the baseline role names still produce a usable document.
  const library = await listPersonas().catch(() => []);
  const { analysis, requirements } = analyseIntake(answers, library);
  const requirementsMd = buildRequirementsMarkdown(meta, requirements);
  const analysisMd = buildAnalysisMarkdown(meta, analysis);

  if (body.action === "preview") {
    return NextResponse.json({ id: body.id, research: research.markdown, analysis: analysisMd, requirements: requirementsMd });
  }

  try {
    const res = await saveArtifact(body.id, "research", research.markdown, { message: `Research ${body.id}` });
    const a = await saveArtifact(body.id, "analysis", analysisMd, { message: `Analyse ${body.id}` });
    const r = await saveArtifact(body.id, "requirements", requirementsMd, { message: `Requirements for ${body.id}` });
    return NextResponse.json({
      id: body.id,
      research: { live: research.live },
      saved: { host: r.host, target: r.target, repo: r.repo, paths: [res.path, a.path, r.path] },
      counts: { epics: requirements.epics.length, stories: requirements.stories.length, nfrs: requirements.nfrs.length },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "save failed" }, { status: 500 });
  }
}
