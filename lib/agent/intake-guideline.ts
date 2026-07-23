/**
 * The intake agent's guideline, loaded at runtime from the playbook.
 *
 * This is what makes `playbooks/s1-intake.md` a real agent guideline and not just
 * documentation: the playbook (plus the interview guide) is read and composed into
 * the live model's **system prompt**, so the model that runs the interview behaves
 * exactly as the playbook specifies. The deterministic offline agent
 * (`lib/intake-agent.ts`) encodes the same rules. Change the playbook → change how
 * the agent behaves, on both paths.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { INTAKE_FIELDS } from "../demand.js";

export interface IntakeGuideline {
  playbook: string;
  interview: string;
}

/** Read the playbook and interview guide that define the agent's behaviour. */
export async function loadIntakeGuideline(baseDir = process.cwd()): Promise<IntakeGuideline> {
  const [playbook, interview] = await Promise.all([
    readFile(join(baseDir, "playbooks/s1-intake.md"), "utf8").catch(() => ""),
    readFile(join(baseDir, "skills/intake-conversation/references/interview.md"), "utf8").catch(() => ""),
  ]);
  return { playbook, interview };
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

/**
 * Compose the system prompt from the playbook + interview guide. The playbook IS
 * the behaviour; this wraps it with the operating contract the model needs.
 */
export function intakeSystemPrompt(g: IntakeGuideline): string {
  const fields = INTAKE_FIELDS
    .map((f) => `- ${f.key}${f.required ? " (required)" : " (optional)"}: ${f.label} — ${f.hint}`)
    .join("\n");

  return [
    "You are the S1 intake agent for Opsphere. You run a short chat interview with a requester to capture ONE demand, then hand it off. You draft; a human decides. You never assign a lane, pass a gate, or merge anything.",
    "You operate strictly by the playbook and interview guide below — they define how you behave based on what the requester says. Follow them.",
    "",
    "=== PLAYBOOK: s1-intake ===",
    g.playbook.trim(),
    "",
    "=== INTERVIEW GUIDE ===",
    g.interview.trim(),
    "",
    "=== OPERATING CONTRACT ===",
    "- Ask ONE question per turn, in the interview's order. Never list the questions.",
    "- Keep the requester's words; tidy grammar only, invent nothing.",
    "- If a required answer is thin, nudge once for a little more (a number where it helps), then accept.",
    "- Handle 'go back' and corrections gracefully; answer brief meta-questions ('why do you ask?') using the field's intent, then re-ask.",
    "- When every REQUIRED field is captured, call the `save_demand` tool with every field you have (leave un-captured optional fields as empty strings). Do NOT call it earlier, and do NOT write the markdown yourself — the portal renders it.",
    "",
    "Fields to collect (key: what it is):",
    fields,
  ].join("\n");
}
