/**
 * Aggregation: das Ein-Seiten-Prozess-Gesundheitsprofil — 1:1 nach Katalog A §6.
 *
 *   Kriterium → Dimension : arithmetisches Mittel der Kriterienstufen, eine
 *                           Nachkommastelle. Alle Kriterien einer Dimension gehen
 *                           gleichgewichtet ein; kein Kriterium darf ausgelassen
 *                           werden — **nicht beantwortbar = S1** (§1.3). D7: die
 *                           schlechteste Kernkomponente (§1.6).
 *   Dimension → Status    : Grün / Gelb / Rot über die Statuslogik (§6.2), nie über
 *                           einen Gesamtdurchschnitt.
 *   Portfolio-Wert        : Σ(Gewicht × Dimensionswert) (§6.1) — nur zur Reihung
 *                           mehrerer Prozesse, nie allein berichtet.
 *
 * Weil ein nicht erhobenes Kriterium per Konvention auf S1 steht, ist ein noch
 * nicht (oder kaum) erhobener Prozess rot — genau wie die Quelle es vorsieht. Der
 * Sonderstatus „grau" ist die einzige Nicht-Katalog-Ergänzung und gilt ausschließlich
 * für den Zustand VOR jeder Erhebung (0 Kriterien bewertet); sobald ein Kriterium
 * bewertet ist, greift §6.2 strikt.
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
  ratings: Record<string, Rating>;
  components?: Component[];
}

export interface DimensionResult {
  id: string;
  label: string;
  weight: number;
  /** 1..5, eine Nachkommastelle. Nicht erhobene Kriterien zählen als S1 (§1.3). */
  score: number;
  rated: number;
  total: number;
  covered: boolean;
  worstComponent?: string;
}

export interface KnockOutResult {
  id: string;
  label: string;
  koClass: "intake" | "optimisation";
  /** S-Stufe; ein nicht erhobenes K.o.-Kriterium steht auf S1 (§1.3). */
  level: Level;
  /** ob tatsächlich erhoben (sonst per Konvention S1). */
  rated: boolean;
  /** ≥S3 pass · S1 fail · S2 open (blockiert Grün, §6.2). */
  state: "pass" | "fail" | "open";
}

export type Status = "gruen" | "gelb" | "rot" | "grau";

export interface HealthProfile {
  dimensions: DimensionResult[];
  knockOuts: KnockOutResult[];
  status: Status;
  reason: string;
  portfolioValue: number; // Σ(Gewicht × Dimension), Reihung — immer definiert (§6.1)
  coverage: number; // 0..1 Anteil tatsächlich erhobener Kriterien
  ratedCount: number;
  totalCount: number;
  confidenceDominant: Confidence | null;
  directions: string[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Stufe eines Kriteriums, S1 (=1) wenn nicht erhoben (§1.3). */
function levelOr1(ratings: Record<string, Rating>, id: string): number {
  return ratings[id]?.level ?? 1;
}

function buildDimension(input: ProfileInput, dimId: string): DimensionResult {
  const def = DIMENSIONS.find((d) => d.id === dimId)!;
  const crit = criteriaOf(dimId);

  // D7: je Kernkomponente erhoben, die schlechteste bestimmt die Dimension (§1.6).
  if (crit.some((c) => c.perComponent)) {
    const comps = input.components && input.components.length ? input.components : [{ id: "_process", label: "(Prozess)", ratings: input.ratings }];
    let worst: { score: number; label: string } | null = null;
    for (const comp of comps) {
      const mean = round1(crit.reduce((a, c) => a + levelOr1(comp.ratings, c.id), 0) / crit.length);
      if (worst === null || mean < worst.score) worst = { score: mean, label: comp.label };
    }
    const ratedD7 = crit.filter((c) => comps.some((comp) => comp.ratings[c.id])).length;
    return {
      id: def.id, label: def.label, weight: def.weight,
      score: worst!.score, rated: ratedD7, total: crit.length, covered: ratedD7 >= crit.length,
      ...(comps.length > 1 && worst ? { worstComponent: worst.label } : {}),
    };
  }

  const score = round1(crit.reduce((a, c) => a + levelOr1(input.ratings, c.id), 0) / crit.length);
  const rated = crit.filter((c) => input.ratings[c.id] !== undefined).length;
  return { id: def.id, label: def.label, weight: def.weight, score, rated, total: crit.length, covered: rated >= crit.length };
}

function resolveKnockOut(input: ProfileInput, critId: string): KnockOutResult {
  const c = CRITERIA.find((x) => x.id === critId)!;
  const r = input.ratings[critId];
  const level = (r?.level ?? 1) as Level;
  const state: KnockOutResult["state"] = level === 1 ? "fail" : level >= 3 ? "pass" : "open";
  return { id: c.id, label: c.label, koClass: c.knockout!, level, rated: r !== undefined, state };
}

/** Richtungsvektor — Vorindikation nach §6.4 (indiziert die Zweigprüfung, entscheidet sie nicht). */
function directions(input: ProfileInput, dims: DimensionResult[]): string[] {
  const lv = (id: string) => levelOr1(input.ratings, id);
  const dim = (id: string) => dims.find((d) => d.id === id)!.score;
  const out: string[] = [];
  if (lv("K3.4") <= 2 && lv("K4.4") <= 2) out.push("Zweig 0 — Killen: konsumentenlose Schritte bei negativem Saldo (K3.4, K4.4).");
  if (lv("K5.1") <= 2 || lv("K2.2") <= 2) out.push("Zweig 1 — Interfaces (1b vor 1a): K5.1 oder K2.2 ≤ S2; Latenz zwischen den Schritten (K3.2 prüfen).");
  if (dim("D3") < 3 && dim("D2") >= 3) out.push("Zweig 2 — Prozessdesign: D3 niedrig bei D2 ≥ 3; Latenz in den Schritten, Schleifen/Nacharbeit.");
  if (lv("K7.1") <= 2 && dim("D2") >= 3) out.push("Zweig 3 — Toolbox-Evolution: Friktion in einem Schritt, K7.1 zeigt Iterationsstau.");
  if (dim("D8") < 2.5) out.push("Kein Zweig zuerst: Befähigung — D8 < 2,5, sonst wird das Literacy-Delta am Risiko-Tor zum Blocker.");
  if (dim("D6") < 3 && dims.filter((d) => d.id !== "D6").every((d) => d.score >= 3)) out.push("Feedback-Loop einbauen (Phase 5 vorziehen): der Prozess lebt von Gewohnheit, nicht von Steuerung.");
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

  const belowRed = dims.filter((d) => d.score < 2.0);
  const belowGreen = dims.filter((d) => d.score < 3.0);
  const koFail = knockOuts.filter((k) => k.state === "fail");
  const koS2 = knockOuts.filter((k) => k.state === "open");

  // Statuslogik §6.2 — strikt (nicht erhoben = S1). „grau" nur, wenn noch NICHTS erhoben ist.
  let status: Status;
  let reason: string;
  if (ratedCount === 0) {
    status = "grau";
    reason = "Noch nichts erhoben. Per Konvention (§1.3) stünde jedes Kriterium auf S1 — Erhebung starten.";
  } else if (koFail.length) {
    status = "rot";
    const un = koFail.filter((k) => !k.rated).map((k) => k.id);
    reason = `Mindestens ein K.o. auf S1: ${koFail.map((k) => `${k.id} ${k.label}`).join(", ")}${un.length ? ` (davon ${un.join(", ")} noch nicht erhoben)` : ""}. Optimierungsaussagen sind wertlos — erst Enabler, dann neu scoren.`;
  } else if (belowRed.length >= 2) {
    status = "rot";
    reason = `Mindestens zwei Dimensionen < 2,0: ${belowRed.map((d) => `${d.id} ${d.score}`).join(", ")}. Ein Ausreißer ist ein Befund, zwei sind ein Muster.`;
  } else if (knockOuts.every((k) => k.state === "pass") && dims.every((d) => d.score >= 3.0)) {
    status = "gruen";
    reason = "Alle K.o.-Kriterien ≥ S3 und alle Dimensionen ≥ 3,0 — läuft und ist steuerbar.";
  } else {
    status = "gelb";
    const bits: string[] = [];
    if (koS2.length) bits.push(`${koS2.map((k) => k.id).join(", ")} auf S2`);
    if (belowGreen.length) bits.push(`${belowGreen.map((d) => `${d.id} ${d.score}`).join(", ")} < 3,0`);
    reason = `Handlungsbedarf: ${bits.join("; ") || "unter Aufsicht"}. (${Math.round(coverage * 100)} % erhoben)`;
  }

  // Gewichteter Portfolio-Wert = Σ(Gewicht × Dimensionswert) (§6.1), nur zur Reihung.
  const portfolioValue = round1(dims.reduce((a, d) => a + d.weight * d.score, 0));

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
  grau: "Grau — nicht erhoben",
};
