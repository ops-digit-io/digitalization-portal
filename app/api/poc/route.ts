/**
 * `/api/poc` — the agentic PoC builder endpoint (Feature 3). Server-side only.
 *
 * Steps:
 *   - "scaffold": create the repo + commit scaffold + draft the spec. Requires
 *     `create_uc`.
 *   - "artifact": AFTER human approval, generate the artifact + open a PR.
 *     Requires `draft` and `approved: true` (the checkpoint is enforced here).
 *
 * Live GitHub when GITHUB_APP_* is set; local disk fallback otherwise. No merge.
 */

import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getGitHost } from "@/lib/git";
import type { RepoRef } from "@/lib/git";
import { planPoc, scaffoldRepo, buildArtifact } from "@/lib/poc/builder";
import { repoName } from "@/lib/poc/scaffold";
import { seedForDemand, requirementsContext } from "@/lib/poc/seed-from-demand";
import type { ArtifactKind } from "@/lib/poc/spec";
import { pocStack, defaultStackFor, type PocStack } from "@/lib/poc/templates";
import { listCustomTemplates, customToStack } from "@/lib/poc/custom-templates";
import { getSession } from "@/lib/auth/current";

export const runtime = "nodejs";

// Seeding + requirements context are shared with the conversational start-poc tool
// (`lib/poc/seed-from-demand.ts`), so both entry points act on the real funnel case.
const seedFor = seedForDemand;
const contextFor = requirementsContext;

/** The GitHub template repo to generate from, only when the org opted in. */
function templateFor(stack: PocStack): { owner: string; repo: string } | undefined {
  const org = process.env.GITHUB_ORG;
  const on = process.env.POC_USE_TEMPLATE_REPOS === "1" || process.env.POC_USE_TEMPLATE_REPOS === "true";
  return on && org && stack.templateRepo ? { owner: org, repo: stack.templateRepo } : undefined;
}

/**
 * Scaffold status for a use case: does its uc-* repository already exist? So the
 * builder can say "already scaffolded" instead of silently creating a second repo.
 * `scaffolded` is null when there is no GitHub App to ask (the honest unknown).
 */
export async function GET(req: Request) {
  const useCaseId = new URL(req.url).searchParams.get("useCaseId");
  if (!useCaseId) return NextResponse.json({ error: "useCaseId required" }, { status: 400 });
  const seed = await seedFor(useCaseId);
  if (!seed) return NextResponse.json({ useCaseId, repo: null, scaffolded: null, url: null });
  const name = repoName(seed);
  const host = getGitHost();
  const meta = host.getRepoMeta ? await host.getRepoMeta(name).catch(() => undefined) : undefined;
  const org = process.env.GITHUB_ORG;
  return NextResponse.json({
    useCaseId,
    repo: name,
    scaffolded: meta ? meta.exists : null,
    url: org ? `https://github.com/${org}/${name}` : null,
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  let body: {
    step?: "scaffold" | "artifact";
    useCaseId?: string;
    stackId?: string;
    kind?: ArtifactKind;
    approved?: boolean;
    repo?: RepoRef;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // The stack is chosen by id — a built-in stack, or a registered custom template —
  // falling back to a category default for the old kind-only payload.
  const custom = body.stackId ? (await listCustomTemplates().catch(() => [])).find((c) => c.id === body.stackId) : undefined;
  const stack = pocStack(body.stackId) ?? (custom ? customToStack(custom) : undefined) ?? defaultStackFor(body.kind ?? "dashboard");
  const host = getGitHost();

  if (body.step === "scaffold") {
    if (!can(session, "create_uc")) {
      return NextResponse.json({ error: "missing capability: create_uc" }, { status: 403 });
    }
    const seed = body.useCaseId ? await seedFor(body.useCaseId) : undefined;
    if (!seed) return NextResponse.json({ error: "unknown use case" }, { status: 404 });
    try {
      const ctx = await contextFor(seed.id);
      const plan = planPoc(seed, stack, ctx);
      const result = await scaffoldRepo(host, seed, plan, templateFor(stack));
      return NextResponse.json({
        host: host.kind,
        repo: result.repo,
        committedPaths: result.committedPaths,
        spec: result.spec,
        specPath: result.specPath,
        stack: stack.id,
        fromTemplate: result.fromTemplate,
      });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "scaffold failed" }, { status: 500 });
    }
  }

  if (body.step === "artifact") {
    if (!can(session, "draft")) {
      return NextResponse.json({ error: "missing capability: draft" }, { status: 403 });
    }
    const seed = body.useCaseId ? await seedFor(body.useCaseId) : undefined;
    if (!seed || !body.repo) return NextResponse.json({ error: "missing repo or use case" }, { status: 400 });
    try {
      const ctx = await contextFor(seed.id);
      const result = await buildArtifact(host, body.repo, seed, stack, body.approved === true, ctx);
      return NextResponse.json({
        host: host.kind,
        artifactPath: result.artifactPath,
        pullRequest: result.pullRequest,
        artifact: result.artifact,
      });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "artifact failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "unknown step" }, { status: 400 });
}
