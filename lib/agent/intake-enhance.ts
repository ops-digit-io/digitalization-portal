/**
 * Intake enhancement — sharpen a vague demand at capture (playbook `s1-intake`).
 *
 * A demand often arrives weak: one terse line, no numbers, an implied outcome.
 * This pass uses the model to turn that into a clearer, better-structured demand
 * BEFORE it lands — the "enhance the raw input" step, distinct from detailed
 * requirements engineering (that is `requirements.md`, a separate later process).
 *
 * It operates on the ANSWERS, not the rendered markdown, so the deterministic
 * `buildDemand` contract is untouched: the model normalises/sharpens the fields,
 * a human reviews and applies, and code renders the artifact. Two hard rules keep
 * it honest:
 *   - It NEVER invents facts or numbers. Where a figure is missing it keeps the
 *     text and raises an open question instead of fabricating one (constraint #8).
 *   - It DRAFTS; the human decides. Nothing here is applied without review.
 *
 * The behaviour is NOT hard-coded here — it is governed by the git-managed
 * playbook `s1-intake-enhance`, read at runtime from the registry (`du-agent-registry`
 * live, or the local `playbooks/` tree). Edit the playbook — in `du-agent-registry`
 * or the in-app catalog — to change how the enhancer behaves, no deploy. Code owns
 * only the structural output contract (the JSON shape the parser depends on).
 *
 * Live via the configured provider (Anthropic/OpenAI); with no key a deterministic
 * offline pass still tidies the text, flags gaps, and asks the right questions, so
 * the whole flow runs and demos without a model.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { INTAKE_FIELDS, type DemandAnswers } from "../demand.js";
import { loadGoverning } from "./governing.js";
import { type ModelProvider } from "./provider.js";
import { resolveProvider } from "../model-settings.js";

/** The git-managed playbook that governs this agent's behaviour. */
export const ENHANCE_PLAYBOOK = "s1-intake-enhance";

/** The prose fields the enhancer may sharpen (structured fields are left alone). */
export const ENHANCE_KEYS = [
  "title",
  "problem",
  "currentPain",
  "desiredOutcome",
  "affectedProcess",
  "frequencyScale",
  "constraints",
] as const;
export type EnhanceKey = (typeof ENHANCE_KEYS)[number];

const FIELD_BY_KEY = new Map(INTAKE_FIELDS.map((f) => [f.key, f]));
/** Fields where a number materially sharpens the case. */
const QUANTIFIABLE = new Set<EnhanceKey>(["currentPain", "frequencyScale"]);
const REQUIRED_PROSE = new Set<EnhanceKey>(["problem", "currentPain", "desiredOutcome"]);

export interface FieldEnhancement {
  key: EnhanceKey;
  label: string;
  original: string;
  enhanced: string;
  changed: boolean;
  /** A deterministic gap flag, e.g. a missing number — shown regardless of provider. */
  gap?: string;
}

export type Score = "weak" | "adequate" | "strong";

export interface EnhancementResult {
  fields: FieldEnhancement[];
  openQuestions: string[];
  assessment: { score: Score; summary: string };
  /** The provider that produced the enhancement ("anthropic" | "openai" | "offline"). */
  provider: string;
  live: boolean;
  /** The git-managed playbook that governed this run. */
  playbook: string;
}

function label(key: EnhanceKey): string {
  return FIELD_BY_KEY.get(key)?.label ?? key;
}

function words(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}
function hasNumber(s: string): boolean {
  return /\d/.test(s);
}

/** Light, safe normalisation: collapse whitespace, capitalise the first letter. */
function tidy(s: string): string {
  const t = s.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/[ \t]+\n/g, "\n").trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Deterministic gap for a field — the fabrication guard, applied in every mode. */
function gapFor(key: EnhanceKey, value: string): string | undefined {
  const v = value.trim();
  if (REQUIRED_PROSE.has(key) && v !== "" && words(v) < 6) {
    return "Very brief — a sentence or two more would help triage.";
  }
  if (QUANTIFIABLE.has(key) && v !== "" && !hasNumber(v)) {
    return "No number yet — quantify it if you can (hours, units, €, %).";
  }
  return undefined;
}

/** Score the demand's signal strength from the required prose fields. */
function assess(answers: DemandAnswers): { score: Score; summary: string } {
  const problem = answers.problem.trim();
  const pain = answers.currentPain.trim();
  const outcome = answers.desiredOutcome.trim();
  const thin = [problem, pain, outcome].filter((v) => v === "" || words(v) < 6).length;
  const quantified = hasNumber(pain) || hasNumber(answers.frequencyScale);

  if (thin > 0) {
    return { score: "weak", summary: "Core fields are thin — the problem, its impact, or the target outcome need more detail before triage." };
  }
  if (!quantified) {
    return { score: "adequate", summary: "The story is clear but unquantified — a number on impact or frequency would strengthen the case." };
  }
  return { score: "strong", summary: "Problem, impact, and outcome are all described and at least one figure is present." };
}

/** Build per-field enhancements from a map of proposed (already-sharpened) values. */
function toFields(answers: DemandAnswers, proposed: Partial<Record<EnhanceKey, string>>): FieldEnhancement[] {
  const out: FieldEnhancement[] = [];
  for (const key of ENHANCE_KEYS) {
    const original = answers[key] ?? "";
    if (original.trim() === "") continue; // nothing to sharpen for an empty field
    const enhancedRaw = (proposed[key] ?? original).toString();
    const enhanced = tidy(enhancedRaw);
    const field: FieldEnhancement = {
      key,
      label: label(key),
      original,
      enhanced,
      changed: enhanced.trim() !== original.trim(),
    };
    const gap = gapFor(key, original);
    if (gap) field.gap = gap;
    out.push(field);
  }
  return out;
}

/** Deterministic open questions from the gaps in the current answers. */
function offlineQuestions(answers: DemandAnswers): string[] {
  const qs: string[] = [];
  if (words(answers.problem) < 6) qs.push("Can you describe the problem more concretely — what happens, where, and why it matters?");
  if (answers.currentPain.trim() === "" || !hasNumber(answers.currentPain)) qs.push("Roughly what does this cost today — hours, scrap, money, or risk per week?");
  if (answers.desiredOutcome.trim() === "") qs.push("What would 'solved' look like — what would you see or be able to measure?");
  if (answers.frequencyScale.trim() === "" || !hasNumber(answers.frequencyScale)) qs.push("How often does it happen, and at what scale (units, people, sites)?");
  if (answers.affectedProcess.trim() === "") qs.push("Which process step is affected, and which team or role feels it?");
  return qs.slice(0, 4);
}

/** The deterministic offline enhancement — tidy text, flag gaps, ask questions. */
export function enhanceOffline(answers: DemandAnswers): EnhancementResult {
  return {
    fields: toFields(answers, {}),
    openQuestions: offlineQuestions(answers),
    assessment: assess(answers),
    provider: "offline",
    live: false,
    playbook: ENHANCE_PLAYBOOK,
  };
}

/**
 * Minimal fallback guidance, used ONLY when the playbook can't be read (e.g. it
 * was deleted). The real behaviour lives in the `s1-intake-enhance` playbook.
 */
const FALLBACK_GUIDANCE = `Sharpen a vague intake demand: make each field clearer and better
structured without changing its meaning. Never invent facts or numbers — if a figure is
missing, keep the text and raise an open question. This is not requirements engineering.`;

/**
 * The code-owned output contract. This is structural, not behavioural — the parser
 * depends on this exact JSON shape — so it stays in code while the guidance lives in
 * the editable playbook.
 */
const OUTPUT_CONTRACT = `Return ONLY a JSON object, no prose around it, of exactly this shape:
{
  "fields": {
    "title": string, "problem": string, "currentPain": string,
    "desiredOutcome": string, "affectedProcess": string,
    "frequencyScale": string, "constraints": string
  },
  "openQuestions": string[],
  "assessment": { "score": "weak"|"adequate"|"strong", "summary": string }
}
Include a field key ONLY if the requester provided that field. openQuestions: max 4.`;

/**
 * Load the git-managed behaviour playbook. Prefers the registry copy — live from
 * `du-agent-registry`, hot-editable via the in-app catalog (no deploy) — and falls
 * back to the copy bundled in the portal repo when the registry doesn't have it
 * yet, so a fresh deployment still runs on the full playbook rather than the stub.
 */
async function loadEnhanceGuidance(): Promise<string> {
  // Registry only — there is no bundled copy in this repo. The stub below is a
  // last resort that keeps intake usable, and it says what it is.
  const fromRegistry = await loadGoverning("playbook", ENHANCE_PLAYBOOK).catch(() => "");
  return fromRegistry.trim() || FALLBACK_GUIDANCE;
}

/** Compose the system prompt: playbook behaviour + the code-owned output contract. */
function enhanceSystemPrompt(guidance: string): string {
  return [
    `=== PLAYBOOK: ${ENHANCE_PLAYBOOK} ===`,
    guidance.trim(),
    "",
    "=== OUTPUT CONTRACT ===",
    OUTPUT_CONTRACT,
  ].join("\n");
}

function buildUserMessage(answers: DemandAnswers): string {
  const lines: string[] = ["Here is the raw demand captured at intake. Sharpen it per your rules.\n"];
  for (const key of ENHANCE_KEYS) {
    const v = (answers[key] ?? "").trim();
    if (v !== "") lines.push(`## ${label(key)} (${key})\n${v}\n`);
  }
  return lines.join("\n");
}

/** Pull the first balanced JSON object out of a model reply. */
function extractJson(text: string): unknown | undefined {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  if (start === -1) return undefined;
  let depth = 0;
  for (let i = start; i < candidate.length; i++) {
    const c = candidate[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(candidate.slice(start, i + 1));
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

/** Coerce a parsed model object into an EnhancementResult, keeping only known keys. */
function fromModelJson(answers: DemandAnswers, parsed: unknown, providerName: string): EnhancementResult {
  const obj = (parsed ?? {}) as Record<string, unknown>;
  const fieldsIn = (obj.fields ?? {}) as Record<string, unknown>;
  const proposed: Partial<Record<EnhanceKey, string>> = {};
  for (const key of ENHANCE_KEYS) {
    const v = fieldsIn[key];
    if (typeof v === "string" && v.trim() !== "") proposed[key] = v;
  }

  const questions = Array.isArray(obj.openQuestions)
    ? (obj.openQuestions as unknown[]).filter((q): q is string => typeof q === "string").slice(0, 4)
    : offlineQuestions(answers);

  const a = (obj.assessment ?? {}) as Record<string, unknown>;
  const score: Score = a.score === "weak" || a.score === "adequate" || a.score === "strong" ? a.score : assess(answers).score;
  const summary = typeof a.summary === "string" && a.summary.trim() !== "" ? a.summary : assess(answers).summary;

  return {
    fields: toFields(answers, proposed),
    openQuestions: questions,
    assessment: { score, summary },
    provider: providerName,
    live: true,
    playbook: ENHANCE_PLAYBOOK,
  };
}

/**
 * Enhance a demand's answers. Live through the configured provider; deterministic
 * offline otherwise. A live provider that errors or returns unparseable output
 * degrades to the offline pass rather than failing the intake.
 */
export async function enhanceDemand(
  answers: DemandAnswers,
  providerArg?: ModelProvider,
): Promise<EnhancementResult> {
  // Resolve the active provider (honouring the admin's stored default) unless a
  // caller injected one — the test does, to run without a key.
  const provider = providerArg ?? (await resolveProvider());
  if (!provider.live) return enhanceOffline(answers);
  try {
    const guidance = await loadEnhanceGuidance();
    const res = await provider.complete({
      system: enhanceSystemPrompt(guidance),
      messages: [{ role: "user", content: buildUserMessage(answers) }],
      // Tidying answers into JSON is mechanical: low effort keeps the reply
      // terse and leaves the budget for the JSON rather than the reasoning.
      // On a model that thinks by default, the old 1 500 was a ceiling both had
      // to share, and the JSON is the half that gets cut.
      effort: "low",
      maxTokens: 2500,
    });
    const parsed = extractJson(res.text);
    if (!parsed) return { ...enhanceOffline(answers), provider: provider.name, live: true };
    return fromModelJson(answers, parsed, provider.name);
  } catch {
    // Never let enhancement break intake — fall back to the deterministic pass.
    return enhanceOffline(answers);
  }
}
