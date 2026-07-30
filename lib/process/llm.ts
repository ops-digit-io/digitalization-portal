/**
 * Live coaching over the portal's model provider seam (`lib/agent/provider.ts`),
 * replacing PDT's standalone `llm.js`. The methodology is unchanged: coaching runs
 * live when a model key is configured, and degrades to prompt EXPORT when it is not
 * — no secret has to sit on the server for the tool to be useful.
 *
 * `available()` reflects the portal's own provider selection (Anthropic → OpenAI →
 * offline). When no live key is present, the run-endpoints return 503 and the UI
 * offers the assembled prompt as a copy-out, exactly as in PDT.
 */

import { getProvider, describeProvider, type ModelMessage } from "../agent/provider";

export function provider(): string {
  return describeProvider().provider;
}

export function model(): string | null {
  return describeProvider().model ?? null;
}

/** True when a live model key is configured. Offline (no key) is export-only. */
export function available(): boolean {
  return describeProvider().live;
}

export interface ChatResult {
  text: string;
  usage: { input: number; output: number } | null;
  model: string | null;
  provider: string;
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
  opts: { maxTokens?: number } = {},
): Promise<ChatResult> {
  const status = describeProvider();
  if (!status.live) throw new NoKeyError();
  const p = getProvider();
  const res = await p.complete({
    system,
    messages: messages as ModelMessage[],
    maxTokens: opts.maxTokens ?? 4096,
  });
  return {
    text: res.text,
    usage: res.usage ?? null,
    model: status.model ?? null,
    provider: status.provider,
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
