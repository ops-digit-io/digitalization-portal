/**
 * Persisted agent run traces (N1 — `docs/ROADMAP-next.md`).
 *
 * `trace.ts` already records everything worth keeping — each step, the tools
 * offered, and the tools WITHHELD with their reason. Until now that record lived
 * exactly as long as one HTTP response, which is not what FR-6.5's "replayable"
 * means. This module gives it a home.
 *
 * Two things follow from what a trace is FOR. It is the evidence a lane's
 * promotion up the autonomy ladder would be argued from (`lib/org/autonomy.ts`),
 * so it must outlive the request and say who ran it: an audit record with no
 * actor is not an audit record. And it is an audit record and nothing else — no
 * view here ranks, counts or compares people, and nothing aggregates per user
 * (constraint #6). The usage meter answers "what did this cost"; this answers
 * "what did that run actually do".
 *
 * Persistence mirrors the two patterns the repo already proves: the usage
 * meter's KV day-buckets with a retention window, and the pending buffer's
 * kv-or-local backend so dev and tests exercise the same path. Recording is
 * FIRE-AND-SAFE — a trace write can never break the run it describes, which is
 * the same bargain `recordUsage` strikes.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { kvConfigured, kvCommand, kvPipeline } from "../kv.js";
import type { Trace } from "./trace.js";

/** Days a trace is kept. Shorter than the usage meter's 120: a trace carries the
 *  run's text, not four counters, and an audit record nobody has looked at in a
 *  month is costing storage rather than answering a question. */
export const RETENTION_DAYS = 30;
const RETENTION_SECONDS = RETENTION_DAYS * 24 * 60 * 60;

/** A step's detail is model or tool output and can be enormous. Stored traces are
 *  for reading, so each is cut to something a page can render — and the cut is
 *  MARKED, because silently truncated evidence is worse than none. */
export const MAX_DETAIL_CHARS = 2_000;
export const MAX_STEPS = 200;

/** A trace, as persisted: the run plus how it is addressed and what ran it. */
export interface TraceRecord {
  /** Unique per run — `trace.id` is a label (`trace-chat-UC-…`) and repeats. */
  recordId: string;
  /** The feature that ran it, named as the usage meter names features. */
  feature: string;
  /** ISO day the record belongs to, which is also its KV bucket. */
  date: string;
  trace: Trace;
}

export interface TraceStore {
  readonly kind: "kv" | "local";
  save(record: TraceRecord): Promise<void>;
  /** Newest first. */
  list(limit?: number): Promise<TraceRecord[]>;
  get(recordId: string): Promise<TraceRecord | null>;
}

const LOCAL_DIR = ".agent-traces";
const DEFAULT_LIMIT = 100;

function has(v: string | undefined): boolean {
  return typeof v === "string" && v.trim() !== "";
}

/** `2026-09-22-134501-a1b2c3` — sorts chronologically as a string, which is what
 *  makes "newest first" a reverse sort rather than a date parse. */
export function newRecordId(at: Date = new Date(), rand: () => string = () => Math.random().toString(36).slice(2, 8)): string {
  const iso = at.toISOString();
  return `${iso.slice(0, 10)}-${iso.slice(11, 19).replace(/:/g, "")}-${rand()}`;
}

/** Cut a trace down to what is worth storing and readable when read back. */
export function trimTrace(trace: Trace): Trace {
  const steps = trace.steps.slice(0, MAX_STEPS).map((s) => {
    if (s.detail === undefined || s.detail.length <= MAX_DETAIL_CHARS) return s;
    return { ...s, detail: `${s.detail.slice(0, MAX_DETAIL_CHARS)}\n…[cut: ${s.detail.length - MAX_DETAIL_CHARS} more characters]` };
  });
  if (trace.steps.length > MAX_STEPS) {
    steps.push({
      index: MAX_STEPS,
      kind: "note",
      label: `…[cut: ${trace.steps.length - MAX_STEPS} more steps]`,
    });
  }
  return { ...trace, steps };
}

/* ------------------------------------------------------------------- local */

/** One `<recordId>.json` per run, under `.agent-traces/`. Dev and tests. */
export class LocalTraceStore implements TraceStore {
  readonly kind = "local" as const;
  constructor(private readonly baseDir: string) {}

  private dir(): string {
    return join(this.baseDir, LOCAL_DIR);
  }

  async save(record: TraceRecord): Promise<void> {
    await mkdir(this.dir(), { recursive: true });
    await writeFile(join(this.dir(), `${record.recordId}.json`), JSON.stringify(record, null, 2), "utf8");
  }

  async list(limit = DEFAULT_LIMIT): Promise<TraceRecord[]> {
    const names = (await readdir(this.dir()).catch(() => [])).filter((n) => n.endsWith(".json"));
    const newest = names.sort().reverse().slice(0, limit);
    const out: TraceRecord[] = [];
    for (const n of newest) {
      const rec = await this.read(join(this.dir(), n));
      if (rec) out.push(rec);
    }
    return out;
  }

  async get(recordId: string): Promise<TraceRecord | null> {
    if (!isRecordId(recordId)) return null;
    return this.read(join(this.dir(), `${recordId}.json`));
  }

  private async read(path: string): Promise<TraceRecord | null> {
    const raw = await readFile(path, "utf8").catch(() => null);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as TraceRecord;
    } catch {
      return null; // an unreadable trace is skipped, never thrown — as the parser is
    }
  }
}

/* ---------------------------------------------------------------------- kv */

/**
 * KV day-buckets: one hash per day (`traces:d:<date>`, field = recordId) plus a
 * set of the days that exist. The hash expires, so the store is bounded without
 * a sweeper; the day set is pruned of expired days as they are read.
 */
export class KvTraceStore implements TraceStore {
  readonly kind = "kv" as const;
  constructor(private readonly env: Record<string, string | undefined>) {}

  private dayKey(date: string): string {
    return `traces:d:${date}`;
  }

  async save(record: TraceRecord): Promise<void> {
    const key = this.dayKey(record.date);
    await kvPipeline(
      [
        ["HSET", key, record.recordId, JSON.stringify(record)],
        ["EXPIRE", key, RETENTION_SECONDS],
        ["SADD", "traces:days", record.date],
      ],
      this.env,
    );
  }

  async list(limit = DEFAULT_LIMIT): Promise<TraceRecord[]> {
    const days = ((await kvCommand<string[]>(["SMEMBERS", "traces:days"], this.env)) ?? []).sort().reverse();
    const out: TraceRecord[] = [];
    for (const day of days) {
      if (out.length >= limit) break;
      const flat = (await kvCommand<string[]>(["HGETALL", this.dayKey(day)], this.env)) ?? [];
      const records: TraceRecord[] = [];
      // HGETALL returns [field, value, field, value, …]; the values are the records.
      for (let i = 1; i < flat.length; i += 2) {
        const rec = parse(flat[i]);
        if (rec) records.push(rec);
      }
      if (records.length === 0) {
        // The day's hash has expired out; drop the day so the set stays bounded too.
        await kvCommand(["SREM", "traces:days", day], this.env).catch(() => undefined);
        continue;
      }
      records.sort((a, b) => b.recordId.localeCompare(a.recordId));
      out.push(...records.slice(0, limit - out.length));
    }
    return out;
  }

  async get(recordId: string): Promise<TraceRecord | null> {
    if (!isRecordId(recordId)) return null;
    const day = recordId.slice(0, 10);
    const raw = await kvCommand<string | null>(["HGET", this.dayKey(day), recordId], this.env);
    return raw ? parse(raw) : null;
  }
}

function parse(raw: string | undefined): TraceRecord | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TraceRecord;
  } catch {
    return null;
  }
}

/** Record ids are used as file names and KV fields; accept only the shape we mint. */
export function isRecordId(id: string): boolean {
  return /^\d{4}-\d{2}-\d{2}-\d{6}-[a-z0-9]{1,12}$/.test(id);
}

/* ------------------------------------------------------------------ wiring */

export function getTraceStore(
  env: Record<string, string | undefined> = process.env,
  baseDir: string = process.cwd(),
): TraceStore {
  if (has(env.KV_REST_API_URL) && has(env.KV_REST_API_TOKEN)) return new KvTraceStore(env);
  return new LocalTraceStore(baseDir);
}

/** True when traces persist across serverless invocations. Without KV the local
 *  store still works, but a production deployment writes to an ephemeral disk —
 *  the page says so rather than showing an empty list as if nothing had run. */
export function tracesDurable(env: Record<string, string | undefined> = process.env): boolean {
  return kvConfigured(env);
}

/**
 * Persist one finished run. Fire-and-safe: never throws, so a full disk or a
 * rate-limited KV cannot fail the agent turn it was only describing.
 */
export async function recordTrace(
  trace: Trace,
  opts: { feature: string; at?: Date; env?: Record<string, string | undefined>; baseDir?: string } ,
): Promise<string | null> {
  const at = opts.at ?? new Date();
  const env = opts.env ?? process.env;
  try {
    const record: TraceRecord = {
      recordId: newRecordId(at),
      feature: opts.feature,
      date: at.toISOString().slice(0, 10),
      trace: trimTrace(trace),
    };
    await getTraceStore(env, opts.baseDir).save(record);
    return record.recordId;
  } catch {
    return null; // tracing must never break the traced run
  }
}

export async function listTraces(limit?: number, env?: Record<string, string | undefined>, baseDir?: string): Promise<TraceRecord[]> {
  try {
    return await getTraceStore(env ?? process.env, baseDir).list(limit);
  } catch {
    return [];
  }
}

export async function getTrace(recordId: string, env?: Record<string, string | undefined>, baseDir?: string): Promise<TraceRecord | null> {
  try {
    return await getTraceStore(env ?? process.env, baseDir).get(recordId);
  } catch {
    return null;
  }
}
