/**
 * Governance composition: resolve a playbook into the full guidance an agent runs on.
 *
 * The library already let a playbook name its method skills in frontmatter, but the
 * wiring was flat and copied: each guideline module loaded its own playbook, read
 * `skills:`, loaded those bodies, and pasted them together — so a skill could not
 * itself compose another skill, a typo in a skill name vanished silently, and every
 * new agent meant another copy of the same twenty lines.
 *
 * This module is the one resolver. Its point is COMPOSITION: a playbook calls
 * skills, and a skill may call skills of its own. That makes a skill a reusable
 * unit rather than a leaf — `champions-analysis` can call `network-coverage`, which
 * calls `evidence-standards`, and every agent that needs evidence standards gets
 * the same text without anyone copying it. Enlarging the platform becomes adding a
 * file and naming it, not editing TypeScript.
 *
 * Three properties matter more than the convenience:
 *
 *   1. A MISSING skill is reported, never silently skipped. An agent quietly
 *      running on half its governance is the worst failure this system has,
 *      because the output still looks governed.
 *   2. A CYCLE terminates and is reported. Two skills that reference each other
 *      must not hang a request or blow the stack.
 *   3. Resolution is DETERMINISTIC and depth-first in declaration order, with each
 *      skill appearing once, at its first mention. The same library must compose
 *      the same prompt every time or nothing downstream is reproducible.
 */

import { loadGoverning, stripFrontmatter } from "./governing.js";
import { loadPlaybook, loadSkill } from "./skills.js";

export interface ResolvedSkill {
  name: string;
  body: string;
  /** How it was reached: [] for a playbook's own skill, else the calling chain. */
  via: string[];
}

export interface ResolvedGovernance {
  /** The playbook's name as asked for. */
  playbook: string;
  /** The playbook body (frontmatter stripped), or "" when it is missing. */
  playbookBody: string;
  playbookFound: boolean;
  /** Every skill reached, first-mention order, deduplicated. */
  skills: ResolvedSkill[];
  /** The operating contract, when one was requested and found. */
  contract: string;
  contractName?: string;
  contractFound: boolean;
  /** Names referenced but not resolvable — governance the agent is missing. */
  missing: string[];
  /** Cycles found, as the chain that closed them. */
  cycles: string[][];
}

/** Depth guard: a legitimate chain is 2–3 deep; beyond this something is wrong. */
const MAX_DEPTH = 6;

export interface ComposeOptions {
  /** Contract name to load alongside (`contracts/<name>.md`). */
  contract?: string;
  /** Skills to add even if the playbook does not name them (caller-supplied context). */
  extraSkills?: string[];
}

/**
 * Resolve a playbook, its transitive skills, and optionally its contract.
 *
 * Loads breadth-first per level but emits depth-first in declaration order, so the
 * output reads the way an author wrote it while the IO still batches.
 */
export async function resolveGovernance(playbookName: string, opts: ComposeOptions = {}): Promise<ResolvedGovernance> {
  const [playbookRaw, contractRaw] = await Promise.all([
    loadGoverning("playbook", playbookName),
    opts.contract ? loadGoverning("contract", opts.contract) : Promise.resolve(""),
  ]);

  const playbookFound = playbookRaw.trim() !== "";
  const declared = playbookFound ? loadPlaybook(playbookRaw, playbookName).skills : [];
  const roots = [...declared, ...(opts.extraSkills ?? [])];

  const skills: ResolvedSkill[] = [];
  const missing: string[] = [];
  const cycles: string[][] = [];
  const seen = new Set<string>();
  /** Cache so a diamond (two playbooks naming one skill) costs one read. */
  const bodies = new Map<string, string>();

  async function body(name: string): Promise<string> {
    const hit = bodies.get(name);
    if (hit !== undefined) return hit;
    const raw = await loadGoverning("skill", name);
    bodies.set(name, raw);
    return raw;
  }

  async function walk(name: string, chain: string[]): Promise<void> {
    if (chain.includes(name)) {
      cycles.push([...chain, name]);
      return;
    }
    if (chain.length >= MAX_DEPTH) {
      cycles.push([...chain, name]);
      return;
    }
    if (seen.has(name)) return; // already emitted at its first mention
    const raw = await body(name);
    if (raw.trim() === "") {
      // Report, never skip: an agent running on partial governance still looks governed.
      if (!missing.includes(name)) missing.push(name);
      return;
    }
    seen.add(name);
    skills.push({ name, body: stripFrontmatter(raw), via: [...chain] });
    // A skill may compose skills of its own — that is what makes a skill reusable.
    for (const child of loadSkill(raw, name).skills) await walk(child, [...chain, name]);
  }

  for (const r of roots) await walk(r, []);

  return {
    playbook: playbookName,
    playbookBody: playbookFound ? stripFrontmatter(playbookRaw) : "",
    playbookFound,
    skills,
    contract: contractRaw.trim() ? stripFrontmatter(contractRaw) : "",
    ...(opts.contract ? { contractName: opts.contract } : {}),
    contractFound: contractRaw.trim() !== "",
    missing,
    cycles,
  };
}

/**
 * The composed system prompt.
 *
 * Order is deliberate and is itself a governance decision: the role, then the
 * playbook (what to do), then the skills (how), then the contract LAST — because
 * the contract is what the agent may not do, and the last thing in a system prompt
 * is the thing a model weights hardest.
 *
 * Missing governance is stated IN the prompt rather than hidden. An agent that
 * knows a skill is absent can say so; one that never hears about it invents the
 * gap's content.
 */
export function composeSystemPrompt(role: string, g: ResolvedGovernance): string {
  const parts: string[] = [
    role.trim(),
    "You operate STRICTLY within the playbook, skills, and operating contract below. Do not improvise beyond them.",
    "",
    `=== PLAYBOOK: ${g.playbook} ===`,
    g.playbookBody ||
      "(playbook unavailable — say that governance could not be loaded, and do nothing this playbook was supposed to authorise.)",
  ];

  for (const s of g.skills) {
    const via = s.via.length ? ` (via ${s.via.join(" → ")})` : "";
    parts.push("", `=== SKILL: ${s.name}${via} ===`, s.body);
  }

  if (g.missing.length) {
    parts.push(
      "",
      "=== MISSING GOVERNANCE ===",
      `These were referenced but could not be loaded: ${g.missing.join(", ")}.`,
      "Do not substitute your own judgement for them. Say which part of the method is unavailable and stop short of it.",
    );
  }

  if (g.contractName) {
    parts.push(
      "",
      g.contract ||
        `=== OPERATING CONTRACT: ${g.contractName} ===\n(contract unavailable — governance could not be loaded; take no action this contract was meant to bound.)`,
    );
  }
  return parts.join("\n");
}

/** What governs an agent, for a route or a UI to show and link. */
export function governedBy(g: ResolvedGovernance): {
  playbook: string;
  skills: string[];
  contract?: string;
  missing: string[];
  healthy: boolean;
} {
  return {
    playbook: g.playbook,
    skills: g.skills.map((s) => s.name),
    ...(g.contractName ? { contract: g.contractName } : {}),
    missing: g.missing,
    // Healthy means: everything referenced resolved, and nothing loops.
    healthy: g.playbookFound && g.missing.length === 0 && g.cycles.length === 0 && (!g.contractName || g.contractFound),
  };
}
