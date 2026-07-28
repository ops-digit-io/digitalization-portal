/**
 * Reassign a plant on demands — the guided way to RETIRE a plant that is still in use.
 *
 * A plant can't be removed from the category list while a demand still carries it
 * (the removal guard in `category-store.ts` blocks it, because a plant doubles as a
 * demand's classification and an RBAC scope). This module moves every demand from one
 * plant to another so the old plant becomes unused and can then be retired — the
 * "reassign, don't strand" flow.
 *
 * The rewrite is section-surgical (`setStateField` on the `## State` `Plant` field +
 * a `## History` line), so Stage/Gates/Lane/People survive — the same discipline as
 * the in-portal demand editor. `retagPlant` is a PURE markdown rewrite; `reassignPlant`
 * is the bulk IO over the funnel.
 */

import { setStateField, appendHistory } from "./demand-advance.js";
import { parseUseCase } from "./parse.js";
import { listDemandIds, readDemand, saveDemand } from "./demands-store.js";
import { mapPool } from "./pool.js";

const FETCH_CONCURRENCY = 8;

export type RetagResult = { changed: false } | { changed: true; markdown: string; from: string };

/**
 * Retag a demand's plant to `to`, but ONLY if its current plant matches `from`
 * (case-insensitively). Records a history line. Returns `{changed:false}` for a demand
 * on a different plant, so a caller can skip the write. Pure.
 */
export function retagPlant(markdown: string, from: string, to: string, opts: { actor: string; date: string }): RetagResult {
  const current = (parseUseCase(markdown).state.plant ?? "").trim();
  if (current === "" || current.toLowerCase() !== from.trim().toLowerCase()) return { changed: false };
  let md = setStateField(markdown, "Plant", to.trim());
  md = appendHistory(md, `${opts.date} — plant reassigned ${current} → ${to.trim()} by ${opts.actor}`);
  return { changed: true, markdown: md, from: current };
}

export interface ReassignResult {
  reassigned: number;
  ids: string[];
}

/**
 * Move every demand on plant `from` to plant `to`. Bounded-concurrency (no serial
 * N+1); each moved demand is saved with a descriptive message. Returns how many moved.
 */
export async function reassignPlant(from: string, to: string, opts: { actor: string; date: string }, baseDir?: string): Promise<ReassignResult> {
  const ids = await listDemandIds(baseDir);
  const moved = await mapPool(ids, FETCH_CONCURRENCY, async (id): Promise<string | null> => {
    const md = await readDemand(id, baseDir);
    if (md === undefined) return null;
    const r = retagPlant(md, from, to, opts);
    if (!r.changed) return null;
    await saveDemand(id, r.markdown, { ...(baseDir ? { baseDir } : {}), message: `Reassign plant ${from} → ${to} on ${id}` });
    return id;
  });
  const ids2 = moved.filter((x): x is string => x !== null);
  return { reassigned: ids2.length, ids: ids2 };
}
