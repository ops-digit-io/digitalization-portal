/**
 * Reconcile — rebuild the read-model projection from the git system of record.
 *
 * Called by the `du-demands` push webhook (and can be invoked manually). It reads
 * the funnel once from git (the authoritative source) and writes the denormalised
 * rows to the projection store, so 14k readers query the store instead of GitHub.
 * A no-op (returns 0) when KV isn't configured — the query layer reads git directly
 * in that mode, so there is nothing to project.
 */

import { listDemandRowsWithValue } from "../demands-store.js";
import { getProjectionStore } from "./store.js";

export interface ReconcileResult {
  projected: boolean;
  rows: number;
}

/** Rebuild the projection from git. Returns how many rows were written. */
export async function reconcileFunnel(): Promise<ReconcileResult> {
  const store = getProjectionStore();
  if (!store) return { projected: false, rows: 0 };
  const rows = await listDemandRowsWithValue();
  await store.writeRows(rows);
  return { projected: true, rows: rows.length };
}
