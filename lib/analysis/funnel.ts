/**
 * Use-case funnel analysis (docs/10-skills.md `portfolio-analysis`,
 * docs/01 FR-7.2, docs/15 §15.6).
 *
 * The funnel shows demand narrowing S1→S8: how many use cases reached each stage,
 * how many stopped there (killed/parked), stage→stage conversion, and kill rate
 * BY GATE. Kill rate at G4 is a health metric — zero kills means the gate is not
 * deciding, and we say so (§15.6). Deterministic and pure.
 */

import { STAGES, type Gate, type Lane, type Stage } from "../types.js";
import type { RegistryRow } from "../registry.js";

const STAGE_LABEL: Record<Stage, string> = {
  S1: "Demand", S2: "Shaping", S3: "Assess", S4: "POC",
  S5: "Pilot", S6: "Scale", S7: "Rollout", S8: "Steady ops",
};

function stageIndex(stage: Stage | undefined): number {
  return stage ? STAGES.indexOf(stage) : -1;
}

export interface FunnelStage {
  stage: Stage;
  label: string;
  /** Reached this stage or beyond (the funnel step count). */
  entered: number;
  active: number;
  killed: number;
  parked: number;
  /** entered / entered(top) — cumulative conversion from entry (0..1). */
  pctOfTop: number;
  /** entered / entered(prev) — step conversion (0..1); undefined for the top step. */
  stepConversion?: number;
  /** entered(prev) − entered — absolute drop-off entering this step. */
  dropFromPrev?: number;
  /** entered(next) / entered(this) (0..1), or undefined for S8. */
  conversionToNext?: number;
  /** Average days active use cases have been sitting in this stage. */
  dwellDays?: number;
}

export interface GateKill {
  gate: Gate;
  /** Use cases that reached the gate's stage. */
  reached: number;
  killed: number;
  rate: number;
}

export interface FunnelAnalysis {
  stages: FunnelStage[];
  gateKills: GateKill[];
  g4KillRate: number;
  totalEntered: number;
  activeTotal: number;
  killedTotal: number;
  parkedTotal: number;
  needsAttention: number;
  /** Overall conversion entry → S8 (reached S8 / reached S1), 0..1. */
  overallConversion: number;
  /** Mean step conversion across the funnel, 0..1. */
  avgStepConversion: number;
  /** The single largest step drop-off (the bottleneck). */
  biggestDrop?: { from: Stage; to: Stage; lost: number; pct: number };
  laneBalance: { lane: Lane; count: number }[];
  flags: string[];
}

const MS_PER_DAY = 86_400_000;

export function analyzeFunnel(rows: readonly RegistryRow[], opts?: { now?: string }): FunnelAnalysis {
  const withStage = rows.filter((r) => r.stage !== undefined);
  const needsAttention = rows.filter((r) => r.needsAttention || r.stage === undefined).length;
  const nowMs = opts?.now ? Date.parse(opts.now) : NaN;

  const dwellFor = (s: number): number | undefined => {
    if (Number.isNaN(nowMs)) return undefined;
    const active = withStage.filter((r) => r.status === "active" && stageIndex(r.stage) === s && r.since);
    if (active.length === 0) return undefined;
    const days = active.map((r) => Math.max(0, Math.floor((nowMs - Date.parse(r.since!)) / MS_PER_DAY)));
    return Math.round(days.reduce((a, b) => a + b, 0) / days.length);
  };

  const entered: number[] = STAGES.map((_, s) => withStage.filter((r) => stageIndex(r.stage) >= s).length);
  const at = (status: RegistryRow["status"], s: number) =>
    withStage.filter((r) => r.status === status && stageIndex(r.stage) === s).length;

  const top = entered[0] ?? 0;
  const stages: FunnelStage[] = STAGES.map((stage, s) => {
    const count = entered[s] ?? 0;
    const prev = entered[s - 1] ?? 0;
    const st: FunnelStage = {
      stage,
      label: STAGE_LABEL[stage],
      entered: count,
      active: at("active", s),
      killed: at("killed", s),
      parked: at("parked", s),
      pctOfTop: top > 0 ? Math.round((count / top) * 1000) / 1000 : 0,
    };
    if (s > 0) {
      st.stepConversion = prev > 0 ? Math.round((count / prev) * 1000) / 1000 : 0;
      st.dropFromPrev = prev - count;
    }
    if (s < STAGES.length - 1 && count > 0) {
      st.conversionToNext = Math.round(((entered[s + 1] ?? 0) / count) * 1000) / 1000;
    }
    const dwell = dwellFor(s);
    if (dwell !== undefined) st.dwellDays = dwell;
    return st;
  });

  // Funnel-analytics headline metrics.
  const overallConversion = top > 0 ? Math.round(((entered[STAGES.length - 1] ?? 0) / top) * 1000) / 1000 : 0;
  const stepConvs = stages.slice(1).map((s) => s.stepConversion ?? 0).filter((_, i) => (entered[i] ?? 0) > 0);
  const avgStepConversion = stepConvs.length > 0 ? Math.round((stepConvs.reduce((a, b) => a + b, 0) / stepConvs.length) * 1000) / 1000 : 0;

  // The bottleneck: the sharpest conversion drop (largest %), tie-broken by count.
  let biggestDrop: FunnelAnalysis["biggestDrop"];
  for (let s = 1; s < STAGES.length; s++) {
    const prev = entered[s - 1] ?? 0;
    const cur = entered[s] ?? 0;
    if (prev > 0 && cur < prev) {
      const pct = Math.round((1 - cur / prev) * 1000) / 1000;
      if (!biggestDrop || pct > biggestDrop.pct) {
        biggestDrop = { from: STAGES[s - 1]!, to: STAGES[s]!, lost: prev - cur, pct };
      }
    }
  }

  // Gate G_n is the exit of stage S_n. Kill rate = killed-at-stage / reached-stage.
  const gateKills: GateKill[] = STAGES.slice(0, 7).map((stage, s) => {
    const reached = entered[s] ?? 0;
    const killed = at("killed", s);
    return { gate: `G${s + 1}` as Gate, reached, killed, rate: reached > 0 ? Math.round((killed / reached) * 100) / 100 : 0 };
  });

  const g4KillRate = gateKills[3]?.rate ?? 0;
  const g4Reached = gateKills[3]?.reached ?? 0;

  const laneCounts = new Map<Lane, number>();
  for (const r of withStage) if (r.lane) laneCounts.set(r.lane, (laneCounts.get(r.lane) ?? 0) + 1);
  const laneBalance = [...laneCounts.entries()].map(([lane, count]) => ({ lane, count })).sort((a, b) => b.count - a.count);

  const flags: string[] = [];
  if (g4Reached > 0 && g4KillRate === 0) {
    flags.push("Kill rate at G4 is zero — the gate is not deciding. Expect a non-zero kill rate on a healthy funnel.");
  }
  if (needsAttention > 0) {
    flags.push(`${needsAttention} use case${needsAttention > 1 ? "s" : ""} could not be read and are excluded from the funnel.`);
  }

  return {
    stages,
    gateKills,
    g4KillRate,
    totalEntered: entered[0] ?? 0,
    activeTotal: withStage.filter((r) => r.status === "active").length,
    killedTotal: withStage.filter((r) => r.status === "killed").length,
    parkedTotal: withStage.filter((r) => r.status === "parked").length,
    needsAttention,
    overallConversion,
    avgStepConversion,
    ...(biggestDrop ? { biggestDrop } : {}),
    laneBalance,
    flags,
  };
}
