/**
 * The single way an AI module loads its behaviour: DYNAMICALLY, from the git-managed
 * skill & playbook library.
 *
 * Every module that calls the model MUST source its guidance through this helper (or
 * the equivalent intake loaders) — never from a hardcoded prompt. Resolution:
 *   1. the live registry (`du-agent-registry`), so edits in the in-app catalog take
 *      effect with no deploy — this is what makes the guidance "dynamic";
 *   2. the bundled repo copy as a fallback, so a fresh deployment still runs on the
 *      full playbook/skill before the registry has it.
 *
 * Returns "" only when neither source has the entry (a missing-governance signal the
 * caller can surface), never a hardcoded behavioural default.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readEntryFile, type EntryType } from "../registry-store.js";

/** The bundled-repo path for an entry, mirroring the registry layout. */
function bundledPath(type: EntryType, name: string, relPath?: string): string {
  if (type === "playbook") return join("playbooks", `${name}.md`);
  if (type === "contract") return join("contracts", `${name}.md`);
  return relPath ? join("skills", name, relPath) : join("skills", name, "SKILL.md");
}

/**
 * Load a governing playbook or skill file: registry first (live, hot-editable),
 * then the bundled copy. `relPath` reads a file inside a skill bundle (e.g.
 * "references/interview.md"); omit it for a playbook or a skill's SKILL.md.
 */
export async function loadGoverning(type: EntryType, name: string, relPath?: string): Promise<string> {
  const fromRegistry = await readEntryFile(type, name, relPath).catch(() => undefined);
  if (fromRegistry && fromRegistry.trim()) return fromRegistry.trim();
  const bundled = await readFile(join(process.cwd(), bundledPath(type, name, relPath)), "utf8").catch(() => "");
  return bundled.trim();
}

/** Strip a leading YAML frontmatter block from a skill/playbook body. */
export function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
}
