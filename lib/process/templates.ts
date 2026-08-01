/**
 * Artefact templates, loaded from `du-templates`.
 *
 * They used to be embedded in `sections.ts` (fourteen markdown documents inside a
 * TypeScript file) and in `lib/process/advisory-templates/`. Both are gone from
 * this repository: a template encodes what the method asks for — which questions a
 * section must answer, which headings the grader matches — and that is the part
 * worth keeping separable from the application.
 *
 * Reads are memoised per process, because a template is asked for on every section
 * open and every prompt build but changes about as often as a quarter. The cache
 * is cleared by a redeploy, which is the same cadence as any other content change
 * that is not the registry.
 *
 * A missing template is returned as "" and the CALLER says so. It is never
 * substituted with a plausible skeleton: an invented template produces an artefact
 * whose headings the grader cannot match, and a section that silently scores zero
 * is worse than one that says its template could not be loaded.
 */

import { readContent, templatesRepo } from "../content-repo.js";

export type TemplateKind = "sections" | "advisory" | "misc";

const cache = new Map<string, string>();

/** `sections/profile`, `advisory/challenge` — the path within the repo, minus `.md`. */
function key(kind: TemplateKind, name: string): string {
  return `${kind}/${name}`;
}

/**
 * One template. Returns "" when it cannot be loaded — from GitHub when the App is
 * configured, otherwise from the local mirror (`npm run content:pull`).
 */
export async function loadTemplate(kind: TemplateKind, name: string): Promise<string> {
  const k = key(kind, name);
  const hit = cache.get(k);
  if (hit !== undefined) return hit;
  const body = (await readContent(templatesRepo(), `${k}.md`).catch(() => undefined)) ?? "";
  const text = body.trim() === "" ? "" : body;
  // Only cache a hit: a miss during a registry outage must not be remembered for
  // the life of the process.
  if (text !== "") cache.set(k, text);
  return text;
}

export const sectionTemplate = (sectionKey: string): Promise<string> => loadTemplate("sections", sectionKey);
export const advisoryTemplate = (advisoryKey: string): Promise<string> => loadTemplate("advisory", advisoryKey);

/** For tests and for a redeploy-free refresh if one is ever wired up. */
export function clearTemplateCache(): void {
  cache.clear();
}

/**
 * The line a prompt or a UI shows when a template is absent. Stated plainly, and
 * with the fix in it — the operator reading this is the person who can act.
 */
export const MISSING_TEMPLATE = "(template unavailable — du-templates could not be read; do not invent one)";
