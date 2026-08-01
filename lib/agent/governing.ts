/**
 * The single way an AI module loads its behaviour: from the AGENT REGISTRY.
 *
 * The playbooks, skills and contracts are NOT in this repository. They live in
 * `du-agent-registry` (see `lib/content-repo.ts` for how it is reached), which is
 * what keeps the method separable from the application: the portal can be handed
 * over without handing over the guidance that makes it work, and the guidance can
 * be edited by the people who own it without an application deploy.
 *
 * Resolution is GitHub → local mirror → nothing. Returns "" when the entry cannot
 * be found, which is a MISSING-GOVERNANCE signal the caller must surface —
 * `compose.ts` writes it into the prompt and marks the run unhealthy. It is never
 * a hardcoded behavioural default: an agent improvising in place of its playbook
 * is the failure this whole arrangement exists to prevent.
 */

import { readContent, registryRepo } from "../content-repo.js";
import { readEntryFile, type EntryType } from "../registry-store.js";

/** Directory in the registry for each entry type. */
const DIR: Record<EntryType, string> = { skill: "skills", playbook: "playbooks", contract: "contracts" };

/**
 * Load a governing playbook, skill or contract. `relPath` reads a file inside a
 * skill bundle (e.g. "references/interview.md"); omit it for a playbook, a
 * contract, or a skill's SKILL.md.
 */
export async function loadGoverning(type: EntryType, name: string, relPath?: string): Promise<string> {
  // The editor path (registry-store) knows about drafts and bundle layouts, so it
  // is tried first; it resolves against the same registry.
  const viaStore = await readEntryFile(type, name, relPath).catch(() => undefined);
  if (viaStore && viaStore.trim()) return viaStore.trim();

  const repo = registryRepo();
  const rel =
    type === "skill"
      ? `${DIR.skill}/${name}/${relPath ?? "SKILL.md"}`
      : `${DIR[type]}/${name}.md`;
  const direct = await readContent(repo, rel).catch(() => undefined);
  if (direct && direct.trim()) return direct.trim();

  // A legacy single-file skill (`skills/<name>.md`) — read before bundles existed.
  if (type === "skill" && !relPath) {
    const legacy = await readContent(repo, `${DIR.skill}/${name}.md`).catch(() => undefined);
    if (legacy && legacy.trim()) return legacy.trim();
  }
  return "";
}

/** Strip a leading YAML frontmatter block from a skill/playbook body. */
export function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
}
