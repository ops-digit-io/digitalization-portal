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
import type { ArtifactKind } from "../../poc/spec.js";

export interface StartPocInput {
  useCaseId: string;
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
        kind: { type: "string", enum: ["dashboard", "app", "mockup", "report"] },
      },
      required: ["useCaseId"],
    },
    async run(input) {
      const row = rows.find((r) => r.id === input.useCaseId);
      if (!row) return { error: `Unknown use case ${input.useCaseId}` };
      const seed: UseCaseSeed = {
        id: row.id,
        title: row.title,
        slug: slugify(row.title),
        plant: row.plant ?? "ALL",
        lane: row.lane ?? "transform",
        createdOn: "2026-05-19",
        requester: "requester@example.com",
        ...(row.domain ? { domain: row.domain } : {}),
      };
      const host = getGitHost();
      const plan = planPoc(seed, input.kind ?? "dashboard");
      const result = await scaffoldRepo(host, seed, plan);
      return {
        repo: result.repo.name,
        host: host.kind,
        committedPaths: result.committedPaths,
        specPath: result.specPath,
        link: `/uc/${row.id}/poc`,
        note: "Scaffold committed and spec drafted. Approve the spec in the wizard to build the artifact.",
      };
    },
  };
}
