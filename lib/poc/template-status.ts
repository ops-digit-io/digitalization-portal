/**
 * The health of each PoC template repository — what the Templates tool checks.
 *
 * A template is "ready" only when its `du-template-*` repo exists AND is flagged a
 * GitHub template (generate-from-template returns 422 otherwise). We also report
 * whether it is populated. When there is no GitHub App to ask (offline/local), the
 * state is "unknown" rather than a false "missing".
 */

import type { GitHost, RepoRef } from "../git/host.js";
import type { PocStack } from "./templates.js";

export type TemplateState = "ready" | "not-template" | "missing" | "unknown";

export interface TemplateStatus {
  id: string;
  label: string;
  category: string;
  templateRepo: string;
  upstream: { name: string; url: string };
  custom: boolean;
  state: TemplateState;
  /** True when the repo has files under poc/; undefined when it could not be read. */
  populated?: boolean;
  url: string;
}

export async function templateStatuses(
  host: GitHost,
  stacks: readonly { stack: PocStack; custom: boolean }[],
  org: string | undefined,
): Promise<TemplateStatus[]> {
  return Promise.all(
    stacks.map(async ({ stack, custom }): Promise<TemplateStatus> => {
      const url = org ? `https://github.com/${org}/${stack.templateRepo}` : "";
      const base = {
        id: stack.id,
        label: stack.label,
        category: stack.category,
        templateRepo: stack.templateRepo,
        upstream: stack.upstream,
        custom,
        url,
      };
      if (!host.getRepoMeta) return { ...base, state: "unknown" };
      try {
        const meta = await host.getRepoMeta(stack.templateRepo);
        if (!meta.exists) return { ...base, state: "missing" };
        const ref: RepoRef = { owner: org ?? "", name: stack.templateRepo, url, local: false };
        const populated = await host
          .listDir(ref, "poc")
          .then((e) => e.length > 0)
          .catch(() => undefined);
        return { ...base, state: meta.isTemplate ? "ready" : "not-template", populated };
      } catch {
        return { ...base, state: "unknown" };
      }
    }),
  );
}
