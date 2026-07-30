/**
 * Shared guard + helpers for the process-funnel API routes. Authority is always
 * the invoking session's (portal constraint #3): a request is allowed when the
 * session can `view_board` — every portal member, and the demo session in dev.
 */

import { NextResponse } from "next/server";
import { getSession } from "../auth/current";
import { can } from "../rbac";

export const now = (): string => new Date().toISOString();

/** Returns null when allowed, or a 401 response to return from the handler. */
export async function deny(): Promise<NextResponse | null> {
  const session = await getSession();
  if (can(session, "view_board")) return null;
  return NextResponse.json({ error: "not authenticated" }, { status: 401 });
}
