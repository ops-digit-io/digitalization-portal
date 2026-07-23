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
import { slugify, type UseCaseSeed } from "@/lib/poc/scaffold";
import type { ArtifactKind } from "@/lib/poc/spec";
import { DEMO_NOW, SEED_ROWS } from "@/lib/seed";
import { getSession } from "@/lib/auth/current";

export const runtime = "nodejs";

function seedFor(useCaseId: string): UseCaseSeed | undefined {
  const row = SEED_ROWS.find((r) => r.id === useCaseId);
  if (!row) return undefined;
  const seed: UseCaseSeed = {
    id: row.id,
    title: row.title,
    slug: slugify(row.title),
    plant: row.plant ?? "ALL",
    lane: row.lane ?? "transform",
    createdOn: DEMO_NOW.slice(0, 10),
    problem: "Captured at intake — see the use case.",
    requester: "requester@example.com",
  };
  if (row.domain) seed.domain = row.domain;
  return seed;
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
    const seed = body.useCaseId ? seedFor(body.useCaseId) : undefined;
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
    const seed = body.useCaseId ? seedFor(body.useCaseId) : undefined;
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
