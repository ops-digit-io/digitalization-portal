/**
 * Short-form self-assessment as an intake pre-filter (catalogue A §7.3, flow B §7).
 *
 * Seven criteria a spoke rates roughly on its own — cheap, parallelisable, scales
 * to the whole plant. They cover the three knock-outs, the business link and the
 * data situation; triage needs no more. The full assessment checks them (a
 * systematic gap between self-image and finding is itself a D8 finding).
 *
 * The pre-filter runs BEFORE intake: only what passes it gets hub time.
 *
 * `triage()` returns a language-neutral verdict (a recommendation plus warning
 * codes); the display language is applied in the UI via `lib/process/content`.
 */

import { SELF_ASSESSMENT, byId, type Level } from "./criteria";

export const SELF_CRITERIA = SELF_ASSESSMENT.map((id) => byId[id]!);

export type Recommendation = "aufnehmen" | "enabler" | "zurueckstellen" | "selbsthilfe";

/** Non-blocking findings surfaced for the intake conversation (localised in the UI). */
export type WarnCode = "no-goal" | "thin-value" | "no-map" | "no-leadtime";

export interface Triage {
  recommendation: Recommendation;
  warnings: WarnCode[];
  /** For the enabler case: which optimisation knock-out(s) sit at level 1. */
  enablerWhich: ("K5.1" | "K2.2")[];
  /** Coverage: how many of the seven have been rated. */
  rated: number;
  total: number;
}

/**
 * Triage from the seven self-rated levels. The hard gate is the spoke (K8.1):
 * no spoke → no intake. An optimisation knock-out (K5.1/K2.2 = level 1) means
 * intake only as an enabler. An otherwise healthy, well-understood picture can go
 * to self-help with a playbook. Everything else is admitted.
 */
export function triage(levels: Record<string, Level | undefined>): Triage {
  const L = (id: string) => levels[id];
  const rated = SELF_ASSESSMENT.filter((id) => L(id) !== undefined).length;
  const total = SELF_ASSESSMENT.length;

  const warnings: WarnCode[] = [];
  if (L("K4.1") === 1) warnings.push("no-goal");
  if ((L("K4.4") ?? 5) <= 2) warnings.push("thin-value");
  if ((L("K1.1") ?? 5) <= 2) warnings.push("no-map");
  if ((L("K3.1") ?? 5) <= 2) warnings.push("no-leadtime");

  const spoke = L("K8.1");
  if (spoke === 1) {
    return { recommendation: "zurueckstellen", warnings, enablerWhich: [], rated, total };
  }

  const ts = L("K5.1");
  const iface = L("K2.2");
  if (ts === 1 || iface === 1) {
    const enablerWhich: ("K5.1" | "K2.2")[] = [];
    if (ts === 1) enablerWhich.push("K5.1");
    if (iface === 1) enablerWhich.push("K2.2");
    return { recommendation: "enabler", warnings, enablerWhich, rated, total };
  }

  // Otherwise healthy and well-understood → the spoke can carry it with a playbook.
  const healthy =
    (spoke ?? 0) >= 4 &&
    (L("K5.1") ?? 0) >= 4 && (L("K2.2") ?? 0) >= 4 &&
    (L("K1.1") ?? 0) >= 4 && (L("K3.1") ?? 0) >= 4 && (L("K4.1") ?? 0) >= 4;
  if (rated === total && healthy) {
    return { recommendation: "selbsthilfe", warnings, enablerWhich: [], rated, total };
  }

  return { recommendation: "aufnehmen", warnings, enablerWhich: [], rated, total };
}
