/**
 * Usage metering — "how much is the portal spending, and on what."
 *
 * Every live model call is one event: which FEATURE made it (process section,
 * champions analysis, intake turn, requirements, the analyst agent…), which
 * provider and model answered, and the tokens it cost. Those roll up into
 * per-day, per-feature and per-model counters so the cost overview can answer
 * two questions the operator actually has: what is this costing, and which
 * feature to limit first to cut it.
 *
 * Persistence is KV, because the counters must survive across serverless
 * invocations — a request-local number would reset on every cold start. With no
 * KV configured, metering is a NO-OP that never throws and the overview says it
 * needs a store, the same honest degradation as the rest of the portal. Recording
 * never blocks or breaks the call it measures: a metering failure is swallowed.
 *
 * Storage shape, per day, in one hash `usage:d:<YYYY-MM-DD>`:
 *   f:<feature>:{calls,in,out,cr,cw}   — the per-feature rollup
 *   m:<model>:{calls,in,out,cr,cw}     — the per-model rollup (priced separately)
 * A set `usage:days` lists which days exist; each day hash expires after a
 * retention window so the store cannot grow without bound.
 */

import { kvConfigured, kvPipeline, kvCommand } from "./kv.js";
import { estimateCost, isPriced, type TokenCounts } from "./pricing.js";

/** Days a day-bucket is kept before it expires out of KV. */
const RETENTION_DAYS = 120;
const RETENTION_SECONDS = RETENTION_DAYS * 24 * 60 * 60;

/** The features the portal meters. Not a hard enum — any string is accepted —
 *  but naming the known ones keeps call sites honest and the overview readable. */
export const FEATURES = {
  processSection: "process.section",
  processAdvisory: "process.advisory",
  processDigest: "process.digest",
  processCoach: "process.coach",
  processAnalysis: "process.analysis",
  champions: "champions.analysis",
  requirements: "requirements",
  research: "research",
  intakeTurn: "intake.turn",
  intakeEnhance: "intake.enhance",
  agent: "agent.chat",
  health: "health.probe",
} as const;

export interface UsageEvent {
  feature: string;
  provider: string;
  model?: string;
  usage: TokenCounts;
}

export function usageMeterEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return kvConfigured(env);
}

/** A KV field/key segment must not carry the ':' we split on, nor whitespace. */
function seg(s: string): string {
  return (s || "unknown").replace(/[:\s]+/g, "_").slice(0, 60);
}

function dayKey(d: Date): string {
  return `usage:d:${d.toISOString().slice(0, 10)}`;
}

/**
 * Record one model call. Fire-and-safe: returns immediately as a no-op without
 * KV, and swallows any error so metering can never take down the feature it
 * measures. `at` is injectable for tests.
 */
export async function recordUsage(event: UsageEvent, at: Date = new Date()): Promise<void> {
  if (!usageMeterEnabled()) return;
  const f = seg(event.feature);
  const m = seg(event.model ?? event.provider ?? "unknown");
  const u = event.usage;
  const key = dayKey(at);
  const date = at.toISOString().slice(0, 10);

  // Every counter for this call, in one pipelined round trip.
  const incr = (field: string, by: number): (string | number)[] => ["HINCRBY", key, field, Math.max(0, Math.round(by))];
  const commands: (string | number)[][] = [
    incr(`f:${f}:calls`, 1),
    incr(`f:${f}:in`, u.input),
    incr(`f:${f}:out`, u.output),
    incr(`f:${f}:cr`, u.cacheRead ?? 0),
    incr(`f:${f}:cw`, u.cacheWrite ?? 0),
    incr(`m:${m}:calls`, 1),
    incr(`m:${m}:in`, u.input),
    incr(`m:${m}:out`, u.output),
    incr(`m:${m}:cr`, u.cacheRead ?? 0),
    incr(`m:${m}:cw`, u.cacheWrite ?? 0),
    ["EXPIRE", key, RETENTION_SECONDS],
    ["SADD", "usage:days", date],
  ];
  try {
    await kvPipeline(commands);
  } catch {
    /* metering must never break the measured call */
  }
}

export interface Rollup {
  key: string;
  calls: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  /** Estimated USD, or null when the model isn't priced (feature rows sum only
   *  the priced share and set `estimated` when something was unpriced). */
  cost: number | null;
}

export interface DailyPoint {
  date: string;
  calls: number;
  input: number;
  output: number;
  cost: number | null;
}

export interface UsageReport {
  enabled: boolean;
  days: number;
  from: string;
  to: string;
  totals: { calls: number; input: number; output: number; cacheRead: number; cacheWrite: number; cost: number | null };
  byFeature: Rollup[];
  byModel: Rollup[];
  daily: DailyPoint[];
  /** True when at least one model in the window isn't in the pricing table, so
   *  the total is a floor, not the whole bill. */
  hasUnpriced: boolean;
}

/** Upstash returns HGETALL as a flat [f, v, f, v, …] array; normalise to a map. */
function toMap(raw: unknown): Map<string, number> {
  const out = new Map<string, number>();
  if (Array.isArray(raw)) {
    for (let i = 0; i + 1 < raw.length; i += 2) out.set(String(raw[i]), Number(raw[i + 1]) || 0);
  } else if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) out.set(k, Number(v) || 0);
  }
  return out;
}

function accumulate(into: Map<string, Rollup>, kind: "f" | "m", fields: Map<string, number>): void {
  for (const [field, value] of fields) {
    const m = new RegExp(`^${kind}:(.+):(calls|in|out|cr|cw)$`).exec(field);
    if (!m) continue;
    const name = m[1]!;
    const metric = m[2]!;
    const row = into.get(name) ?? { key: name, calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: null };
    if (metric === "calls") row.calls += value;
    else if (metric === "in") row.input += value;
    else if (metric === "out") row.output += value;
    else if (metric === "cr") row.cacheRead += value;
    else if (metric === "cw") row.cacheWrite += value;
    into.set(name, row);
  }
}

/** The last `days` day-strings ending at `to` (inclusive), oldest first. */
function dateRange(days: number, to: Date): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(to);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * Read the usage rollup for the last `days` days. Empty (but `enabled`) when
 * nothing has been recorded; `enabled: false` with zeros when there is no store.
 */
export async function readUsage(days = 30, to: Date = new Date()): Promise<UsageReport> {
  const dates = dateRange(days, to);
  const empty: UsageReport = {
    enabled: usageMeterEnabled(),
    days,
    from: dates[0]!,
    to: dates[dates.length - 1]!,
    totals: { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 },
    byFeature: [],
    byModel: [],
    daily: dates.map((date) => ({ date, calls: 0, input: 0, output: 0, cost: 0 })),
    hasUnpriced: false,
  };
  if (!usageMeterEnabled()) return { ...empty, totals: { ...empty.totals, cost: null }, daily: dates.map((date) => ({ date, calls: 0, input: 0, output: 0, cost: null })) };

  let dayMaps: Map<string, number>[];
  try {
    const raw = await kvPipeline(dates.map((d) => ["HGETALL", `usage:d:${d}`]));
    dayMaps = raw.map(toMap);
  } catch {
    return empty; // a read failure shows an empty-but-enabled overview, not a 500
  }

  const featureRoll = new Map<string, Rollup>();
  const modelRoll = new Map<string, Rollup>();
  const daily: DailyPoint[] = [];

  dates.forEach((date, i) => {
    const fields = dayMaps[i]!;
    accumulate(featureRoll, "f", fields);
    accumulate(modelRoll, "m", fields);
    // Per-day point: sum the feature rows for this single day's fields.
    const dayFeat = new Map<string, Rollup>();
    accumulate(dayFeat, "f", fields);
    const dayModel = new Map<string, Rollup>();
    accumulate(dayModel, "m", fields);
    let calls = 0, input = 0, output = 0, cost = 0, anyUnpriced = false;
    for (const r of dayFeat.values()) { calls += r.calls; input += r.input; output += r.output; }
    for (const r of dayModel.values()) {
      const c = estimateCost(r.key, r);
      if (c === null) anyUnpriced = true; else cost += c;
    }
    daily.push({ date, calls, input, output, cost: anyUnpriced && cost === 0 ? null : cost });
  });

  // Price the model rollups; a feature's cost is left null (a feature can span
  // models) — cost is reported by model, volume by feature, which is the split
  // that actually guides "what to limit".
  let hasUnpriced = false;
  let totalCost = 0;
  for (const r of modelRoll.values()) {
    r.cost = estimateCost(r.key, r);
    if (r.cost === null) hasUnpriced = true; else totalCost += r.cost;
  }

  const sum = (rows: Iterable<Rollup>, k: keyof Rollup) => [...rows].reduce((a, r) => a + (r[k] as number), 0);
  const byFeature = [...featureRoll.values()].sort((a, b) => b.calls - a.calls);
  const byModel = [...modelRoll.values()].sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0));

  return {
    enabled: true,
    days,
    from: dates[0]!,
    to: dates[dates.length - 1]!,
    totals: {
      calls: sum(byFeature, "calls"),
      input: sum(byModel, "input"),
      output: sum(byModel, "output"),
      cacheRead: sum(byModel, "cacheRead"),
      cacheWrite: sum(byModel, "cacheWrite"),
      cost: totalCost,
    },
    byFeature,
    byModel,
    daily,
    hasUnpriced,
  };
}

/** Clear all recorded usage (admin reset). No-op without KV. */
export async function resetUsage(): Promise<void> {
  if (!usageMeterEnabled()) return;
  try {
    const days = await kvCommand<string[]>(["SMEMBERS", "usage:days"]).catch(() => [] as string[]);
    const cmds = (days ?? []).map((d) => ["DEL", `usage:d:${d}`]);
    cmds.push(["DEL", "usage:days"]);
    await kvPipeline(cmds);
  } catch {
    /* best effort */
  }
}

export { isPriced };
