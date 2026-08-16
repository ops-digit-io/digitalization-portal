/**
 * Technology decisions and scaling waves — the "what actually goes into rollout"
 * half of the IT/OT roadmap.
 *
 * Two registers, deliberately joined:
 *
 *   registry/technology.md   what was evaluated and DECIDED (assess → trial →
 *                            adopt / hold / retire)
 *   registry/rollout.md      what is being scaled, per wave × plant
 *
 * The join is the point. `unadoptedWaves()` reports every wave row whose
 * technology is not in the `adopt` ring, because an evaluation whose verdict is
 * not attached to a consequence is a blog post, and a rollout that scales
 * something nobody adopted is how a pilot becomes a fleet of one-offs.
 *
 * Note the ring `hold` is a RESULT, not a gap: "decides what really goes into the
 * rollout" is a claim about declining as much as adopting, so `declined()` is a
 * first-class query and the surface shows it.
 *
 * Pure: markdown in, data out. NEVER THROWS — a malformed row is kept and marked,
 * per `docs/BUILD.md`. Reading files is `lib/otx/source.ts`.
 */

import { parseFirstTable, columnIndex } from "../markdown.js";

// ---------------------------------------------------------------- vocabulary

/** Radar rings, outermost first. Only `adopt` may enter a wave. */
export const TECH_STATUSES = ["assess", "trial", "adopt", "hold", "retire"] as const;
export type TechStatus = (typeof TECH_STATUSES)[number];

/** Where a wave row stands. */
export const ROLLOUT_STATES = ["not-started", "scheduled", "in-progress", "live", "on-hold"] as const;
export type RolloutState = (typeof ROLLOUT_STATES)[number];

export interface TechRow {
  id: string;
  technology: string;
  layer: string;
  status: TechStatus | "";
  trialledAt: string;
  evidence: string;
  decision: string;
  decidedOn: string;
  decidedBy: string;
  supersedes: string;
  needsAttention: boolean;
  issues: string[];
}

export interface WaveRow {
  wave: string;
  capability: string;
  technology: string;
  plant: string;
  state: RolloutState | "";
  gate: string;
  owner: string;
  start: string;
  live: string;
  blocker: string;
  needsAttention: boolean;
  issues: string[];
}

function normalise(v: string | undefined): string {
  return (v ?? "").trim().toLowerCase();
}
function cell(cells: string[], idx: number): string {
  return idx < 0 ? "" : (cells[idx] ?? "").trim();
}

/** Rows of the first table as header→value lookups. Never throws. */
function rows(md: string | undefined): { get: (label: string) => string }[] {
  const table = parseFirstTable(md ?? "");
  if (!table || table.headers.length === 0) return [];
  const idx = new Map<string, number>();
  for (const h of table.headers) idx.set(h.trim().toLowerCase(), columnIndex(table.headers, h));
  return table.rows.map((cells) => ({
    get: (label: string) => cell(cells, idx.get(label.trim().toLowerCase()) ?? -1),
  }));
}

// ---------------------------------------------------------------- parsing

/** Parse `registry/technology.md`. */
export function parseTechnology(md: string | undefined): TechRow[] {
  return rows(md)
    .map((r) => {
      const issues: string[] = [];

      const id = r.get("ID");
      if (id === "") issues.push("no ID");

      const rawStatus = normalise(r.get("Status"));
      const status: TechStatus | "" = (TECH_STATUSES as readonly string[]).includes(rawStatus)
        ? (rawStatus as TechStatus)
        : "";
      if (status === "") issues.push(rawStatus === "" ? "no status" : `unreadable status "${rawStatus}"`);

      const decision = r.get("Decision");
      const decidedBy = r.get("Decided by");
      // A decided ring with nobody named is the failure this register exists to
      // prevent: "we adopted it" with no decider is a rumour, not a decision.
      if ((status === "adopt" || status === "hold" || status === "retire") && decidedBy === "") {
        issues.push(`status "${status}" with nobody named in "Decided by"`);
      }
      if ((status === "adopt" || status === "hold" || status === "retire") && decision === "") {
        issues.push(`status "${status}" with no decision recorded`);
      }

      return {
        id,
        technology: r.get("Technology"),
        layer: r.get("Layer"),
        status,
        trialledAt: r.get("Trialled at"),
        evidence: r.get("Evidence"),
        decision,
        decidedOn: r.get("Decided on"),
        decidedBy,
        supersedes: r.get("Supersedes"),
        needsAttention: issues.length > 0,
        issues,
      };
    })
    .filter((r) => r.id !== "" || r.technology !== "");
}

/** Parse `registry/rollout.md`. */
export function parseRollout(md: string | undefined): WaveRow[] {
  return rows(md)
    .map((r) => {
      const issues: string[] = [];

      const wave = r.get("Wave");
      if (wave === "") issues.push("no wave");

      const plant = r.get("Plant");
      if (plant === "") issues.push("no plant");

      const technology = r.get("Technology");
      if (technology === "") issues.push("no technology");

      const rawState = normalise(r.get("State"));
      const state: RolloutState | "" = (ROLLOUT_STATES as readonly string[]).includes(rawState)
        ? (rawState as RolloutState)
        : "";
      if (state === "") issues.push(rawState === "" ? "no state" : `unreadable state "${rawState}"`);

      return {
        wave,
        capability: r.get("Capability"),
        technology,
        plant,
        state,
        gate: r.get("Gate"),
        owner: r.get("Owner"),
        start: r.get("Start"),
        live: r.get("Live"),
        blocker: r.get("Blocker"),
        needsAttention: issues.length > 0,
        issues,
      };
    })
    .filter((r) => r.wave !== "" || r.plant !== "");
}

// ---------------------------------------------------------------- the join

export interface Violation {
  wave: WaveRow;
  /** The technology's ring, or `null` when the wave names one the register does not hold. */
  status: TechStatus | null;
  reason: string;
}

/**
 * THE INVARIANT: a wave may only scale a technology in the `adopt` ring.
 *
 * Returns every row that breaks it. An empty array is the healthy state and is
 * what the surface asserts; anything else is a governance finding, not a warning.
 */
export function unadoptedWaves(waves: readonly WaveRow[], tech: readonly TechRow[]): Violation[] {
  const byId = new Map(tech.filter((t) => t.id !== "").map((t) => [t.id, t]));
  const out: Violation[] = [];
  for (const w of waves) {
    if (w.technology === "") continue; // already flagged as unreadable by the parser
    const t = byId.get(w.technology);
    if (t === undefined) {
      out.push({ wave: w, status: null, reason: `technology "${w.technology}" is not in the evaluation register` });
      continue;
    }
    if (t.status !== "adopt") {
      out.push({
        wave: w,
        status: t.status === "" ? null : t.status,
        reason: `technology "${w.technology}" is "${t.status || "unreadable"}", not "adopt" — nothing scales before it is decided`,
      });
    }
  }
  return out;
}

/** Technologies deliberately not pursued. The evidence for deciding what stays out. */
export function declined(tech: readonly TechRow[]): TechRow[] {
  return tech.filter((t) => t.status === "hold" || t.status === "retire");
}

/** The register grouped into its rings, in ring order. */
export function byRing(tech: readonly TechRow[]): { status: TechStatus; items: TechRow[] }[] {
  return TECH_STATUSES.map((status) => ({ status, items: tech.filter((t) => t.status === status) }));
}

// ---------------------------------------------------------------- adoption

export interface WaveProgress {
  wave: string;
  rows: number;
  live: number;
  inProgress: number;
  onHold: number;
  /** Share of the wave's rows that are live, 0…100. */
  percent: number;
  /** Rows carrying a named blocker. */
  blocked: number;
}

/** Progress per wave, in wave order. */
export function waveProgress(waves: readonly WaveRow[]): WaveProgress[] {
  const names = [...new Set(waves.map((w) => w.wave).filter((w) => w !== ""))].sort();
  return names.map((wave) => {
    const mine = waves.filter((w) => w.wave === wave);
    const live = mine.filter((w) => w.state === "live").length;
    return {
      wave,
      rows: mine.length,
      live,
      inProgress: mine.filter((w) => w.state === "in-progress").length,
      onHold: mine.filter((w) => w.state === "on-hold").length,
      percent: mine.length === 0 ? 0 : Math.round((live / mine.length) * 100),
      blocked: mine.filter((w) => w.blocker !== "").length,
    };
  });
}

export interface PlantAdoption {
  plant: string;
  rows: number;
  live: number;
  percent: number;
  blockers: string[];
}

/** Adoption per plant, least adopted first — the plants the roadmap owes work to. */
export function adoptionByPlant(waves: readonly WaveRow[]): PlantAdoption[] {
  const codes = [...new Set(waves.map((w) => w.plant).filter((p) => p !== ""))];
  return codes
    .map((plant) => {
      const mine = waves.filter((w) => w.plant === plant);
      const live = mine.filter((w) => w.state === "live").length;
      return {
        plant,
        rows: mine.length,
        live,
        percent: mine.length === 0 ? 0 : Math.round((live / mine.length) * 100),
        blockers: [...new Set(mine.map((w) => w.blocker).filter((b) => b !== ""))],
      };
    })
    .sort((a, b) => a.percent - b.percent || b.blockers.length - a.blockers.length || (a.plant < b.plant ? -1 : 1));
}

export interface RolloutSummary {
  technologies: number;
  adopted: number;
  declinedCount: number;
  waves: number;
  waveRows: number;
  live: number;
  blocked: number;
  violations: number;
  needsAttention: number;
}

export function summariseRollout(tech: readonly TechRow[], waves: readonly WaveRow[]): RolloutSummary {
  return {
    technologies: tech.length,
    adopted: tech.filter((t) => t.status === "adopt").length,
    declinedCount: declined(tech).length,
    waves: new Set(waves.map((w) => w.wave).filter((w) => w !== "")).size,
    waveRows: waves.length,
    live: waves.filter((w) => w.state === "live").length,
    blocked: waves.filter((w) => w.blocker !== "").length,
    violations: unadoptedWaves(waves, tech).length,
    needsAttention: tech.filter((t) => t.needsAttention).length + waves.filter((w) => w.needsAttention).length,
  };
}
