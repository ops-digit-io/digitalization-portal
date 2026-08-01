/**
 * Provider health probe — does the configured model key actually work?
 *
 * `describeProvider` only reports whether a key is PRESENT. A present key can
 * still be wrong (typo, revoked, wrong base URL). This makes one minimal request
 * to the live provider and reports whether it authenticated and responded, so the
 * header and Settings can show real API status, not just "a key exists".
 *
 * It returns only a boolean and a short, sanitised error — never a key.
 */

import { type ModelProvider } from "./provider.js";
import { resolveProvider } from "../model-settings.js";

export interface ProviderHealth {
  provider: string;
  live: boolean;
  /** True when the provider authenticated and responded. */
  ok: boolean;
  /** Short, key-free reason when not ok. */
  error?: string;
}

/** Strip anything token-shaped and cap the length — defence in depth. */
function sanitize(msg: string): string {
  return msg
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-***")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***")
    .slice(0, 140);
}

export async function probeProvider(providerArg?: ModelProvider): Promise<ProviderHealth> {
  // Resolve the active provider (honouring the admin's stored default) unless a
  // caller injected one — the test does.
  const provider = providerArg ?? (await resolveProvider());
  if (!provider.live) return { provider: provider.name, live: false, ok: false };
  try {
    await provider.complete({
      system: "Health check. Reply with the single word OK.",
      messages: [{ role: "user", content: "ping" }],
      // Small, but not one token: on models where thinking is on by default a
      // one-token ceiling is a request the API can legitimately reject, and a
      // rejected probe would report a perfectly good key as broken. This asks
      // the cheapest question that still only tests authentication.
      maxTokens: 16,
      effort: "low",
      stream: false,
    });
    return { provider: provider.name, live: true, ok: true };
  } catch (e) {
    return { provider: provider.name, live: true, ok: false, error: sanitize(e instanceof Error ? e.message : String(e)) };
  }
}
