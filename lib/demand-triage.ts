/**
 * Triage mutations — confirm a demand's lane, or reject it with a reason
 * (`docs/05-lanes-and-triage.md`). Both are PURE markdown rewrites: given a case
 * README they return the next README, with no IO, so they are fully testable. The
 * caller (`/api/demands/[id]/triage`) persists the result to the `du-demands`
 * funnel, which the portal writes directly (it is the intake funnel, not a gated
 * use-case repo).
 *
 * Neither passes a gate or merges. Acceptance (G1) is a gate passage and lives in
 * `demand-advance.ts`; these two are the other triage acts: assigning the lane and
 * the reasoned rejection the taxonomy requires ("never a silent closure").
 */

import { parseUseCase } from "./parse.js";
import { setStateField, appendHistory } from "./demand-advance.js";
import { LANES, type Lane } from "./types.js";

export type TriageResult = { ok: true; markdown: string } | { ok: false; reason: string };

function readable(markdown: string): TriageResult | undefined {
  const uc = parseUseCase(markdown);
  if (uc.state.stage === undefined) {
    return { ok: false, reason: "This demand's stage couldn't be read — fix the ## State section before triaging." };
  }
  return undefined;
}

/** True for a lane the taxonomy allows (guards the API against arbitrary input). */
export function isLane(v: string): v is Lane {
  return (LANES as readonly string[]).includes(v);
}

/** Assign / confirm the demand's lane at triage. */
export function assignLane(markdown: string, lane: Lane, opts: { actor: string; date: string }): TriageResult {
  const bad = readable(markdown);
  if (bad) return bad;
  let md = setStateField(markdown, "Lane", lane);
  md = appendHistory(md, `${opts.date} — lane set to ${lane} at triage by ${opts.actor}`);
  return { ok: true, markdown: md };
}

/**
 * Reject a demand at triage: park it with a reason and reroute to backlog. A
 * rejection MUST carry a reason — a blank one is refused, so closure is never silent.
 */
export function rejectDemand(markdown: string, reason: string, opts: { actor: string; date: string }): TriageResult {
  const bad = readable(markdown);
  if (bad) return bad;
  const clean = reason.trim();
  if (clean === "") return { ok: false, reason: "A rejection needs a reason — never a silent closure." };
  let md = setStateField(markdown, "Status", "parked");
  md = appendHistory(md, `${opts.date} — rejected at triage by ${opts.actor}: ${clean} (parked · reroute to backlog)`);
  return { ok: true, markdown: md };
}
