/**
 * The intake agent's governance, loaded at runtime from git-managed sources.
 *
 * This is what makes the playbook and skills REAL agent governance and not just
 * documentation: `playbooks/s1-intake.md` plus the intake skills are read and
 * composed into the live model's **system prompt**, so the model behaves exactly
 * as they specify. Edit them — in `du-agent-registry` or the in-app catalog — and
 * the interview changes, no deploy. The deterministic offline agent
 * (`lib/intake-agent.ts`) encodes the same rules, so both paths stay in lockstep.
 *
 * Sources are read from the registry first (live `du-agent-registry`, else the
 * local tree via `readEntryFile`), with a bundled-repo fallback so a fresh deploy
 * still runs on the full guidance before it lands in the registry.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { INTAKE_FIELDS } from "../demand.js";
import { readEntryFile, type EntryType } from "../registry-store.js";

/** The playbook that governs the interview. */
export const INTAKE_PLAYBOOK = "s1-intake";
/** The skills the interview is bound to — loaded into the system prompt, in order. */
export const INTAKE_SKILLS = ["intake-conversation", "demand-classification"] as const;
/** The file-managed operating contract (editable in the catalog like a playbook). */
export const INTAKE_CONTRACT = "intake";

export interface IntakeSkill {
  name: string;
  body: string;
}
export interface IntakeGuideline {
  playbook: string;
  interview: string;
  skills: IntakeSkill[];
  /** The operating contract, loaded from the library (`contracts/intake.md`). */
  contract: string;
}

/** Read an entry file from the registry, falling back to the bundled repo copy. */
async function readGoverning(type: EntryType, name: string, relPath?: string): Promise<string> {
  const fromRegistry = await readEntryFile(type, name, relPath).catch(() => undefined);
  if (fromRegistry && fromRegistry.trim()) return fromRegistry.trim();

  const candidates =
    type === "playbook"
      ? [join("playbooks", `${name}.md`)]
      : type === "contract"
        ? [join("contracts", `${name}.md`)]
        : relPath
          ? [join("skills", name, relPath)]
          : [join("skills", name, "SKILL.md"), join("skills", `${name}.md`)];
  for (const rel of candidates) {
    const body = await readFile(join(process.cwd(), rel), "utf8").catch(() => undefined);
    if (body && body.trim()) return body.trim();
  }
  return "";
}

/** Read the playbook, interview guide, governing skills, and operating contract. */
export async function loadIntakeGuideline(): Promise<IntakeGuideline> {
  const [playbook, interview, contract, ...skillBodies] = await Promise.all([
    readGoverning("playbook", INTAKE_PLAYBOOK),
    readGoverning("skill", "intake-conversation", "references/interview.md"),
    readGoverning("contract", INTAKE_CONTRACT),
    ...INTAKE_SKILLS.map((s) => readGoverning("skill", s)),
  ]);
  const skills: IntakeSkill[] = INTAKE_SKILLS
    .map((name, i) => ({ name, body: skillBodies[i] ?? "" }))
    .filter((s) => s.body !== "");
  return { playbook, interview, skills, contract };
}

/** The tool the live agent calls once the required fields are captured. */
export const SAVE_DEMAND_TOOL = {
  name: "save_demand",
  description:
    "Record the captured demand once ALL required fields are answered. The portal renders the demand page deterministically from these fields — do not format markdown yourself.",
  input_schema: {
    type: "object",
    properties: Object.fromEntries(INTAKE_FIELDS.map((f) => [f.key, { type: "string", description: `${f.label} — ${f.hint}` }])),
    required: INTAKE_FIELDS.filter((f) => f.required).map((f) => f.key),
  },
};

/** Strip a leading YAML frontmatter block from a skill body. */
function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
}

/**
 * Compose the system prompt from the playbook + interview guide + skills, wrapped
 * with a strict operating contract. The playbook and skills ARE the behaviour;
 * the contract is the non-negotiable frame the model must not step outside.
 */
export function intakeSystemPrompt(g: IntakeGuideline): string {
  const fields = INTAKE_FIELDS
    .map((f) => `- ${f.key}${f.required ? " (required)" : " (optional)"}: ${f.label} — ${f.hint}`)
    .join("\n");

  const skillBlocks = g.skills
    .map((s) => `=== SKILL: ${s.name} ===\n${stripFrontmatter(s.body)}`)
    .join("\n\n");

  return [
    "You are the S1 intake agent for the Digitalization Portal. You run a short chat interview with a requester to capture ONE demand, then hand it off. You draft; a human decides. You never assign a lane, pass a gate, or merge anything.",
    "You operate STRICTLY within the playbook and skills below — they are the single source of truth for how you behave. Do not improvise beyond them.",
    "",
    `=== PLAYBOOK: ${INTAKE_PLAYBOOK} ===`,
    g.playbook.trim(),
    "",
    "=== INTERVIEW GUIDE ===",
    g.interview.trim(),
    "",
    skillBlocks,
    "",
    stripFrontmatter(g.contract) || "=== OPERATING CONTRACT ===\n(contract unavailable — ask one question per turn, invent nothing, draft only, and call save_demand only when every required field is captured.)",
    "",
    "Fields to collect (key: what it is):",
    fields,
  ].join("\n");
}
