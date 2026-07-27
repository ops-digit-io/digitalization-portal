/**
 * Fixed-window rate limiter — bounds how often one user can submit, so 14k people
 * can't flood the funnel by accident or abuse.
 *
 * KV-backed when configured (correct across serverless instances via an atomic
 * INCR + EXPIRE); otherwise an in-process map, a reasonable per-instance baseline
 * for local/dev. Pure enough to test: `now` is injectable.
 */

import { kvConfigured, kvCommand } from "./kv.js";

export interface RateLimitOptions {
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the current window resets. */
  resetSec: number;
}

const memory = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(key: string, opts: RateLimitOptions, now: number = Date.now()): Promise<RateLimitResult> {
  const { limit, windowSec } = opts;

  if (kvConfigured()) {
    const bucket = Math.floor(now / 1000 / windowSec);
    const k = `rl:${key}:${bucket}`;
    const count = await kvCommand<number>(["INCR", k]);
    if (count === 1) await kvCommand(["EXPIRE", k, windowSec]);
    const resetSec = windowSec - Math.floor((now / 1000) % windowSec);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetSec };
  }

  // In-memory fallback (per instance).
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { allowed: true, remaining: limit - 1, resetSec: windowSec };
  }
  entry.count++;
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count), resetSec: Math.ceil((entry.resetAt - now) / 1000) };
}

/** Clear the in-memory buckets (tests). */
export function _resetRateLimitMemory(): void {
  memory.clear();
}
