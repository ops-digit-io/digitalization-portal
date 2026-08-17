import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { throttle } from "@/lib/api/throttle";
import type { RateLimitOptions } from "@/lib/ratelimit";
import { runScout } from "@/lib/agent/scout-runner";
import { readRegistry } from "@/lib/otx/source";
import { parseLandscape } from "@/lib/otx/landscape";
import { parseTechnology } from "@/lib/otx/rollout";
import { rank, dedupe } from "@/lib/scout/fit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Run a technology sweep.
 *
 * POST rather than GET: a sweep costs a paid model call with web search, so it
 * happens when somebody asks rather than on every page load — the same bargain
 * `/api/champions/analyse` strikes.
 *
 * The route composes the two halves and keeps them apart:
 *   - `runScout` produces candidates and an ADVISORY relevance score, having read
 *     public pages the portal never sees.
 *   - `rank` computes fit from the portal's OWN registry and sorts on it.
 *
 * Nothing here adopts anything. A candidate the user accepts becomes an `assess`
 * row in a pull request against `registry/technology.md` that a human merges —
 * `adopt` is a human decision (constraints #1 and #2), and the rollout invariant
 * refuses to scale anything that has not reached it.
 */

/** A sweep is far dearer than an ordinary model call — searching, reading, then writing. */
const SWEEP_BUDGET: RateLimitOptions = { limit: 4, windowSec: 300 };

export async function POST(req: Request) {
  const session = await getSession();
  if (!can(session, "view_board")) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const throttled = await throttle("scout-sweep", SWEEP_BUDGET);
  if (throttled) return throttled;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const focus = typeof body.focus === "string" ? body.focus.slice(0, 400) : "";

  const [landscapeMd, techMd] = await Promise.all([readRegistry("landscape"), readRegistry("technology")]);
  const systems = parseLandscape(landscapeMd);
  const known = parseTechnology(techMd);

  const sweep = await runScout(
    focus,
    known.map((t) => t.technology).filter((t) => t !== ""),
  );

  // Drop anything the register already holds before scoring — the sweep is asked
  // not to return them, but "asked not to" is not a guarantee.
  const fresh = dedupe(
    sweep.candidates.map((c) => c.candidate),
    known,
  );
  const freshIds = new Set(fresh.map((c) => c.id));
  const kept = sweep.candidates.filter((c) => freshIds.has(c.candidate.id));

  const ranked = rank(
    kept.map((c) => ({ candidate: c.candidate, relevance: c.relevance })),
    systems,
    known,
  );

  // Re-attach the prose. It is display-only: nothing downstream scores on it.
  const byId = new Map(kept.map((c) => [c.candidate.id, c]));
  const results = ranked.map((r) => {
    const meta = byId.get(r.candidate.id);
    return {
      ...r,
      summary: meta?.summary ?? "",
      maturityNote: meta?.maturityNote ?? "",
      sourceUrl: meta?.sourceUrl ?? "",
      sourceNote: meta?.sourceNote ?? "",
    };
  });

  return NextResponse.json({
    results,
    live: sweep.live,
    ...(sweep.note ? { note: sweep.note } : {}),
    dropped: sweep.candidates.length - kept.length,
    scoredAgainst: { systems: systems.length, blocked: systems.filter((s) => s.iface === "none").length, known: known.length },
  });
}
