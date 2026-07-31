/**
 * The compact per-engagement summary the landscape tiles are drawn from.
 *
 * A list of processes is only useful if each entry carries its health at a
 * glance: the traffic light (never an average — a failed knock-out dominates it,
 * doc A §6.2), how much of the catalogue is actually assessed, and how far each
 * stage of the anamnesis has come. Stage progress and gate verdicts come straight
 * off `meta` (the filled-section index + gates), so the only extra read per
 * engagement is its ratings.
 */

import { SECTION_GROUPS, sectionsOf } from "./sections";
import { profileFrom } from "./profile";
import type { Status } from "./health-model";
import { filledOf, type EngagementMeta, type Ratings } from "./store";

export interface StageProgress {
  id: string;
  n: number;
  label: string;
  /** Sections in this stage that have content. */
  done: number;
  total: number;
  /** The worst gate verdict recorded in this stage: a failure dominates. */
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
  stages: StageProgress[];
}

export function summarize(m: EngagementMeta, r: Ratings): EngagementSummary {
  const p = profileFrom(m, r);
  const filled = new Set(filledOf(m));

  const stages: StageProgress[] = [...SECTION_GROUPS]
    .sort((a, b) => a.order - b.order)
    .map((g) => {
      const secs = sectionsOf(g.id);
      const verdicts = secs.map((s) => m.gates?.[s.key]).filter(Boolean);
      const gate: StageProgress["gate"] =
        verdicts.length === 0 ? null : verdicts.some((v) => v && !v.passed) ? "fail" : "pass";
      return {
        id: g.id,
        n: g.order,
        label: g.label,
        done: secs.filter((s) => filled.has(s.key)).length,
        total: secs.length,
        gate,
      };
    });

  return {
    status: p.status,
    coverage: p.coverage,
    ratedCount: p.ratedCount,
    totalCount: p.totalCount,
    koFailed: p.knockOuts.filter((k) => k.state === "fail" && k.rated).map((k) => k.id),
    stages,
  };
}
