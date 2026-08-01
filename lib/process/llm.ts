/**
 * The model-call seam for the Process Funnel agents (coaching, artefact
 * generation, analysis), over the portal's provider (`lib/agent/provider.ts`).
 *
 * `available()` reflects the portal's own provider selection (Anthropic → OpenAI →
 * offline). When no live key is present the agent run-endpoints return 503 and the
 * UI degrades to manual rating/authoring — there is no prompt to paste. The
 * analysis agent additionally has a deterministic offline proposer.
 */

import { type ModelMessage } from "../agent/provider";
import { resolveProvider, resolveStatus } from "../model-settings";
import { recordUsage } from "../usage-meter";

export async function provider(): Promise<string> {
  return (await resolveStatus()).provider;
}

export async function model(): Promise<string | null> {
  return (await resolveStatus()).model ?? null;
}

/** True when a live model provider is active. Offline (no key) is export-only.
 *  Async because the active provider now honours the admin's stored choice. */
export async function available(): Promise<boolean> {
  return (await resolveStatus()).live;
}

export interface ChatResult {
  text: string;
  usage: { input: number; output: number } | null;
  model: string | null;
  provider: string;
  /**
   * The model hit the output ceiling — what came back is the beginning of an
   * artefact, not one. Saved anyway (throwing away 6 000 tokens of usable draft
   * helps nobody) but never presented as finished.
   */
  truncated: boolean;
}

export class NoKeyError extends Error {
  code = "NO_KEY";
  constructor() {
    super("no model key configured — live coaching is off");
  }
}

/**
 * One coaching/advisory/digest turn. `system` is the assembled prompt; `messages`
 * is the conversation so far (PDT-shaped `{role, content}` — compatible with the
 * provider's `ModelMessage`).
 */
export async function chat(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  opts: { maxTokens?: number; feature?: string } = {},
): Promise<ChatResult> {
  const status = await resolveStatus();
  if (!status.live) throw new NoKeyError();
  const p = await resolveProvider();
  const res = await p.complete({
    system,
    messages: messages as ModelMessage[],
    maxTokens: opts.maxTokens ?? 4096,
  });
  // Meter the call for the cost overview. Fire-safe: recordUsage swallows its own
  // errors, so a metering hiccup never touches the coaching result.
  await recordUsage({ feature: opts.feature ?? "process.chat", provider: status.provider, model: status.model, usage: res.usage });
  return {
    text: res.text,
    usage: res.usage ?? null,
    model: status.model ?? null,
    provider: status.provider,
    truncated: res.truncated,
  };
}

/** Pulls the artefact out of a coach turn, if the coach produced one. */
export function extractArtefact(text: string): string | null {
  const fences = [...String(text).matchAll(/```(?:markdown|md)?\n([\s\S]*?)```/g)];
  if (!fences.length) return null;
  // The artefact is the longest fenced block — coaches sometimes quote a short
  // example earlier in the same turn.
  return fences
    .map((f) => f[1]!)
    .sort((a, b) => b.length - a.length)[0]!
    .trim();
}
