/**
 * The advisory layer — everything that sits ABOVE the anamnesis. Ported verbatim
 * from PDT (`backend/config/advisory.js`).
 *
 * A section artefact is ESTABLISHED REALITY: a named human said it. An advisory
 * artefact is DERIVED PROPOSAL: a machine (or a consultant) worked it out from
 * that reality. They are separate artefacts, separately stored, separately
 * rendered, and every proposal carries an explicit verdict — accepted or
 * rejected, with a reason.
 */

export interface AdvisoryItem {
  key: string;
  label: string;
  order: number;
  file: string;
  icon: string;
  description: string;
  needs: string[];
}

export const ADVISORY: AdvisoryItem[] = [
  {
    key: "challenge",
    label: "Challenge",
    order: 1,
    file: "A1-challenge.md",
    icon: "?",
    description:
      "Critical questions back at the anamnesis: what is missing, what is evidenced too " +
      "softly, what should additionally be tracked — and what would happen if this " +
      "sub-process did not exist at all.",
    needs: ["profile", "purpose", "mapping", "flow"],
  },
  {
    key: "clusters",
    label: "Problem clusters",
    order: 2,
    file: "A2-clusters.md",
    icon: "▣",
    description:
      "The findings from all sections, clustered and ranked by severity, in one place. " +
      "Individual findings scattered across fourteen artefacts hide the pattern.",
    needs: ["mapping", "toolchain", "flow", "diagnostics"],
  },
  {
    key: "improvements",
    label: "Improvement ideas",
    order: 3,
    file: "A3-improvements.md",
    icon: "↑",
    description:
      "Proposals for the process itself, for the KPI design, and for KPI calibration — " +
      "each with its trade-off stated, not just its upside.",
    needs: ["flow", "kpi", "diagnostics"],
  },
  {
    key: "target-tech",
    label: "Target technology map",
    order: 4,
    file: "A4-target-tech.md",
    icon: "→",
    description:
      "Today → transition or quick win → target technology, per process step, justified " +
      "against the tool playbook and restricted to assets the organisation already " +
      "trusts and can operate.",
    needs: ["toolchain", "literacy", "cost-of-change"],
  },
];

export const byKey: Record<string, AdvisoryItem> = Object.fromEntries(ADVISORY.map((a) => [a.key, a]));

export function ordered(): AdvisoryItem[] {
  return [...ADVISORY].sort((a, b) => a.order - b.order);
}

/**
 * Advisory work on a half-empty anamnesis produces confident nonsense, so each
 * item declares which sections it needs.
 */
export function readiness(a: AdvisoryItem, filledKeys: string[]): { ready: boolean; missing: string[] } {
  const have = new Set(filledKeys);
  const missing = a.needs.filter((k) => !have.has(k));
  return { ready: missing.length === 0, missing };
}
