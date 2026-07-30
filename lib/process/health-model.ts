/**
 * Aggregation: the one-page Prozess-Gesundheitsprofil (source doc A §6).
 *
 *   Kriterium → Dimension : arithmetic mean of the criterion S-levels (1 dp).
 *                           D7 is the WORST Kernkomponente (§1.6).
 *   Dimension → Status    : Grün / Gelb / Rot via the status logic (§6.2), never
 *                           a single overall average.
 *   Portfolio value       : Σ(weight × dimension) — for ranking only, never alone.
 *
 * Two rules carried from the catalogue: a knock-out overrides every weight (§5),
 * and the profile is never one number (§6). Faithful-but-usable choice for a live
 * assessment: dimension scores are computed over the RATED criteria and coverage
 * is reported; a knock-out or two weak dimensions turn it red on partial evidence,
 * but GREEN requires full coverage — bad news counts early, good news must be paid
 * for. (The catalogue's "unbeantwortbar = S1" applies to the final, fully-rated
 * profile, which this reproduces once coverage is complete.)
 */

import { CRITERIA, DIMENSIONS, KNOCKOUTS, criteriaOf, type Level, type Confidence } from "./criteria";

export interface Rating {
  level: Level; // 1..5 (S1..S5)
  confidence?: Confidence;
  evidence?: string;
}

export interface Component {
  id: string;
  label: string;
  ratings: Record<string, Rating>; // D7 criteria for this component
}

export interface ProfileInput {
  /** Ratings for non-per-component criteria, keyed by criterion id. */
  ratings: Record<string, Rating>;
  /** Kernkomponenten carrying the D7 ratings; the worst sets D7. */
  components?: Component[];
}

export interface DimensionResult {
  id: string;
  label: string;
  weight: number;
  score: number | null; // 1..5, one decimal, over rated criteria; null if none rated
  rated: number;
  total: number;
  covered: boolean;
  /** D7 only: which component set the (worst) score. */
  worstComponent?: string;
}

export interface KnockOutResult {
  id: string;
  label: string;
  koClass: "intake" | "optimisation";
  level: Level | null; // null = not yet rated
  state: "pass" | "fail" | "open"; // ≥S3 pass, S1 fail, else open
}

export type Status = "gruen" | "gelb" | "rot" | "grau";

export interface HealthProfile {
  dimensions: DimensionResult[];
  knockOuts: KnockOutResult[];
  status: Status;
  reason: string;
  portfolioValue: number | null; // weighted, ranking only
  coverage: number; // 0..1 share of criteria rated
  ratedCount: number;
  totalCount: number;
  confidenceDominant: Confidence | null;
  directions: string[]; // Richtungsvektor vorindikationen
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Level of a non-per-component criterion, or null if unrated. */
function levelOf(input: ProfileInput, id: string): Level | null {
  const r = input.ratings[id];
  return r ? r.level : null;
}

/** Mean over rated criteria in a set; null if none rated. */
function meanRated(levels: (Level | null)[]): { score: number | null; rated: number; total: number } {
  const vals = levels.filter((l): l is Level => l !== null);
  return { score: vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : null, rated: vals.length, total: levels.length };
}

function buildDimension(input: ProfileInput, dimId: string): DimensionResult {
  const def = DIMENSIONS.find((d) => d.id === dimId)!;
  const crit = criteriaOf(dimId);

  // D7 is per Kernkomponente: worst component's mean sets the dimension.
  if (crit.some((c) => c.perComponent)) {
    const comps = input.components && input.components.length ? input.components : [{ id: "_process", label: "(Prozess)", ratings: input.ratings }];
    let worst: { score: number | null; label: string } | null = null;
    for (const comp of comps) {
      const levels = crit.map((c) => (comp.ratings[c.id] ? comp.ratings[c.id]!.level : null));
      const m = meanRated(levels);
      if (m.score !== null && (worst === null || worst.score === null || m.score < worst.score)) {
        worst = { score: m.score, label: comp.label };
      }
    }
    // Coverage counts distinct criteria: a D7 criterion is "rated" if rated in ≥1 component.
    const ratedD7 = crit.filter((c) => comps.some((comp) => comp.ratings[c.id])).length;
    return {
      id: def.id, label: def.label, weight: def.weight,
      score: worst ? worst.score : null, rated: ratedD7, total: crit.length,
      covered: ratedD7 >= crit.length,
      ...(worst && worst.score !== null ? { worstComponent: worst.label } : {}),
    };
  }

  const m = meanRated(crit.map((c) => levelOf(input, c.id)));
  return { id: def.id, label: def.label, weight: def.weight, score: m.score, rated: m.rated, total: m.total, covered: m.rated >= m.total };
}

function resolveKnockOut(input: ProfileInput, critId: string): KnockOutResult {
  const c = CRITERIA.find((x) => x.id === critId)!;
  const level = levelOf(input, critId);
  const state: KnockOutResult["state"] = level === null ? "open" : level === 1 ? "fail" : level >= 3 ? "pass" : "open";
  return { id: c.id, label: c.label, koClass: c.knockout!, level, state };
}

/** Richtungsvektor — evaluable approximations of doc A §6.4 (hints, not decisions). */
function directions(input: ProfileInput, dims: DimensionResult[]): string[] {
  const lv = (id: string) => levelOf(input, id);
  const dim = (id: string) => dims.find((d) => d.id === id)?.score ?? null;
  const out: string[] = [];
  const le = (v: Level | null, n: number) => v !== null && v <= n;
  const dle = (v: number | null, n: number) => v !== null && v < n;
  const dge = (v: number | null, n: number) => v !== null && v >= n;

  if (le(lv("K3.4"), 2) && le(lv("K4.4"), 2)) out.push("Zweig 0 — Killen: konsumentenlose Schritte bei negativem Saldo.");
  if (le(lv("K5.1"), 2) || le(lv("K2.2"), 2)) out.push("Zweig 1 — Interfaces (1b vor 1a): Messlücke oder Zugang blockiert.");
  if (dle(dim("D3"), 3) && dge(dim("D2"), 3)) out.push("Zweig 2 — Prozessdesign: Fluss schwach trotz tragender Toolchain.");
  if (le(lv("K7.1"), 2) && dge(dim("D2"), 3)) out.push("Zweig 3 — Toolbox-Evolution: Iterationsstau auf der Komponente.");
  if (dle(dim("D8"), 2.5) && resolveKnockOut(input, "K8.1").state !== "fail") out.push("Befähigung zuerst: D8 < 2,5 — sonst wird das Literacy-Delta am Risiko-Tor zum Blocker.");
  if (dle(dim("D6"), 3) && dims.every((d) => d.score === null || d.score >= 3)) out.push("Feedback-Loop einbauen (Phase 5 vorziehen): lebt von Gewohnheit, nicht von Steuerung.");
  return out;
}

export function healthProfile(input: ProfileInput): HealthProfile {
  const dims = DIMENSIONS.map((d) => buildDimension(input, d.id));
  const knockOuts = KNOCKOUTS.map((k) => resolveKnockOut(input, k.id));

  const comps = input.components ?? [];
  const perCompRated = (id: string) => (comps.length ? comps.some((c) => c.ratings[id]) : input.ratings[id] !== undefined);
  const totalCount = CRITERIA.length;
  const ratedCount = CRITERIA.filter((c) => (c.perComponent ? perCompRated(c.id) : input.ratings[c.id] !== undefined)).length;
  const coverage = totalCount ? ratedCount / totalCount : 0;

  const scored = dims.filter((d) => d.score !== null) as (DimensionResult & { score: number })[];
  const belowRed = scored.filter((d) => d.score < 2.0);
  const koFail = knockOuts.filter((k) => k.state === "fail");
  const koOpen = knockOuts.filter((k) => k.state === "open");
  const weakDims = scored.filter((d) => d.score < 3.0);

  // Status logic (doc A §6.2), with GREEN gated on full coverage.
  let status: Status;
  let reason: string;
  if (koFail.length) {
    status = "rot";
    reason = `K.o. auf S1: ${koFail.map((k) => k.label).join(", ")}. Optimierungsaussagen sind wertlos — erst Enabler, dann neu scoren.`;
  } else if (belowRed.length >= 2) {
    status = "rot";
    reason = `${belowRed.length} Dimensionen < 2,0 (${belowRed.map((d) => d.id).join(", ")}). Zwei sind ein Muster, nicht ein Ausreißer.`;
  } else if (!scored.length) {
    status = "grau";
    reason = "Noch nichts bewertet.";
  } else if (coverage >= 1 && knockOuts.every((k) => k.state === "pass") && scored.every((d) => d.score >= 3.0)) {
    status = "gruen";
    reason = "Alle K.o.-Kriterien ≥ S3, alle Dimensionen ≥ 3,0 — gesund und steuerbar.";
  } else {
    status = "gelb";
    const bits: string[] = [];
    if (koOpen.length) bits.push(`${koOpen.length} K.o. offen/S2`);
    if (weakDims.length) bits.push(`${weakDims.map((d) => `${d.id} ${d.score}`).join(", ")} < 3,0`);
    if (coverage < 1) bits.push(`Abdeckung ${Math.round(coverage * 100)} %`);
    reason = `Handlungsbedarf: ${bits.join("; ") || "unter Aufsicht gesund"}.`;
  }

  // Weighted portfolio value (ranking only).
  let wSum = 0;
  let acc = 0;
  for (const d of scored) {
    wSum += d.weight;
    acc += d.weight * d.score;
  }
  const portfolioValue = wSum ? round1(acc / wSum) : null;

  // Dominant confidence label across quantitative ratings.
  const confs = Object.values(input.ratings).map((r) => r.confidence).filter((c): c is Confidence => !!c);
  const counts: Record<string, number> = {};
  for (const c of confs) counts[c] = (counts[c] || 0) + 1;
  const confidenceDominant = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as Confidence) ?? null;

  return {
    dimensions: dims,
    knockOuts,
    status,
    reason,
    portfolioValue,
    coverage: Math.round(coverage * 100) / 100,
    ratedCount,
    totalCount,
    confidenceDominant,
    directions: directions(input, dims),
  };
}

export const STATUS_LABEL: Record<Status, string> = {
  gruen: "Grün — gesund",
  gelb: "Gelb — Handlungsbedarf",
  rot: "Rot — krank",
  grau: "Grau — nicht bewertet",
};
