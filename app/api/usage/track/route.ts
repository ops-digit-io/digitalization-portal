/**
 * `/api/usage/track` — the UI half of the telemetry tool. The browser posts small
 * batches of interaction events (views / clicks) and they roll up into the same
 * usage store the AI meter uses, so the overview can show how the whole portal is
 * used, not just what the model costs.
 *
 * Open (any visitor's activity is worth counting) but deliberately cheap and
 * content-free: it accepts only a tool id and an event type, caps the batch, and
 * drops anything it doesn't recognise. It records no user, no path detail, no
 * input — aggregate counts only, the same principle the people-facing tools hold.
 */

import { NextResponse } from "next/server";
import { recordUiEvents, type UiEvent } from "@/lib/usage-meter";
import { isUiEventType } from "@/lib/portal-tools";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A batch larger than this is a bug or abuse, not a session — clamp it. */
const MAX_EVENTS = 100;

export async function POST(req: Request) {
  // A member's activity is worth counting; an anonymous caller's is just pollutable
  // noise — require a session so aggregate counts can't be inflated from outside.
  if (!can(await getSession(), "view_board")) return NextResponse.json({ ok: false }, { status: 401 });
  let body: { events?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const raw = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
  const events: UiEvent[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const tool = String((e as { tool?: unknown }).tool ?? "").trim().toLowerCase().slice(0, 40);
    const type = String((e as { type?: unknown }).type ?? "");
    if (tool && isUiEventType(type)) events.push({ tool, type });
  }
  // Fire-safe: recordUiEvents swallows its own errors and no-ops without a store.
  await recordUiEvents(events);
  return NextResponse.json({ ok: true, recorded: events.length });
}
