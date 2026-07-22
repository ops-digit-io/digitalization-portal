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
  /** Reached this stage or beyond. */
  entered: number;
  active: number;
  killed: number;
  parked: number;
  /** entered(next) / entered(this), or undefined for S8. */
  conversionToNext?: number;
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
  laneBalance: { lane: Lane; count: number }[];
  flags: string[];
}

export function analyzeFunnel(rows: readonly RegistryRow[]): FunnelAnalysis {
  const withStage = rows.filter((r) => r.stage !== undefined);
  const needsAttention = rows.filter((r) => r.needsAttention || r.stage === undefined).length;

  const entered: number[] = STAGES.map((_, s) => withStage.filter((r) => stageIndex(r.stage) >= s).length);
  const at = (status: RegistryRow["status"], s: number) =>
    withStage.filter((r) => r.status === status && stageIndex(r.stage) === s).length;

  const stages: FunnelStage[] = STAGES.map((stage, s) => {
    const st: FunnelStage = {
      stage,
      label: STAGE_LABEL[stage],
      entered: entered[s] ?? 0,
      active: at("active", s),
      killed: at("killed", s),
      parked: at("parked", s),
    };
    if (s < STAGES.length - 1 && (entered[s] ?? 0) > 0) {
      st.conversionToNext = Math.round(((entered[s + 1] ?? 0) / (entered[s] ?? 1)) * 100) / 100;
    }
    return st;
  });

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
    laneBalance,
    flags,
  };
}
