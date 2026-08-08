/**
 * Standing up a `du-template-*` repository from a stack — the logic shared by the
 * in-app Templates tool (`/api/templates`) and the CLI (`create-template-repos.mjs`).
 *
 * GitHub copies a template's files verbatim when generating, so the files written
 * here carry NEUTRAL placeholders (`UC-XXXX-XXXX`); the portal overlays the real case
 * values when it later generates a `uc-*` repo from the template.
 */

import type { GitHost, RepoRef } from "../git/host.js";
import type { ScaffoldFile, UseCaseSeed } from "./scaffold.js";
import type { PocStack } from "./templates.js";

/** The placeholder case a template repo is materialised for. */
export const TEMPLATE_SEED: UseCaseSeed = {
  id: "UC-XXXX-XXXX",
  title: "Use-Case PoC",
  slug: "use-case-poc",
  plant: "PLANT",
  lane: "transform",
  domain: "process",
  createdOn: "2026-01-01",
};

/** The repo-root README describing the template and citing its public upstream. */
export function templateReadme(stack: PocStack): string {
  return `# ${stack.templateRepo}

PoC template · **${stack.label}**.

${stack.description}

Follows [${stack.upstream.name}](${stack.upstream.url}). Used by the digitalization
portal's PoC builder via GitHub "generate from template" — the portal creates a
use-case repository from this template, then overlays the case's own files.

Run locally: \`${stack.run}\` (from \`poc/\`).
`;
}

/** Every file a template repo should hold: the root README + the stack's files. */
export function templateRepoFiles(stack: PocStack): ScaffoldFile[] {
  return [{ path: "README.md", content: templateReadme(stack) }, ...stack.files(TEMPLATE_SEED)];
}

export interface ProvisionResult {
  repo: RepoRef;
  files: number;
}

/**
 * Create the stack's template repository (flagged as a GitHub template) and populate
 * it. Requires a host that can create repos — i.e. GitHub App credentials; a
 * LocalHost run writes to the working tree, which is only useful for a dry run.
 */
export async function provisionTemplateRepo(
  host: GitHost,
  stack: PocStack,
  opts: { private?: boolean } = {},
): Promise<ProvisionResult> {
  const repo = await host.createRepo(stack.templateRepo, {
    description: `PoC template · ${stack.label} — follows ${stack.upstream.name}`,
    private: opts.private ?? false,
    template: true,
  });
  const files = templateRepoFiles(stack);
  for (const f of files) await host.putFile(repo, f, `scaffold template: ${f.path}`, "main");
  return { repo, files: files.length };
}
