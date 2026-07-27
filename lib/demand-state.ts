/**
 * Status transitions a demand can take from the portal beyond the gate flow:
 * kill (stop) and reactivate (un-park / un-kill). Pure markdown rewrites over the
 * `## State` Status field + a `## History` line — no gate is crossed. Park lives in
 * `lib/demand-triage.ts` (rejectDemand); this adds the two the portal was missing.
 */

import { parseUseCase } from "./parse.js";
import { setStateField, appendHistory } from "./demand-advance.js";

export type StateResult = { ok: true; markdown: string } | { ok: false; reason: string };

function guardReadable(markdown: string): StateResult | undefined {
  if (parseUseCase(markdown).state.stage === undefined) {
    return { ok: false, reason: "This demand's stage couldn't be read — fix the ## State section first." };
  }
  return undefined;
}

/** Kill a demand with a required reason (never a silent closure). */
export function killDemand(markdown: string, reason: string, opts: { actor: string; date: string }): StateResult {
  const bad = guardReadable(markdown);
  if (bad) return bad;
  const clean = reason.trim();
  if (clean === "") return { ok: false, reason: "A kill needs a reason — never a silent closure." };
  let md = setStateField(markdown, "Status", "killed");
  md = appendHistory(md, `${opts.date} — killed by ${opts.actor}: ${clean}`);
  return { ok: true, markdown: md };
}

/** Return a parked/killed demand to active. */
export function reactivateDemand(markdown: string, opts: { actor: string; date: string }): StateResult {
  const bad = guardReadable(markdown);
  if (bad) return bad;
  let md = setStateField(markdown, "Status", "active");
  md = appendHistory(md, `${opts.date} — reactivated by ${opts.actor}`);
  return { ok: true, markdown: md };
}
