/**
 * Interim-buffer service: the write path intake calls, the flush the cron runs,
 * and the read-merge that makes a just-captured demand visible immediately.
 *
 * Flow: intake → `enqueueDemand` (persist to the buffer, return now) → later
 * `flushPending` commits each entry to git create-only and removes it. Git stays
 * the system of record; the buffer is only the durable hand-off in between.
 */

import { saveDemand, demandRowFromMarkdown, type DemandSaveResult } from "../demands-store.js";
import { FileExistsError } from "../git/index.js";
import type { RegistryRow } from "../registry.js";
import { getPendingStore, type PendingDemand } from "./store.js";

/** Persist a captured demand to the interim buffer. Returns the allocated id. */
export async function enqueueDemand(
  year: number,
  buildMarkdown: (id: string) => string,
  opts?: { baseDir?: string },
): Promise<{ id: string; markdown: string; kind: "kv" | "local" }> {
  const store = getPendingStore(process.env, opts?.baseDir);
  const createdAt = new Date().toISOString();
  const demand = await store.enqueue(year, (id) => ({ markdown: buildMarkdown(id), createdAt }));
  return { id: demand.id, markdown: demand.markdown, kind: store.kind };
}

export interface FlushResult {
  committed: number;
  failed: number;
  remaining: number;
}

/**
 * Commit buffered demands to git. Create-only, so a double-flush (a crash between
 * the git write and the buffer removal) is idempotent: a `FileExistsError` means it
 * is already the system of record, so we just drop it from the buffer. Other errors
 * leave the entry for the next run with `attempts` bumped.
 */
export async function flushPending(opts?: { baseDir?: string }): Promise<FlushResult> {
  const store = getPendingStore(process.env, opts?.baseDir);
  const pending = await store.list();
  let committed = 0;
  let failed = 0;
  for (const d of pending) {
    try {
      await saveDemand(d.id, d.markdown, { baseDir: opts?.baseDir, createOnly: true, message: `Capture demand ${d.id}` });
      await store.remove(d.id);
      committed++;
    } catch (err) {
      if (err instanceof FileExistsError) {
        await store.remove(d.id); // already committed — idempotent
        committed++;
        continue;
      }
      failed++;
      await store.update({ ...d, attempts: d.attempts + 1, lastError: err instanceof Error ? err.message : "error" });
    }
  }
  const remaining = (await store.list()).length;
  return { committed, failed, remaining };
}

/** Buffered demands as board rows, flagged `pending`, for read-merge. */
export async function pendingRows(opts?: { baseDir?: string }): Promise<RegistryRow[]> {
  const store = getPendingStore(process.env, opts?.baseDir);
  const list = await store.list();
  return list.map((d: PendingDemand) => ({ ...demandRowFromMarkdown(d.id, d.markdown), pending: true }));
}

/** A pending save's result shape, matching what committed saves return to the UI. */
export function pendingSaveResult(id: string, kind: "kv" | "local", repo: string, path: string): DemandSaveResult & { pending: true } {
  return { host: kind === "kv" ? "github" : "local", target: "interim buffer", repo, path, pending: true } as DemandSaveResult & { pending: true };
}
