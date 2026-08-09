/**
 * Per-user throttle for the expensive endpoints — the model-invoking routes and the
 * whole-corpus reads. Each of these costs a paid provider call (or a large fan-out), so
 * one scripted user could otherwise drive unbounded spend and back-pressure. This keys
 * the fixed-window limiter by the caller's session and returns a ready-to-return 429,
 * so a route adds one line after its auth check.
 */

import { NextResponse } from "next/server";
import { getSession } from "../auth/current.js";
import { rateLimit, type RateLimitOptions } from "../ratelimit.js";

/** Returns null when under the limit, else a 429 response to return from the handler. */
export async function throttle(tag: string, opts: RateLimitOptions): Promise<NextResponse | null> {
  const { user } = await getSession();
  const rl = await rateLimit(`${tag}:${user}`, opts);
  if (rl.allowed) return null;
  return NextResponse.json(
    { error: `Too many requests — please wait ${rl.resetSec}s and try again.` },
    { status: 429 },
  );
}

/** A sensible default budget for a per-user AI call: 20 per minute. */
export const AI_BUDGET: RateLimitOptions = { limit: 20, windowSec: 60 };
