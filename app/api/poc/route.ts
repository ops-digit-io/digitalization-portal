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
import type { UseCaseSeed } from "@/lib/poc/scaffold";
import { seedFromDemandMarkdown } from "@/lib/poc/seed-from-demand";
import type { ArtifactKind } from "@/lib/poc/spec";
import {
  pocStack,
  defaultStackFor,
  extractRequirementLines,
  type PocStack,
  type TemplateContext,
} from "@/lib/poc/templates";
import { listCustomTemplates, customToStack } from "@/lib/poc/custom-templates";
import { readDemand, readArtifact } from "@/lib/demands-store";
import { getSession } from "@/lib/auth/current";

export const runtime = "nodejs";

/** Build a PoC seed from the REAL funnel case (du-demands live, or local workspace). */
async function seedFor(useCaseId: string): Promise<UseCaseSeed | undefined> {
  const md = await readDemand(useCaseId);
  if (md === undefined) return undefined;
  return seedFromDemandMarkdown(useCaseId, md);
}

/** Feature lines from the demand's requirements artifact, to drive a mockup. */
async function contextFor(useCaseId: string): Promise<TemplateContext> {
  const md = await readArtifact(useCaseId, "requirements").catch(() => undefined);
  const requirements = extractRequirementLines(md);
  return requirements.length ? { requirements } : {};
}

/** The GitHub template repo to generate from, only when the org opted in. */
function templateFor(stack: PocStack): { owner: string; repo: string } | undefined {
  const org = process.env.GITHUB_ORG;
  const on = process.env.POC_USE_TEMPLATE_REPOS === "1" || process.env.POC_USE_TEMPLATE_REPOS === "true";
  return on && org && stack.templateRepo ? { owner: org, repo: stack.templateRepo } : undefined;
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
