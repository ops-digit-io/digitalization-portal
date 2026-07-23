/**
 * Skill and playbook loading (`docs/10-skills.md`, `docs/11-playbooks.md`).
 *
 * Extension seam: a skill or playbook is a markdown file with frontmatter. The
 * loader reads the frontmatter into a typed record and keeps the body as the
 * guidance the agent receives. Adding a skill or playbook is dropping in a file;
 * nothing here enumerates them by name.
 */

import { parseFrontmatter, metaList } from "./frontmatter.js";
import type { Capability } from "../rbac.js";

export interface Skill {
  name: string;
  description: string;
  /** Capabilities this skill's actions require, if declared. */
  capabilities: string[];
  /** Tool names this skill expects to be available, if declared. */
  tools: string[];
  /** The markdown guidance body handed to the model. */
  body: string;
}

export function loadSkill(source: string, fallbackName = "unnamed-skill"): Skill {
  const { meta, body } = parseFrontmatter(source);
  const name = typeof meta.name === "string" && meta.name !== "" ? meta.name : fallbackName;
  const description = typeof meta.description === "string" ? meta.description : "";
  return {
    name,
    description,
    capabilities: metaList(meta.capabilities),
    tools: metaList(meta.tools),
    body,
  };
}

export interface Playbook {
  name: string;
  description: string;
  /** Skill names this playbook composes. */
  skills: string[];
  /** Ordered checkpoint labels where a human must confirm before proceeding. */
  checkpoints: string[];
  body: string;
}

export function loadPlaybook(source: string, fallbackName = "unnamed-playbook"): Playbook {
  const { meta, body } = parseFrontmatter(source);
  const name = typeof meta.name === "string" && meta.name !== "" ? meta.name : fallbackName;
  const description = typeof meta.description === "string" ? meta.description : "";
  return {
    name,
    description,
    skills: metaList(meta.skills),
    checkpoints: metaList(meta.checkpoints),
    body,
  };
}

/** Capabilities a skill declares, narrowed to known portal capabilities. */
export function declaredCapabilities(skill: Skill, known: readonly Capability[]): Capability[] {
  const set = new Set<string>(known);
  return skill.capabilities.filter((c): c is Capability => set.has(c));
}
