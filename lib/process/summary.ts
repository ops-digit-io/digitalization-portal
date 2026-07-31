/**
 * The compact per-engagement summary the landscape tiles are drawn from.
 *
 * A list of processes is only useful if each entry carries its health at a
 * glance: the traffic light (never an average — a failed knock-out dominates it,
 * doc A §6.2), how much of the catalogue is actually assessed, and how far each
 * phase has come. Phase progress and gate verdicts come straight off `meta`
 * (filledArtefacts + gates), so the only extra read per engagement is its
 * ratings.
 */

import { PHASES } from "./phases";
import { artefactsOf } from "./artefacts";
import { profileFrom } from "./profile";
import type { Status } from "./health-model";
import type { EngagementMeta, Ratings } from "./store";

export interface PhaseProgress {
  id: string;
  n: number;
  /** Artefacts with content in this phase. */
  done: number;
  total: number;
  /** The phase's gate verdict, when one has been recorded. */
  gate: "pass" | "fail" | null;
}

export interface EngagementSummary {
  status: Status;
  /** 0..1 share of the 29 criteria actually assessed. */
  coverage: number;
  ratedCount: number;
  totalCount: number;
  /**
   * Knock-outs that were actually assessed and came out at level 1 — an
   * evidenced failure worth naming on a tile. Unrated knock-outs also count as
   * level 1 for the status (§1.3), but naming those would read as a finding
   * where nobody has looked yet; the grey light and coverage say that instead.
   */
  koFailed: string[];
  phases: PhaseProgress[];
}

export function summarize(m: EngagementMeta, r: Ratings): EngagementSummary {
  const p = profileFrom(m, r);
  const filled = new Set(m.filledArtefacts ?? []);

  const phases: PhaseProgress[] = PHASES.map((ph) => {
    const arts = artefactsOf(ph.id);
    const verdict = m.gates?.[ph.gate.id];
    return {
      id: ph.id,
      n: ph.n,
      done: arts.filter((a) => filled.has(a.id)).length,
      total: arts.length,
      gate: verdict ? (verdict.passed ? "pass" : "fail") : null,
    };
  });

  return {
    status: p.status,
    coverage: p.coverage,
    ratedCount: p.ratedCount,
    totalCount: p.totalCount,
    koFailed: p.knockOuts.filter((k) => k.state === "fail" && k.rated).map((k) => k.id),
    phases,
  };
}
