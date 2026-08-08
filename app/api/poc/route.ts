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
import { readDemand } from "@/lib/demands-store";
import { getSession } from "@/lib/auth/current";

export const runtime = "nodejs";

/** Build a PoC seed from the REAL funnel case (du-demands live, or local workspace). */
async function seedFor(useCaseId: string): Promise<UseCaseSeed | undefined> {
  const md = await readDemand(useCaseId);
  if (md === undefined) return undefined;
  return seedFromDemandMarkdown(useCaseId, md);
}

export async function POST(req: Request) {
  const session = await getSession();
  let body: {
    step?: "scaffold" | "artifact";
    useCaseId?: string;
    kind?: ArtifactKind;
    approved?: boolean;
    repo?: RepoRef;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const kind: ArtifactKind = body.kind ?? "dashboard";
  const host = getGitHost();

  if (body.step === "scaffold") {
    if (!can(session, "create_uc")) {
      return NextResponse.json({ error: "missing capability: create_uc" }, { status: 403 });
    }
    const seed = body.useCaseId ? await seedFor(body.useCaseId) : undefined;
    if (!seed) return NextResponse.json({ error: "unknown use case" }, { status: 404 });
    try {
      const plan = planPoc(seed, kind);
      const result = await scaffoldRepo(host, seed, plan);
      return NextResponse.json({
        host: host.kind,
        repo: result.repo,
        committedPaths: result.committedPaths,
        spec: result.spec,
        specPath: result.specPath,
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
      const result = await buildArtifact(host, body.repo, seed, kind, body.approved === true);
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
