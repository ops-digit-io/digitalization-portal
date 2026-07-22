/**
 * PoC builder pipeline (Feature 3). Three steps with a human-in-the-loop
 * checkpoint between the spec and the artifact:
 *
 *   1. plan     — derive the repo + scaffold files + draft the spec (no writes).
 *   2. scaffold — create the repo and commit the scaffold ("create a repo
 *                 automated"). Returns the repo and the drafted spec for approval.
 *   3. artifact — ONLY after the human approves the spec: generate the artifact,
 *                 commit it on a branch, and OPEN a pull request. Never merges.
 *
 * Authority note: the caller checks the session holds `create_uc` (scaffold) and
 * `draft` (artifact) before invoking — the builder acts under the user's
 * authority, never above it.
 */

import type { GitHost, PullRequestRef, RepoRef } from "../git/host.js";
import { buildScaffoldFiles, repoName, type UseCaseSeed } from "./scaffold.js";
import { draftPocSpec, type ArtifactKind } from "./spec.js";
import { generateDashboardMockup } from "./mockup.js";

export interface PocPlan {
  repo: string;
  files: { path: string; content: string }[];
  spec: string;
  kind: ArtifactKind;
}

export function planPoc(seed: UseCaseSeed, kind: ArtifactKind): PocPlan {
  return {
    repo: repoName(seed),
    files: buildScaffoldFiles(seed),
    spec: draftPocSpec(seed, kind),
    kind,
  };
}

export interface ScaffoldResult {
  repo: RepoRef;
  committedPaths: string[];
  spec: string;
  specPath: string;
}

/** Step 2: create the repo, commit the scaffold + the drafted spec (on main). */
export async function scaffoldRepo(host: GitHost, seed: UseCaseSeed, plan: PocPlan): Promise<ScaffoldResult> {
  const repo = await host.createRepo(plan.repo, { description: `${seed.id} · ${seed.title}` });
  const committed: string[] = [];
  for (const f of plan.files) {
    await host.putFile(repo, f, `scaffold: ${f.path}`, "main");
    committed.push(f.path);
  }
  const specPath = "poc/spec.md";
  await host.putFile(repo, { path: specPath, content: plan.spec }, "draft PoC spec for review", "main");
  committed.push(specPath);
  return { repo, committedPaths: committed, spec: plan.spec, specPath };
}

export interface ArtifactResult {
  repo: RepoRef;
  artifactPath: string;
  /** The generated artifact content (for preview). */
  artifact: string;
  pullRequest: PullRequestRef;
}

/**
 * Step 3 (post-approval): generate the artifact, commit it on a branch, open a PR.
 * `approved` must be true — the checkpoint is enforced here, not just in the UI.
 */
export async function buildArtifact(
  host: GitHost,
  repo: RepoRef,
  seed: UseCaseSeed,
  kind: ArtifactKind,
  approved: boolean,
): Promise<ArtifactResult> {
  if (!approved) {
    throw new Error("The PoC spec must be approved by a human before the artifact is built.");
  }
  const branch = "poc/artifact";
  await host.createBranch(repo, branch, "main");

  // Only the dashboard kind has a concrete generator in this pass; others reuse it
  // as a visual placeholder so the pipeline is complete end to end.
  const artifact = generateDashboardMockup(seed);
  const artifactPath = "poc/mockup.html";
  await host.putFile(repo, { path: artifactPath, content: artifact }, `build ${kind} PoC artifact`, branch);

  const pullRequest = await host.openPullRequest(repo, {
    title: `${seed.id}: PoC ${kind} for review`,
    head: branch,
    base: "main",
    body: `Drafted by the assistant. Review before merging — the portal never merges.\n\nArtifact: \`${artifactPath}\`.`,
  });

  return { repo, artifactPath, artifact, pullRequest };
}
