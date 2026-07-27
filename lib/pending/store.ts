/**
 * Interim write buffer (outbox) for captured demands.
 *
 * Intake does NOT push straight to git on the request path. It persists the demand
 * here first — fast and durable — and returns immediately; a background flush then
 * commits each entry to `du-demands` (the system of record) and removes it. This
 * decouples the requester's submit from GitHub latency/availability, smooths write
 * spikes from 14k people, and lets ids be allocated without a git read-modify-write.
 *
 * Backends: KV (Upstash/Vercel REST via `KV_REST_API_*`) in production; a local
 * `.pending-demands/` directory otherwise, so dev and tests exercise the same path.
 * Both allocate ids collision-free and persist create-only.
 */

import { mkdir, readdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { listDemandIds } from "../demands-store.js";
import { nextDemandId } from "../demand.js";

export interface PendingDemand {
  id: string;
  markdown: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

/** What `enqueue` builds once it knows the allocated id. */
export interface PendingBuild {
  markdown: string;
  createdAt: string;
}

export interface PendingStore {
  readonly kind: "kv" | "local";
  /** Allocate a unique id and persist the built demand atomically. */
  enqueue(year: number, build: (id: string) => PendingBuild): Promise<PendingDemand>;
  /** All buffered (not-yet-committed) demands. */
  list(): Promise<PendingDemand[]>;
  /** Persist a mutated entry (e.g. bump attempts after a failed flush). */
  update(demand: PendingDemand): Promise<void>;
  /** Remove an entry once it is committed to git. */
  remove(id: string): Promise<void>;
}

const MAX_ALLOC_ATTEMPTS = 12;
const LOCAL_DIR = ".pending-demands";

/** Local filesystem buffer — one `<id>.json` per pending demand. */
export class LocalPendingStore implements PendingStore {
  readonly kind = "local" as const;
  constructor(private readonly baseDir: string) {}

  private dir(): string {
    return join(this.baseDir, LOCAL_DIR);
  }
  private file(id: string): string {
    return join(this.dir(), `${id}.json`);
  }

  async enqueue(year: number, build: (id: string) => PendingBuild): Promise<PendingDemand> {
    await mkdir(this.dir(), { recursive: true });
    const pendingIds = (await readdir(this.dir()).catch(() => []))
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
    for (let attempt = 0; attempt < MAX_ALLOC_ATTEMPTS; attempt++) {
      const gitIds = await listDemandIds(this.baseDir);
      const id = nextDemandId([...gitIds, ...pendingIds], year);
      const built = build(id);
      const demand: PendingDemand = { id, markdown: built.markdown, createdAt: built.createdAt, attempts: 0 };
      try {
        await writeFile(this.file(id), JSON.stringify(demand), { flag: "wx" }); // atomic create-only
        return demand;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "EEXIST") {
          pendingIds.push(id);
          continue;
        }
        throw err;
      }
    }
    throw new Error(`Could not allocate a pending demand id after ${MAX_ALLOC_ATTEMPTS} attempts`);
  }

  async list(): Promise<PendingDemand[]> {
    const files = (await readdir(this.dir()).catch(() => [])).filter((f) => f.endsWith(".json"));
    const out: PendingDemand[] = [];
    for (const f of files) {
      const raw = await readFile(join(this.dir(), f), "utf8").catch(() => undefined);
      if (!raw) continue;
      try {
        out.push(JSON.parse(raw) as PendingDemand);
      } catch {
        /* skip a corrupt entry */
      }
    }
    return out.sort((a, b) => a.id.localeCompare(b.id));
  }

  async update(demand: PendingDemand): Promise<void> {
    await writeFile(this.file(demand.id), JSON.stringify(demand));
  }

  async remove(id: string): Promise<void> {
    await unlink(this.file(id)).catch(() => {});
  }
}

/** KV buffer — an atomic sequence for ids, a set of ids, and one key per demand. */
export class KvPendingStore implements PendingStore {
  readonly kind = "kv" as const;
  constructor(private readonly url: string, private readonly token: string) {}

  private async cmd<T>(...args: string[]): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`KV ${args[0]} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return ((await res.json()) as { result: T }).result;
  }

  private seqKey(year: number): string {
    return `funnel:seq:${year}`;
  }

  async enqueue(year: number, build: (id: string) => PendingBuild): Promise<PendingDemand> {
    // Seed the sequence above any id already in git (once; SETNX is a no-op after).
    const gitIds = await listDemandIds();
    const gitMax = gitIds.reduce((m, id) => {
      const n = Number.parseInt(id.slice(`UC-${year}-`.length), 10);
      return id.startsWith(`UC-${year}-`) && Number.isFinite(n) && n > m ? n : m;
    }, 0);
    await this.cmd("SETNX", this.seqKey(year), String(gitMax));
    const n = await this.cmd<number>("INCR", this.seqKey(year));
    const id = `UC-${year}-${String(n).padStart(4, "0")}`;
    const built = build(id);
    const demand: PendingDemand = { id, markdown: built.markdown, createdAt: built.createdAt, attempts: 0 };
    await this.cmd("SET", `funnel:pending:${id}`, JSON.stringify(demand));
    await this.cmd("SADD", "funnel:pending:ids", id);
    return demand;
  }

  async list(): Promise<PendingDemand[]> {
    const ids = (await this.cmd<string[]>("SMEMBERS", "funnel:pending:ids")) ?? [];
    if (ids.length === 0) return [];
    const raws = await this.cmd<(string | null)[]>("MGET", ...ids.map((id) => `funnel:pending:${id}`));
    const out: PendingDemand[] = [];
    for (const raw of raws) {
      if (!raw) continue;
      try {
        out.push(JSON.parse(raw) as PendingDemand);
      } catch {
        /* skip */
      }
    }
    return out.sort((a, b) => a.id.localeCompare(b.id));
  }

  async update(demand: PendingDemand): Promise<void> {
    await this.cmd("SET", `funnel:pending:${demand.id}`, JSON.stringify(demand));
  }

  async remove(id: string): Promise<void> {
    await this.cmd("DEL", `funnel:pending:${id}`);
    await this.cmd("SREM", "funnel:pending:ids", id);
  }
}

function has(v: string | undefined): boolean {
  return typeof v === "string" && v.trim() !== "";
}

/** The active buffer: KV when configured, else a local directory. */
export function getPendingStore(env: Record<string, string | undefined> = process.env, baseDir = process.cwd()): PendingStore {
  if (has(env.KV_REST_API_URL) && has(env.KV_REST_API_TOKEN)) {
    return new KvPendingStore(env.KV_REST_API_URL!.replace(/\/$/, ""), env.KV_REST_API_TOKEN!);
  }
  return new LocalPendingStore(baseDir);
}
