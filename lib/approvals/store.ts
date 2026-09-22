/**
 * Where proposals wait (N2).
 *
 * Two shelves, because the two kinds of record have opposite lifetimes:
 *
 *   PENDING   one hash that never expires. A decision nobody has taken must not
 *             quietly disappear — a queue that loses items is worse than no
 *             queue, because people stop looking at it and never learn why.
 *   DECIDED   day-buckets on a retention window, like the usage meter and the
 *             trace store. A decided proposal is evidence (this lane proposed
 *             forty actions and had one rejected), and evidence for a promotion
 *             up the ladder is worth keeping for longer than a trace — but not
 *             forever, so the store stays bounded.
 *
 * Backends are KV or a local mirror, the kv-or-local shape `lib/pending/store.ts`
 * and `lib/agent/trace-store.ts` already prove, so dev and tests exercise the
 * same path as production.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { kvConfigured, kvCommand, kvPipeline } from "../kv.js";
import { isProposalId, type Proposal } from "./model.js";

/** How long a DECIDED proposal is kept. Longer than a trace: it is the record a
 *  lane's promotion (or refusal) gets argued from. */
export const DECIDED_RETENTION_DAYS = 180;
const DECIDED_RETENTION_SECONDS = DECIDED_RETENTION_DAYS * 24 * 60 * 60;

const PENDING_KEY = "approvals:pending";
const DECIDED_DAYS_KEY = "approvals:days";
const LOCAL_DIR = ".agent-approvals";
const DEFAULT_LIMIT = 100;

export interface ApprovalStore {
  readonly kind: "kv" | "local";
  /** Insert or update. A proposal that has been decided leaves the pending shelf. */
  save(p: Proposal): Promise<void>;
  get(id: string): Promise<Proposal | null>;
  /** Oldest first — a queue is worked from the front. */
  listPending(limit?: number): Promise<Proposal[]>;
  /** Newest first — history is read from the top. */
  listDecided(limit?: number): Promise<Proposal[]>;
}

function has(v: string | undefined): boolean {
  return typeof v === "string" && v.trim() !== "";
}

function parse(raw: string | undefined | null): Proposal | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Proposal;
  } catch {
    return null; // an unreadable record is skipped, never thrown — as the parser is
  }
}

function decidedDay(p: Proposal): string {
  return (p.decidedAt ?? p.createdAt).slice(0, 10);
}

/* ------------------------------------------------------------------- local */

export class LocalApprovalStore implements ApprovalStore {
  readonly kind = "local" as const;
  constructor(private readonly baseDir: string) {}

  private dir(): string {
    return join(this.baseDir, LOCAL_DIR);
  }

  async save(p: Proposal): Promise<void> {
    await mkdir(this.dir(), { recursive: true });
    await writeFile(join(this.dir(), `${p.id}.json`), JSON.stringify(p, null, 2), "utf8");
  }

  async get(id: string): Promise<Proposal | null> {
    if (!isProposalId(id)) return null;
    return parse(await readFile(join(this.dir(), `${id}.json`), "utf8").catch(() => null));
  }

  private async all(): Promise<Proposal[]> {
    const names = (await readdir(this.dir()).catch(() => [])).filter((n) => n.endsWith(".json"));
    const out: Proposal[] = [];
    for (const n of names) {
      const p = parse(await readFile(join(this.dir(), n), "utf8").catch(() => null));
      if (p) out.push(p);
    }
    return out;
  }

  async listPending(limit = DEFAULT_LIMIT): Promise<Proposal[]> {
    const pending = (await this.all()).filter((p) => p.status === "pending");
    return pending.sort((a, b) => a.id.localeCompare(b.id)).slice(0, limit);
  }

  async listDecided(limit = DEFAULT_LIMIT): Promise<Proposal[]> {
    const decided = (await this.all()).filter((p) => p.status !== "pending");
    return decided.sort((a, b) => (a.decidedAt ?? a.id) < (b.decidedAt ?? b.id) ? 1 : -1).slice(0, limit);
  }
}

/* ---------------------------------------------------------------------- kv */

export class KvApprovalStore implements ApprovalStore {
  readonly kind = "kv" as const;
  constructor(private readonly env: Record<string, string | undefined>) {}

  private dayKey(day: string): string {
    return `approvals:d:${day}`;
  }

  async save(p: Proposal): Promise<void> {
    if (p.status === "pending") {
      await kvCommand(["HSET", PENDING_KEY, p.id, JSON.stringify(p)], this.env);
      return;
    }
    // Decided: it moves off the pending shelf in the same round trip that files
    // it, so it can never be both queued and decided.
    const day = decidedDay(p);
    await kvPipeline(
      [
        ["HSET", this.dayKey(day), p.id, JSON.stringify(p)],
        ["EXPIRE", this.dayKey(day), DECIDED_RETENTION_SECONDS],
        ["SADD", DECIDED_DAYS_KEY, day],
        ["HDEL", PENDING_KEY, p.id],
      ],
      this.env,
    );
  }

  async get(id: string): Promise<Proposal | null> {
    if (!isProposalId(id)) return null;
    const pending = parse(await kvCommand<string | null>(["HGET", PENDING_KEY, id], this.env));
    if (pending) return pending;
    // A decided proposal is filed under the day it was DECIDED, which is not
    // knowable from the id — so look through the days newest first.
    for (const day of await this.decidedDays()) {
      const hit = parse(await kvCommand<string | null>(["HGET", this.dayKey(day), id], this.env));
      if (hit) return hit;
    }
    return null;
  }

  private async decidedDays(): Promise<string[]> {
    return ((await kvCommand<string[]>(["SMEMBERS", DECIDED_DAYS_KEY], this.env)) ?? []).sort().reverse();
  }

  async listPending(limit = DEFAULT_LIMIT): Promise<Proposal[]> {
    const flat = (await kvCommand<string[]>(["HGETALL", PENDING_KEY], this.env)) ?? [];
    const out: Proposal[] = [];
    for (let i = 1; i < flat.length; i += 2) {
      const p = parse(flat[i]);
      if (p) out.push(p);
    }
    return out.sort((a, b) => a.id.localeCompare(b.id)).slice(0, limit);
  }

  async listDecided(limit = DEFAULT_LIMIT): Promise<Proposal[]> {
    const out: Proposal[] = [];
    for (const day of await this.decidedDays()) {
      if (out.length >= limit) break;
      const flat = (await kvCommand<string[]>(["HGETALL", this.dayKey(day)], this.env)) ?? [];
      const records: Proposal[] = [];
      for (let i = 1; i < flat.length; i += 2) {
        const p = parse(flat[i]);
        if (p) records.push(p);
      }
      if (records.length === 0) {
        // The day's bucket expired; drop the day so the index stays bounded too.
        await kvCommand(["SREM", DECIDED_DAYS_KEY, day], this.env).catch(() => undefined);
        continue;
      }
      records.sort((a, b) => ((a.decidedAt ?? a.id) < (b.decidedAt ?? b.id) ? 1 : -1));
      out.push(...records.slice(0, limit - out.length));
    }
    return out;
  }
}

/* ------------------------------------------------------------------ wiring */

export function getApprovalStore(
  env: Record<string, string | undefined> = process.env,
  baseDir: string = process.cwd(),
): ApprovalStore {
  if (has(env.KV_REST_API_URL) && has(env.KV_REST_API_TOKEN)) return new KvApprovalStore(env);
  return new LocalApprovalStore(baseDir);
}

/** True when the queue survives a restart. Unlike a trace, a PENDING proposal on
 *  an ephemeral disk is a decision somebody is waiting to make and will never be
 *  asked for — so the inbox says this plainly rather than looking merely empty. */
export function approvalsDurable(env: Record<string, string | undefined> = process.env): boolean {
  return kvConfigured(env);
}
