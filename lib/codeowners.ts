/**
 * CODEOWNERS generation (`docs/04-rbac.md §4.6`, ADAPTED: no gatekeeper).
 *
 * Generated at repository creation and regenerated when the lane changes. Maps
 * each stage artifact path to the authority that owns the corresponding gate.
 * Because gate passage always touches `README.md`, triage and the portfolio forum
 * are approvers on every progression.
 *
 * The spec's per-plant `@org/gatekeepers-<plant>` entries are removed with the
 * gatekeeper role; gate authority is unscoped (triage + portfolio forum). So,
 * unlike the spec, this no longer depends on the plant and does not regenerate on
 * plant change — only on lane change.
 *
 * This module GENERATES text. It never merges and grants no authority; the merge
 * is a human act enforced by the repository platform (constraint #1).
 */

import { type Lane } from "./types.js";

export interface CodeownersInput {
  /** Use-case identifier, e.g. "UC-2026-0041". */
  id: string;
  plant: string;
  lane: Lane;
  /** GitHub org / team namespace. Defaults to "org" → "@org/...". */
  org?: string;
}

interface OwnerLine {
  pattern: string;
  teams: string[];
}

/**
 * Path → owning teams. Ordered to mirror the lifecycle. Team slugs match the
 * adapted role set: du-triage, portfolio-forum, it-liaison, du-value.
 */
function ownerLines(): OwnerLine[] {
  return [
    { pattern: "README.md", teams: ["du-triage", "portfolio-forum"] },
    { pattern: "business-case.md", teams: ["portfolio-forum"] },
    { pattern: "poc/evaluation.md", teams: ["portfolio-forum"] },
    { pattern: "pilot/", teams: ["portfolio-forum"] },
    { pattern: "scale/", teams: ["portfolio-forum"] },
    { pattern: "rollout/", teams: ["portfolio-forum", "it-liaison"] },
    { pattern: "ops/handover.md", teams: ["it-liaison", "portfolio-forum"] },
    { pattern: "ops/value-tracking.md", teams: ["du-value"] },
  ];
}

/** Left-pad the pattern column so the file reads as an aligned table. */
function formatLine(pattern: string, teams: string[], org: string, width: number): string {
  const owners = teams.map((t) => `@${org}/${t}`).join(" ");
  return `${pattern.padEnd(width)} ${owners}`;
}

/** Generate the `.github/CODEOWNERS` contents for a use case. */
export function generateCodeowners(input: CodeownersInput): string {
  const org = input.org ?? "org";
  const lines = ownerLines();
  const width = Math.max(...lines.map((l) => l.pattern.length));

  const body = lines.map((l) => formatLine(l.pattern, l.teams, org, width)).join("\n");

  return [
    "# .github/CODEOWNERS — generated, do not edit",
    `# ${input.id} · plant ${input.plant} · lane ${input.lane}`,
    "",
    body,
    "",
  ].join("\n");
}
