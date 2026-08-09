/**
 * `start-poc` — lets the assistant kick off the PoC builder conversationally.
 * It scaffolds the repository and drafts the spec (step 1), then hands the user
 * to the wizard for the approval checkpoint. It does NOT build the artifact —
 * that stays behind the human checkpoint (constraint: humans decide).
 *
 * Bound to `create_uc` (the scaffold step's capability). Per request it closes
 * over the portfolio rows and the git host.
 */

import type { AgentTool } from "../tools.js";
import type { RegistryRow } from "../../registry.js";
import { getGitHost } from "../../git/index.js";
import { planPoc, scaffoldRepo } from "../../poc/builder.js";
import { slugify, type UseCaseSeed } from "../../poc/scaffold.js";
import { seedForDemand, requirementsContext } from "../../poc/seed-from-demand.js";
import { pocStack, defaultStackFor, POC_STACKS } from "../../poc/templates.js";
import type { ArtifactKind } from "../../poc/spec.js";

/** Fallback seed from a registry row — used only when the demand has no README yet. */
function seedFromRow(row: RegistryRow): UseCaseSeed {
  return {
    id: row.id,
    title: row.title,
    slug: slugify(row.title) || row.id.toLowerCase(),
    plant: row.plant ?? "ALL",
    lane: row.lane ?? "transform",
    createdOn: row.since ?? "",
    requester: row.requester ?? "requester@example.com",
    ...(row.domain ? { domain: row.domain } : {}),
  };
}

export interface StartPocInput {
  useCaseId: string;
  /** The tech stack id, e.g. "python-streamlit". Falls back to a category default. */
  stackId?: string;
  kind?: ArtifactKind;
}

export function makeStartPocTool(rows: readonly RegistryRow[]): AgentTool<StartPocInput, unknown> {
  return {
    name: "start-poc",
    description:
      "Scaffold a use-case repository and draft a PoC spec for a use case, ready for human approval. Does not build the artifact (that needs approval).",
    capability: "create_uc",
    inputSchema: {
      type: "object",
      properties: {
        useCaseId: { type: "string", description: "The use case to build a PoC for, e.g. UC-2026-0041." },
        stackId: { type: "string", enum: POC_STACKS.map((s) => s.id), description: "The tech stack to scaffold, e.g. python-streamlit." },
      },
      required: ["useCaseId"],
    },
    async run(input) {
      // Seed from the REAL funnel case (same path as the wizard route) so the PoC
      // carries the true requester, plant, lane, and problem — not a placeholder.
      // Fall back to the registry row only when the demand has no README yet.
      const row = rows.find((r) => r.id === input.useCaseId);
      const seed = (await seedForDemand(input.useCaseId)) ?? (row ? seedFromRow(row) : undefined);
      if (!seed) return { error: `Unknown use case ${input.useCaseId}` };
      const host = getGitHost();
      const stack = pocStack(input.stackId) ?? defaultStackFor(input.kind ?? "dashboard");
      // Requirements feature lines drive the mockup, matching the wizard route.
      const ctx = await requirementsContext(input.useCaseId);
      const plan = planPoc(seed, stack, ctx);
      const result = await scaffoldRepo(host, seed, plan);
      return {
        repo: result.repo.name,
        host: host.kind,
        stack: stack.id,
        committedPaths: result.committedPaths,
        specPath: result.specPath,
        link: `/uc/${seed.id}/poc`,
        note: "Scaffold committed and spec drafted. Approve the spec in the wizard to build the artifact.",
      };
    },
  };
}
