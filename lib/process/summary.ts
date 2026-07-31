/**
 * The compact per-engagement summary the landscape tiles are drawn from.
 *
 * The traffic light comes from the SOURCE TOOL'S score model: the grader scores
 * each section against its schema, those scores roll up into five dimensions, and
 * the light is read off that — never an average. Two rules from the model govern
 * it and are worth restating here because they are what make the light honest:
 *   1. a knock-out is not a low score. It dominates the colour instead of being
 *      averaged into it;
 *   2. bad news counts on partial evidence, good news does not — a dimension
 *      backed by half its sections can turn the light red, but never green.
 *
 * Stage progress and gate verdicts come straight off `meta`, so no extra I/O.
 */

import { SECTION_GROUPS, sectionsOf } from "./sections";
import { scoreProfile, trafficLight, type Light } from "./score-model";
import { filledOf, type EngagementMeta } from "./store";

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
  light: Light;
  reason: string;
  /** 0..1 share of the fourteen sections carrying a score. */
  coverage: number;
  sectionsAssessed: number;
  sectionsTotal: number;
  /** Overall 0..100, or null while too little is assessed to say. */
  overall: number | null;
  /**
   * Knock-outs standing failed, by label — these alone force the light red, so
   * they are what a tile must name. Reported separately from `gateFailures`,
   * which the model keeps for the non-knock-out gates.
   */
  koFailed: string[];
  /** Non-knock-out gates recorded as failed. */
  gateFailures: string[];
  stages: StageProgress[];
}

export function summarize(m: EngagementMeta): EngagementSummary {
  const filled = new Set(filledOf(m));

  // The gate verdicts the model reads are the recorded ones, keyed by section.
  const gateResults: Record<string, boolean> = {};
  for (const [key, v] of Object.entries(m.gates ?? {})) if (v) gateResults[key] = v.passed;

  const profile = scoreProfile(m.sectionScores ?? {}, gateResults);
  const light = trafficLight(profile);

  const stages: StageProgress[] = [...SECTION_GROUPS]
    .sort((a, b) => a.order - b.order)
    .map((g) => {
      const secs = sectionsOf(g.id);
      const verdicts = secs.map((s) => m.gates?.[s.key]).filter(Boolean);
      return {
        id: g.id,
        n: g.order,
        label: g.label,
        done: secs.filter((s) => filled.has(s.key)).length,
        total: secs.length,
        gate: verdicts.length === 0 ? null : verdicts.some((v) => v && !v.passed) ? "fail" : "pass",
      };
    });

  return {
    light: light.light,
    reason: light.reason,
    coverage: profile.coverage,
    sectionsAssessed: profile.sectionsAssessed,
    sectionsTotal: profile.sectionsTotal,
    overall: profile.overall,
    koFailed: profile.knockOuts.filter((k) => k.state === "fail").map((k) => k.label),
    gateFailures: profile.gateFailures,
    stages,
  };
}
