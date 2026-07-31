/**
 * Loads the Process Funnel's coaching guidance from the portal's SKILL & PLAYBOOK
 * REGISTRY (`du-agent-registry`) via `loadGoverning` — registry first (hot-editable
 * in the catalog), bundled `playbooks/` copy as fallback. `stripFrontmatter`
 * removes the registry frontmatter so only the prompt body is injected.
 */

import { loadGoverning, stripFrontmatter } from "../agent/governing";

async function body(name: string): Promise<string> {
  const raw = await loadGoverning("playbook", name);
  return raw ? stripFrontmatter(raw) : "";
}

/** The coaching stance for a dimension assessment (coach-then-rate). */
export function dimensionCoach(): Promise<string> {
  return body("process-dimension-coach");
}

/**
 * The coaching prompt for ONE anamnesis section: how to run that interview —
 * the interviewer's stance, what to establish, what not to chase, and why the
 * section decides whether the engagement goes on. One per section key.
 */
export function sectionCoach(key: string): Promise<string> {
  return body(`process-section-${key}`);
}

/** One of the four advisory prompts (clusters, improvements, target-tech, challenge). */
export function advisoryPrompt(name: string): Promise<string> {
  return body(`process-advisory-${name}`);
}

/** The organisation's tool playbook (for the Toolbox-Evolution branch). */
export function playbook(): Promise<string> {
  return body("process-tool-playbook");
}

// The three shared files were always injected sorted by filename.
const SHARED = ["context-oesl", "data-and-absence", "stance"];

export async function shared(): Promise<string> {
  const parts = await Promise.all(
    SHARED.map(async (n) => {
      const b = await body(`process-shared-${n}`);
      return b ? `<shared-guidance file="${n}.md">\n${b}\n</shared-guidance>` : "";
    }),
  );
  return parts.filter(Boolean).join("\n\n");
}
