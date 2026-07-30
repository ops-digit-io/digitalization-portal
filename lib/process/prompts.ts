/**
 * Loads the Process Funnel's coaching prompts and tool playbook from the portal's
 * SKILL & PLAYBOOK REGISTRY (`du-agent-registry`), via `loadGoverning` — registry
 * first (hot-editable in the catalog), bundled `playbooks/` copy as fallback.
 *
 * The prompts used to live in `process-funnel/coaching-prompts`; they now live in
 * the same git-managed library as every other portal playbook, so they show up in
 * the catalog and sync to the registry repo. Naming:
 *   section coaching prompt   → playbook  process-section-<key>
 *   advisory coaching prompt  → playbook  process-advisory-<key>
 *   shared guidance           → playbook  process-shared-<name>
 *   tool playbook             → playbook  process-tool-playbook
 *
 * `stripFrontmatter` removes the registry frontmatter so only the prompt body is
 * injected into the model — the methodology text is unchanged.
 */

import { loadGoverning, stripFrontmatter } from "../agent/governing";

async function body(name: string): Promise<string> {
  const raw = await loadGoverning("playbook", name);
  return raw ? stripFrontmatter(raw) : "";
}

export function sectionPrompt(key: string): Promise<string> {
  return body(`process-section-${key}`);
}

export function advisoryPrompt(key: string): Promise<string> {
  return body(`process-advisory-${key}`);
}

export function playbook(): Promise<string> {
  return body("process-tool-playbook");
}

// The three shared files were always injected sorted by filename:
// context-oesl, data-and-absence, stance. Preserve that order.
const SHARED = ["context-oesl", "data-and-absence", "stance"];

/** The always-injected shared guidance, each wrapped for the prompt. */
export async function shared(): Promise<string> {
  const parts = await Promise.all(
    SHARED.map(async (n) => {
      const b = await body(`process-shared-${n}`);
      return b ? `<shared-guidance file="${n}.md">\n${b}\n</shared-guidance>` : "";
    }),
  );
  return parts.filter(Boolean).join("\n\n");
}
