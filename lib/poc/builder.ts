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
import type { PocStack, TemplateContext } from "./templates.js";

export interface PocPlan {
  repo: string;
  files: { path: string; content: string }[];
  spec: string;
  /** The chosen stack's id and category, for the response + display. */
  stack: string;
  kind: ArtifactKind;
}

/**
 * Step 1: derive the repo name, the full file set (case skeleton + the chosen
 * stack's tech-specific files, all under `poc/`), and the drafted spec. No writes.
 */
export function planPoc(seed: UseCaseSeed, stack: PocStack, ctx?: TemplateContext): PocPlan {
  return {
    repo: repoName(seed),
    files: [...buildScaffoldFiles(seed), ...stack.files(seed, ctx)],
    spec: draftPocSpec(seed, stack.category, stack.label),
    stack: stack.id,
    kind: stack.category,
  };
}

export interface ScaffoldResult {
  repo: RepoRef;
  committedPaths: string[];
  spec: string;
  specPath: string;
  /** True when the repo was generated from a GitHub template repository. */
  fromTemplate: boolean;
}

/**
 * Step 2: create the repo, commit the scaffold + the drafted spec (on main).
 *
 * When the chosen stack has a GitHub template repository AND the host can generate
 * from it, the uc-* repo is created FROM that template — so the runnable skeleton
 * and its provenance come from a browsable, forkable repo, not a code path. GitHub
 * copies template files verbatim (no substitution), so the portal then overlays the
 * seed-specific files (the case record, the seeded app, the drafted spec) on top.
 * Without a reachable template the same files are written into a plain repo — the
 * honest offline fallback, identical output, no template required.
 */
export async function scaffoldRepo(
  host: GitHost,
  seed: UseCaseSeed,
  plan: PocPlan,
  template?: { owner: string; repo: string },
): Promise<ScaffoldResult> {
  const description = `${seed.id} · ${seed.title}`;
  const repo =
    template && host.createRepoFromTemplate
      ? await host.createRepoFromTemplate(plan.repo, template, { description })
      : await host.createRepo(plan.repo, { description });
  const fromTemplate = Boolean(template && host.createRepoFromTemplate);

  const committed: string[] = [];
  for (const f of plan.files) {
    await host.putFile(repo, f, `scaffold: ${f.path}`, "main");
    committed.push(f.path);
  }
  const specPath = "poc/spec.md";
  await host.putFile(repo, { path: specPath, content: plan.spec }, "draft PoC spec for review", "main");
  committed.push(specPath);
  return { repo, committedPaths: committed, spec: plan.spec, specPath, fromTemplate };
}

export interface ArtifactResult {
  repo: RepoRef;
  artifactPath: string;
  /** The generated artifact content (for preview). */
  artifact: string;
  pullRequest: PullRequestRef;
}

/**
 * Step 3 (post-approval): build the stack's HTML evidence snapshot, commit it on a
 * branch, open a PR. The snapshot is a self-contained page a reviewer can open
 * without running the stack — for the HTML stacks it IS the deliverable, for the
 * code stacks it shows the expected output. `approved` must be true — the checkpoint
 * is enforced here, not just in the UI.
 */
export async function buildArtifact(
  host: GitHost,
  repo: RepoRef,
  seed: UseCaseSeed,
  stack: PocStack,
  approved: boolean,
  ctx?: TemplateContext,
): Promise<ArtifactResult> {
  if (!approved) {
    throw new Error("The PoC spec must be approved by a human before the artifact is built.");
  }
  const branch = "poc/artifact";
  await host.createBranch(repo, branch, "main");

  const artifact = stack.previewHtml(seed, ctx);
  const artifactPath = "poc/evidence.html";
  await host.putFile(repo, { path: artifactPath, content: artifact }, `build ${stack.id} PoC evidence`, branch);

  const pullRequest = await host.openPullRequest(repo, {
    title: `${seed.id}: PoC ${stack.label} for review`,
    head: branch,
    base: "main",
    body: `Drafted by the assistant. Review before merging — the portal never merges.\n\nEvidence snapshot: \`${artifactPath}\`. The runnable PoC is under \`poc/\`.`,
  });

  return { repo, artifactPath, artifact, pullRequest };
}
