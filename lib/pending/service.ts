/**
 * Interim-buffer service: the write path intake calls, the flush the cron runs,
 * and the read-merge that makes a just-captured demand visible immediately.
 *
 * The flush is deliberately SMART so the buffer behaves well at 14k scale:
 *   - dedup on enqueue (identical double-submit returns the same id);
 *   - oldest-first, bounded-concurrency commit (fair + rate-limit friendly);
 *   - exponential backoff per entry (a failing git isn't hammered every minute);
 *   - dead-letter after max attempts (a poison entry stops churning, is surfaced);
 *   - idempotent (a create-only FileExistsError means it's already committed).
 */

import { saveDemand, demandRowFromMarkdown, type DemandSaveResult } from "../demands-store.js";
import { FileExistsError } from "../git/index.js";
import { mapPool } from "../pool.js";
import type { RegistryRow } from "../registry.js";
import { getPendingStore, type PendingDemand } from "./store.js";

/** Give up committing an entry after this many failed attempts (then dead-letter it). */
export const MAX_FLUSH_ATTEMPTS = 8;
const BASE_BACKOFF_SEC = 60;
const MAX_BACKOFF_SEC = 3600;
const FLUSH_CONCURRENCY = 6;

/** Backoff (seconds) before the next attempt: 60, 120, 240, … capped at 1h. */
export function backoffSec(attempts: number): number {
  return Math.min(BASE_BACKOFF_SEC * 2 ** Math.max(0, attempts - 1), MAX_BACKOFF_SEC);
}

/** Whether an entry is eligible to flush now (not dead-lettered, past its backoff). */
export function isDue(d: PendingDemand, nowIso: string): boolean {
  if (d.status === "failed") return false;
  if (!d.nextAttemptAt) return true;
  return d.nextAttemptAt <= nowIso; // ISO strings sort chronologically
}

/** Persist a captured demand to the interim buffer. Returns the allocated id. */
export async function enqueueDemand(
  year: number,
  buildMarkdown: (id: string) => string,
  opts?: { baseDir?: string; dedupKey?: string },
): Promise<{ id: string; markdown: string; kind: "kv" | "local"; deduped: boolean }> {
  const store = getPendingStore(process.env, opts?.baseDir);
  const createdAt = new Date().toISOString();
  const before = opts?.dedupKey ? (await store.list()).some((d) => d.dedupKey === opts.dedupKey && d.status !== "failed") : false;
  const demand = await store.enqueue(year, (id) => ({ markdown: buildMarkdown(id), createdAt }), opts?.dedupKey ? { dedupKey: opts.dedupKey } : undefined);
  return { id: demand.id, markdown: demand.markdown, kind: store.kind, deduped: before };
}

export interface FlushResult {
  committed: number;
  /** Failed this run but will be retried after backoff. */
  retried: number;
  /** Newly dead-lettered this run (hit max attempts). */
  deadLettered: number;
  /** Entries still waiting (not dead-lettered). */
  remaining: number;
  /** Dead-lettered entries needing attention. */
  failed: number;
}

/**
 * Commit due buffered demands to git, oldest-first with bounded concurrency. Each
 * failure backs the entry off (or dead-letters it after `MAX_FLUSH_ATTEMPTS`).
 * `commit`/`now` are injectable for tests.
 */
export async function flushPending(opts?: {
  baseDir?: string;
  now?: Date;
  concurrency?: number;
  commit?: (d: PendingDemand) => Promise<unknown>;
}): Promise<FlushResult> {
  const store = getPendingStore(process.env, opts?.baseDir);
  const now = opts?.now ?? new Date();
  const nowIso = now.toISOString();
  const commit =
    opts?.commit ??
    ((d: PendingDemand) => saveDemand(d.id, d.markdown, { baseDir: opts?.baseDir, createOnly: true, message: `Capture demand ${d.id}` }));

  const all = await store.list();
  const due = all
    .filter((d) => isDue(d, nowIso))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

  let committed = 0;
  let retried = 0;
  let deadLettered = 0;

  await mapPool(due, opts?.concurrency ?? FLUSH_CONCURRENCY, async (d) => {
    try {
      await commit(d);
      await store.remove(d.id);
      committed++;
    } catch (err) {
      if (err instanceof FileExistsError) {
        await store.remove(d.id); // already the system of record — idempotent
        committed++;
        return;
      }
      const attempts = d.attempts + 1;
      const lastError = err instanceof Error ? err.message : "error";
      if (attempts >= MAX_FLUSH_ATTEMPTS) {
        await store.update({ ...d, attempts, status: "failed", lastError });
        deadLettered++;
      } else {
        const nextAttemptAt = new Date(now.getTime() + backoffSec(attempts) * 1000).toISOString();
        await store.update({ ...d, attempts, nextAttemptAt, lastError });
        retried++;
      }
    }
  });

  const after = await store.list();
  return {
    committed,
    retried,
    deadLettered,
    remaining: after.filter((d) => d.status !== "failed").length,
    failed: after.filter((d) => d.status === "failed").length,
  };
}

export interface PendingStats {
  total: number;
  /** Eligible to flush now. */
  due: number;
  /** Dead-lettered, needing attention. */
  failed: number;
  /** Age of the oldest still-waiting entry, in seconds. */
  oldestAgeSec: number;
}

/** Observability for the buffer — surfaced by the cron and status endpoints. */
export async function pendingStats(opts?: { baseDir?: string; now?: Date }): Promise<PendingStats> {
  const store = getPendingStore(process.env, opts?.baseDir);
  const now = opts?.now ?? new Date();
  const nowIso = now.toISOString();
  const all = await store.list();
  const active = all.filter((d) => d.status !== "failed");
  const oldest = active.reduce((min, d) => (d.createdAt < min ? d.createdAt : min), nowIso);
  return {
    total: all.length,
    due: active.filter((d) => isDue(d, nowIso)).length,
    failed: all.filter((d) => d.status === "failed").length,
    oldestAgeSec: Math.max(0, Math.floor((now.getTime() - Date.parse(oldest)) / 1000)),
  };
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
