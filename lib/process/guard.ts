/**
 * Shared guard + helpers for the process-funnel API routes. Authority is always
 * the invoking session's (portal constraint #3): a request is allowed when the
 * session can `view_board` — every portal member, and the demo session in dev.
 */

import { NextResponse } from "next/server";
import { getSession } from "../auth/current";
import { can, type Capability } from "../rbac";

export const now = (): string => new Date().toISOString();

/**
 * Tiered guards for the process-funnel routes. Reads are open to any board viewer,
 * but writes, gate verdicts and deletes must not be — the demand funnel enforces the
 * same separation of duties, and the process side must too. Each returns null when
 * allowed, else the response to return from the handler.
 */
async function guard(cap: Capability, status: number): Promise<NextResponse | null> {
  const session = await getSession();
  if (can(session, cap)) return null;
  return NextResponse.json({ error: cap === "view_board" ? "not authenticated" : `missing capability: ${cap}` }, { status });
}

/** Read gate — any board viewer (GET handlers). */
export const deny = (): Promise<NextResponse | null> => guard("view_board", 401);
/** Content-write gate — a contributor (`draft`): sections, ratings, meta, generation. */
export const denyWrite = (): Promise<NextResponse | null> => guard("draft", 403);
/** Gate-verdict gate — authority to pass/fail a Tor (`gate_pass`). */
export const denyGate = (): Promise<NextResponse | null> => guard("gate_pass", 403);
/** Destructive gate — deleting an engagement (`kill`). */
export const denyDelete = (): Promise<NextResponse | null> => guard("kill", 403);
