/**
 * The funnel read model — the one API every funnel/board/value view uses.
 *
 * It reads rows from the projection store when configured (the scalable path) and
 * falls back to a direct git read otherwise, then applies scope, filter, search,
 * and pagination. Views NEVER read the funnel store directly — they go through
 * here, so the projection can absorb 14k readers without changing a single page.
 *
 * The filter/scope/paginate functions are pure (row-array in, row-array out) so
 * they are unit-tested without any store.
 */

import type { RegistryRow } from "../registry.js";
import { getProjectionStore } from "../projection/store.js";
import { listDemandRowsWithValue } from "../demands-store.js";
import { pendingRows } from "../pending/service.js";

/** Who is asking / what slice they want. Keeps every page small at any funnel size. */
export type FunnelScope = "all" | "mine" | "triage";

export interface FunnelQuery {
  scope?: FunnelScope;
  /** Required for scope "mine": the requester to match (self-filter, not analytics). */
  requester?: string;
  lane?: string;
  plant?: string;
  domain?: string;
  stage?: string;
  status?: string;
  /** Free-text over id + title. */
  search?: string;
  /** 1-based page. */
  page?: number;
  pageSize?: number;
}

export interface FunnelPage {
  rows: RegistryRow[];
  /** Matches after filtering, before pagination. */
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  /** True when rows came from the projection, false when read directly from git. */
  projected: boolean;
}

export const DEFAULT_PAGE_SIZE = 25;

async function loadBase(): Promise<{ rows: RegistryRow[]; projected: boolean }> {
  const store = getProjectionStore();
  if (store) {
    const rows = await store.readRows();
    if (rows) return { rows, projected: true };
    // Projection configured but not built yet — read git so views aren't empty.
  }
  return { rows: await listDemandRowsWithValue(), projected: false };
}

/**
 * The rows every view reads: committed rows (projection or direct git) MERGED with
 * the interim buffer, so a demand a user just captured shows immediately — before
 * the flush commits it to git (read-your-writes). Committed wins on id collision.
 */
export async function getFunnelRows(): Promise<{ rows: RegistryRow[]; projected: boolean }> {
  const [base, pending] = await Promise.all([loadBase(), pendingRows()]);
  if (pending.length === 0) return base;
  const seen = new Set(base.rows.map((r) => r.id));
  return { rows: [...base.rows, ...pending.filter((p) => !seen.has(p.id))], projected: base.projected };
}

/** Apply scope: the personal / role slices that keep pages small. Pure. */
export function applyScope(rows: readonly RegistryRow[], scope: FunnelScope, requester?: string): RegistryRow[] {
  if (scope === "triage") return rows.filter((r) => r.stage === "S1" || r.stage === "S2");
  if (scope === "mine") {
    const me = (requester ?? "").trim().toLowerCase();
    if (me === "") return [];
    return rows.filter((r) => (r.requester ?? "").trim().toLowerCase() === me);
  }
  return [...rows];
}

/** Apply field filters + free-text search. Pure. */
export function applyFilter(rows: readonly RegistryRow[], q: FunnelQuery): RegistryRow[] {
  const search = (q.search ?? "").trim().toLowerCase();
  return rows.filter((r) => {
    if (q.lane && r.lane !== q.lane) return false;
    if (q.plant && r.plant !== q.plant) return false;
    if (q.domain && r.domain !== q.domain) return false;
    if (q.stage && r.stage !== q.stage) return false;
    if (q.status && r.status !== q.status) return false;
    if (search && !(`${r.id} ${r.title}`.toLowerCase().includes(search))) return false;
    return true;
  });
}

/** Slice one page out of the filtered rows. Pure. */
export function paginate(rows: readonly RegistryRow[], page: number, pageSize: number): { rows: RegistryRow[]; page: number; pageCount: number } {
  const size = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(1, page), pageCount);
  return { rows: rows.slice((p - 1) * size, p * size), page: p, pageCount };
}

/**
 * Decide which scope a `/demands` visitor should actually see. Pure, so the page's
 * "don't show a fresh operator an empty list" behavior is unit-testable.
 *
 * Rule: an EXPLICIT `?scope=` is always honored (a clicked "My demands" stays
 * honestly empty). Only when the visitor made no choice AND their personal slice is
 * empty while the funnel is not do we auto-broaden to "all" — so the portal never
 * greets a leader with a blank page over a full funnel.
 */
export function chooseEffectiveScope(opts: {
  explicit?: string;
  mineTotal: number;
  allTotal: number;
}): { scope: FunnelScope; autoBroadened: boolean } {
  if (opts.explicit === "all") return { scope: "all", autoBroadened: false };
  if (opts.explicit === "mine") return { scope: "mine", autoBroadened: false };
  if (opts.mineTotal === 0 && opts.allTotal > 0) return { scope: "all", autoBroadened: true };
  return { scope: "mine", autoBroadened: false };
}

/**
 * The read-model entry point: scope → filter/search → paginate. One call per view.
 */
export async function queryFunnel(q: FunnelQuery = {}): Promise<FunnelPage> {
  const { rows: all, projected } = await getFunnelRows();
  const scoped = applyScope(all, q.scope ?? "all", q.requester);
  const filtered = applyFilter(scoped, q);
  const pageSize = q.pageSize ?? DEFAULT_PAGE_SIZE;
  const { rows, page, pageCount } = paginate(filtered, q.page ?? 1, pageSize);
  return { rows, total: filtered.length, page, pageSize, pageCount, projected };
}

export interface FunnelAggregates {
  total: number;
  active: number;
  byStage: Record<string, number>;
  byLane: Record<string, number>;
}

/** Portfolio-wide counts, computed once from the projection (not by scanning git per view). */
export async function funnelAggregates(): Promise<FunnelAggregates> {
  const { rows } = await getFunnelRows();
  const byStage: Record<string, number> = {};
  const byLane: Record<string, number> = {};
  let active = 0;
  for (const r of rows) {
    if (r.stage) byStage[r.stage] = (byStage[r.stage] ?? 0) + 1;
    if (r.lane) byLane[r.lane] = (byLane[r.lane] ?? 0) + 1;
    if (r.status !== "killed" && r.status !== "parked") active++;
  }
  return { total: rows.length, active, byStage, byLane };
}
