/**
 * Projection store — the read model that backs the funnel views at scale.
 *
 * The system of record is git (`du-demands`). Reading every case from the GitHub
 * Contents API on each of ~14k users' page loads does not scale, so a webhook-driven
 * reconcile PROJECTS the funnel into this store and the views read from here.
 *
 * Backend: KV (Vercel KV / Upstash REST via `KV_REST_API_*`) when configured. When
 * it is NOT configured, `getProjectionStore()` returns null and the query layer
 * falls back to reading the funnel directly — correct for local/dev and any
 * deployment that hasn't provisioned KV yet. The store holds the denormalised rows
 * under one key; the query layer does filter/scope/pagination on top.
 */

import type { RegistryRow } from "../registry.js";

export interface ProjectionStore {
  readonly kind: "kv";
  /** All projected rows, or null if the projection hasn't been built yet. */
  readRows(): Promise<RegistryRow[] | null>;
  /** Replace the projected rows (reconcile writes this). */
  writeRows(rows: RegistryRow[]): Promise<void>;
}

const ROWS_KEY = "funnel:rows:v1";

/** KV via the Upstash/Vercel REST protocol: POST the command as a JSON array. */
class KvProjectionStore implements ProjectionStore {
  readonly kind = "kv" as const;
  constructor(private readonly url: string, private readonly token: string) {}

  private async cmd<T>(...args: string[]): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`KV ${args[0]} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { result: T };
    return data.result;
  }

  async readRows(): Promise<RegistryRow[] | null> {
    const raw = await this.cmd<string | null>("GET", ROWS_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RegistryRow[];
    } catch {
      return null;
    }
  }

  async writeRows(rows: RegistryRow[]): Promise<void> {
    await this.cmd("SET", ROWS_KEY, JSON.stringify(rows));
  }
}

function has(v: string | undefined): boolean {
  return typeof v === "string" && v.trim() !== "";
}

/** The active projection store, or null when KV isn't configured (→ direct read). */
export function getProjectionStore(env: Record<string, string | undefined> = process.env): ProjectionStore | null {
  if (has(env.KV_REST_API_URL) && has(env.KV_REST_API_TOKEN)) {
    return new KvProjectionStore(env.KV_REST_API_URL!.replace(/\/$/, ""), env.KV_REST_API_TOKEN!);
  }
  return null;
}
