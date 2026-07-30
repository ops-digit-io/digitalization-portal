/**
 * score-model.ts — section scores → dimension profile → traffic light → priority.
 * Ported verbatim from PDT (`backend/services/scoreModel.js`). The methodology
 * and every threshold are unchanged.
 *
 * Two rules govern the whole file:
 *   1. A knock-out dominates the colour instead of being averaged into it.
 *   2. Bad news counts on partial evidence; good news does not.
 *
 * Nothing here throws on bad input. A missing section is "not assessed", which is
 * a different statement from "assessed and bad", kept apart everywhere.
 */

import { SECTIONS } from "./sections";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------- dimensions
export const DIMENSIONS = [
  {
    key: "visibility",
    label: "Visibility",
    weight: 30,
    question: "Can we see what this process does, at step level, without asking anyone?",
    sections: { diagnostics: 45, kpi: 35, mapping: 20 } as Record<string, number>,
  },
  {
    key: "shippability",
    label: "Shippability",
    weight: 25,
    question: "Can a value increment land on this process inside one iteration cycle?",
    sections: { increment: 35, diagnosis: 20, iteration: 20, "cost-of-change": 15, toolchain: 10 } as Record<string, number>,
  },
  {
    key: "carry",
    label: "Organisational carry",
    weight: 20,
    question: "Will the change still be in use in six months?",
    sections: { literacy: 45, knowledge: 30, profile: 25 } as Record<string, number>,
  },
  {
    key: "health",
    label: "Process health",
    weight: 15,
    question: "Does the process do its job today, on a chain that does not break?",
    sections: { flow: 35, toolchain: 25, purpose: 20, mapping: 20 } as Record<string, number>,
  },
  {
    key: "value",
    label: "Addressable value",
    weight: 10,
    question: "Is there enough on the other side to be worth a cycle?",
    sections: { "business-case": 50, increment: 30, purpose: 20 } as Record<string, number>,
  },
];

// ---------------------------------------------------------------- knock-outs
export const KNOCK_OUTS = [
  {
    key: "spoke",
    label: "Responsible spoke",
    statement: "A named person in the business can decide a change to this process.",
    gateSection: "profile",
    flags: ["spoke"],
    consequence: "No intake. A process the business staffs nobody for is not important enough to the business.",
  },
  {
    key: "timestamps",
    label: "Timestamps obtainable",
    statement: "Timestamps can be farmed — from systems, from exhaust data, or by sampling.",
    gateSection: "diagnostics",
    flags: ["timestamps"],
    consequence: "No diagnosis and no business case. The only admissible work is making the process measurable.",
  },
  {
    key: "interface-access",
    label: "Interfaces accessible",
    statement: "The data of the involved systems can be read out — API, export, or an agreed route.",
    gateSection: "toolchain",
    flags: ["interface-access", "interfaces", "interfaceAccess"],
    consequence: "The toolbox and interface branches are dead. First intervention: obtain or negotiate access.",
  },
];

// --------------------------------------------------------------- the gates
let GATE_SECTIONS: string[] = ["profile", "purpose", "diagnostics", "cost-of-change", "diagnosis", "increment", "business-case"];
{
  const live = SECTIONS.filter((s) => s && s.gate).map((s) => s.key);
  if (live.length) GATE_SECTIONS = live;
}

// ---------------------------------------------------------------- thresholds
export const THRESHOLDS = {
  dimensionAssessed: 0.5,
  greenDimensionFloor: 60,
  redDimensionFloor: 40,
  redVisibilityFloor: 30,
  greenCoverage: 0.8,
  greyCoverage: 0.25,
  koEvidenceFloor: 40,
};

export const CONFIDENCE_DISCOUNT: Record<string, number> = { I: 1.0, P: 0.8, S: 0.5 };
export const COST_FACTOR: Record<string, number> = { "CC-A": 1, "CC-B": 2, "CC-C": 4, "CC-D": 8 };
const COMPOUNDING_STEP = 0.5;
const COMPOUNDING_CAP = 4;

// ------------------------------------------------------------------- helpers
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Accepts a bare number, a grader result object, or junk. Junk becomes null. */
function coerceScore(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") {
    if (Array.isArray(v)) return null;
    return coerceScore(v.score);
  }
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return clamp(Math.round(n), 0, 100);
}

/** Accepts true/false, null, {passed:…}. Anything else is "no verdict". */
function coerceVerdict(v: any): boolean | null {
  if (v === true || v === false) return v;
  if (v && typeof v === "object" && (v.passed === true || v.passed === false)) return v.passed;
  return null;
}

function num(v: any, fallback: any): any {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function plainObject(v: any): any {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

/** Every section key the model reads, in dimension order. */
function knownSections(): string[] {
  const out: string[] = [];
  for (const d of DIMENSIONS) for (const k of Object.keys(d.sections)) if (!out.includes(k)) out.push(k);
  return out;
}

// ------------------------------------------------------------- the profile
function buildDimension(def: any, scores: any): any {
  let weightTotal = 0;
  let weightAssessed = 0;
  let acc = 0;
  const sections: any = {};
  const missing: string[] = [];

  for (const [key, w] of Object.entries(def.sections) as [string, number][]) {
    weightTotal += w;
    const s = coerceScore(scores[key]);
    sections[key] = s;
    if (s === null) {
      missing.push(key);
      continue;
    }
    weightAssessed += w;
    acc += w * s;
  }

  const coverage = weightTotal ? weightAssessed / weightTotal : 0;
  return {
    key: def.key,
    label: def.label,
    question: def.question,
    weight: def.weight,
    score: weightAssessed ? Math.round(acc / weightAssessed) : null,
    coverage: round2(coverage),
    assessed: coverage >= THRESHOLDS.dimensionAssessed,
    sections,
    missing,
  };
}

function resolveKnockOut(def: any, gates: any, scores: any): any {
  let verdict: boolean | null = null;
  let source: string | null = null;
  for (const key of [...def.flags, def.gateSection]) {
    if (!(key in gates)) continue;
    const v = coerceVerdict(gates[key]);
    if (v !== null) {
      verdict = v;
      source = key;
      break;
    }
  }

  const base = (d: any) => ({ key: d.key, label: d.label, statement: d.statement, consequence: d.consequence });

  if (verdict === true) return { ...base(def), state: "pass", source, note: `recorded verdict on "${source}"` };
  if (verdict === false) return { ...base(def), state: "fail", source, note: `recorded verdict on "${source}"` };

  const backing = coerceScore(scores[def.gateSection]);
  if (backing === null) return { ...base(def), state: "unknown", source: null, note: `${def.gateSection} not assessed` };
  if (backing < THRESHOLDS.koEvidenceFloor) {
    return {
      ...base(def),
      state: "unknown",
      source: def.gateSection,
      note: `${def.gateSection} scored ${backing} — the artefact does not carry the evidence`,
    };
  }
  return {
    ...base(def),
    state: "unknown",
    source: def.gateSection,
    note: `${def.gateSection} scored ${backing}, but no gate verdict has been recorded`,
  };
}

/**
 * The dimension profile.
 * @param sectionScores 0..100 per section key. Absent = "not assessed", never zero.
 * @param gateResults recorded gate verdicts by section key, plus optional direct
 *        knock-out flags ("interface-access", "timestamps", "spoke").
 */
export function scoreProfile(sectionScores: any, gateResults: any): any {
  const scores = plainObject(sectionScores);
  const gates = plainObject(gateResults);

  const dimensions: any = {};
  for (const def of DIMENSIONS) dimensions[def.key] = buildDimension(def, scores);

  const knockOuts = KNOCK_OUTS.map((def) => resolveKnockOut(def, gates, scores));

  let coverage = 0;
  for (const d of Object.values(dimensions) as any[]) coverage += (d.weight / 100) * d.coverage;

  let wSum = 0;
  let acc = 0;
  for (const d of Object.values(dimensions) as any[]) {
    if (!d.assessed || d.score === null) continue;
    wSum += d.weight;
    acc += d.weight * d.score;
  }

  const koGateSections = KNOCK_OUTS.map((k) => k.gateSection);
  const gateVerdicts: any = {};
  const gateFailures: string[] = [];
  for (const key of GATE_SECTIONS) {
    const v = coerceVerdict(gates[key]);
    gateVerdicts[key] = v;
    if (v === false && !koGateSections.includes(key)) gateFailures.push(key);
  }

  const all = knownSections();
  const notAssessed = all.filter((k) => coerceScore(scores[k]) === null);
  const unknownSections = Object.keys(scores).filter((k) => !all.includes(k) && !GATE_SECTIONS.includes(k));

  return {
    dimensions,
    knockOuts,
    gateVerdicts,
    gateFailures,
    overall: wSum ? Math.round(acc / wSum) : null,
    coverage: round2(coverage),
    sectionsAssessed: all.length - notAssessed.length,
    sectionsTotal: all.length,
    notAssessed,
    unknownSections,
    thresholds: { ...THRESHOLDS },
  };
}

// -------------------------------------------------------------- the light
/**
 * One colour, and the reason for it in words a plant manager can check.
 */
export function trafficLight(profile: any): any {
  if (!profile || typeof profile !== "object" || !profile.dimensions) {
    return { light: "grey", reason: "No profile could be computed.", detail: {}, drivers: [] };
  }

  const dims = Object.values(profile.dimensions) as any[];
  const kos = Array.isArray(profile.knockOuts) ? profile.knockOuts : [];
  const failed = kos.filter((k: any) => k.state === "fail");
  const unknown = kos.filter((k: any) => k.state === "unknown");
  const passed = kos.filter((k: any) => k.state === "pass");
  const coverage = num(profile.coverage, 0);

  const detail: any = {};
  for (const d of dims) {
    detail[d.label] =
      d.score === null ? "not assessed" : `${d.score}${d.assessed ? "" : ` (partial, ${Math.round(d.coverage * 100)} % of evidence)`}`;
  }
  detail["Knock-outs"] =
    `${passed.length} of ${kos.length} cleared` +
    (failed.length ? `, ${failed.length} failed` : "") +
    (unknown.length ? `, ${unknown.length} open` : "");
  detail.Coverage = `${Math.round(coverage * 100)} % of the model assessed`;
  if (Array.isArray(profile.notAssessed) && profile.notAssessed.length) {
    detail["Not assessed"] = profile.notAssessed.join(", ");
  }

  const drivers: string[] = [];

  if (failed.length) {
    for (const k of failed) drivers.push(`${k.label}: failed — ${k.consequence}`);
    return {
      light: "red",
      reason:
        failed.length === 1
          ? `Knock-out failed: ${failed[0].label.toLowerCase()}. ${failed[0].consequence}`
          : `${failed.length} knock-outs failed: ${failed.map((k: any) => k.label.toLowerCase()).join(", ")}.`,
      detail,
      drivers,
      knockOutDriven: true,
    };
  }

  const scored = dims.filter((d) => d.score !== null);
  const below = scored.filter((d) => d.score < THRESHOLDS.redDimensionFloor);
  const vis = profile.dimensions.visibility;

  if (vis && vis.score !== null && vis.score < THRESHOLDS.redVisibilityFloor) {
    drivers.push(`Visibility ${vis.score} — below ${THRESHOLDS.redVisibilityFloor}; no increment could be read.`);
    return {
      light: "red",
      reason: `Visibility is ${vis.score}. Nothing shipped on this process could be read, so nothing can be improved on evidence.`,
      detail,
      drivers,
      knockOutDriven: false,
    };
  }
  if (below.length >= 2) {
    for (const d of below) drivers.push(`${d.label} ${d.score} — below ${THRESHOLDS.redDimensionFloor}.`);
    return {
      light: "red",
      reason: `${below.length} dimensions below ${THRESHOLDS.redDimensionFloor}: ${below
        .map((d) => d.label.toLowerCase())
        .join(", ")}. One is a finding; two are a pattern.`,
      detail,
      drivers,
      knockOutDriven: false,
    };
  }

  if (coverage < THRESHOLDS.greyCoverage) {
    return {
      light: "grey",
      reason:
        coverage === 0
          ? "Not assessed. No section has been filled in yet."
          : `Not assessed. Only ${Math.round(coverage * 100)} % of the model is backed by an artefact.`,
      detail,
      drivers: [],
      knockOutDriven: false,
    };
  }

  const unassessedDims = dims.filter((d) => !d.assessed);
  const weakDims = scored.filter((d) => d.score < THRESHOLDS.greenDimensionFloor);
  const gateFailures = Array.isArray(profile.gateFailures) ? profile.gateFailures : [];
  const greenBlockers: string[] = [];
  if (gateFailures.length) greenBlockers.push(`gate failed and not yet re-run: ${gateFailures.join(", ")}`);
  if (unknown.length) greenBlockers.push(`${unknown.length} knock-out(s) without a recorded verdict`);
  if (unassessedDims.length) greenBlockers.push(`${unassessedDims.map((d) => d.label.toLowerCase()).join(", ")} not sufficiently assessed`);
  if (weakDims.length) greenBlockers.push(`${weakDims.map((d) => `${d.label.toLowerCase()} ${d.score}`).join(", ")} below ${THRESHOLDS.greenDimensionFloor}`);
  if (coverage < THRESHOLDS.greenCoverage) greenBlockers.push(`coverage ${Math.round(coverage * 100)} % below ${Math.round(THRESHOLDS.greenCoverage * 100)} %`);

  if (!greenBlockers.length) {
    return {
      light: "green",
      reason: "All three knock-outs cleared, every dimension assessed and at or above the green floor.",
      detail,
      drivers: [`Weakest dimension: ${weakest(scored)}`],
      knockOutDriven: false,
    };
  }

  return {
    light: "amber",
    reason: `Work to do: ${greenBlockers.join("; ")}.`,
    detail,
    drivers: greenBlockers,
    knockOutDriven: false,
  };
}

function weakest(scored: any[]): string {
  if (!scored.length) return "none scored";
  const w = scored.reduce((a, b) => (a.score <= b.score ? a : b));
  return `${w.label} ${w.score}`;
}

// ------------------------------------------------------------- cost of change
/**
 * The class rule from the cost-of-change coaching prompt, in code so the portal
 * and the conversation cannot drift apart. First rule that fires decides.
 */
export function classFromFactors(factors: any): any {
  const f = plainObject(factors);
  const risk = num(f.risk, null);
  const vals = ["risk", "effort", "friction", "durability"]
    .map((k) => num(f[k], null))
    .filter((v) => v !== null)
    .map((v) => clamp(Math.round(v), 1, 4));

  if (vals.length < 4) return { class: null, rule: "incomplete — fewer than four factors given", missing: 4 - vals.length };

  const fours = vals.filter((v) => v === 4).length;
  const threes = vals.filter((v) => v === 3).length;
  const ones = vals.filter((v) => v === 1).length;
  const r = clamp(Math.round(risk), 1, 4);

  if (fours >= 2 || (r === 4 && vals.some((v, i) => i > 0 && v >= 3))) {
    return { class: "CC-D", rule: "1 — two factors at 4, or risk 4 with another at 3 or 4" };
  }
  if (fours >= 1 || threes >= 2) return { class: "CC-C", rule: "2 — any factor at 4, or two at 3" };
  if (threes >= 1) return { class: "CC-B", rule: "3 — any factor at 3" };
  if (ones >= 3) return { class: "CC-A", rule: "4 — all at 1 or 2, at least three at 1" };
  return { class: "CC-B", rule: "5 — anything else" };
}

// ---------------------------------------------------------------- priority
/**
 * Rank processes against each other.
 *   priority = (addressable value × velocity contribution) / cost of change
 * The result is an INDEX; only ratios between processes mean anything.
 */
export function priority(inputs: any): any {
  const i = plainObject(inputs);
  const warnings: string[] = [];
  const terms: any = {};

  // --- cost of change ---
  let cls: string | null = typeof i.costOfChangeClass === "string" ? i.costOfChangeClass.toUpperCase().trim() : null;
  let clsRule: string | null = cls ? "given" : null;
  if (!cls || !(cls in COST_FACTOR)) {
    const derived = classFromFactors(i.factors);
    if (derived.class) {
      cls = derived.class;
      clsRule = `derived, rule ${derived.rule}`;
    } else {
      cls = "CC-B";
      clsRule = "defaulted";
      warnings.push("No cost-of-change class and no complete factor set — defaulted to CC-B. Fill the cost-of-change section before this ranking is used.");
    }
  }
  const costFactor = COST_FACTOR[cls!]!;
  const effortCycles = Math.max(1, num(i.effortCycles, 1));
  const cost = costFactor * effortCycles;

  // --- blocked tracks ---
  const profile = plainObject(i.profile);
  const koFailed =
    typeof i.knockOutFailed === "boolean"
      ? i.knockOutFailed
      : Array.isArray(profile.knockOuts) && profile.knockOuts.some((k: any) => k && k.state === "fail");

  const compounding = Math.max(0, num(i.compoundingProcesses, 0));

  if (koFailed) {
    return {
      score: null,
      blocked: true,
      track: "enabler",
      class: cls,
      terms: { cost, costFactor, effortCycles },
      enablerPriority: round2((1 + compounding) / cost),
      warnings,
      explain:
        "A knock-out has failed. The only admissible work is the enabler that removes it (staff the spoke, make timestamps obtainable, obtain interface access). Ranked against other enablers by how many processes are blocked by the same obstacle.",
    };
  }

  if (cls === "CC-D") {
    return {
      score: null,
      blocked: true,
      track: "re-cut",
      class: cls,
      terms: { cost, costFactor, effortCycles },
      warnings,
      explain:
        'CC-D is prohibitive as this increment, not as an idea. Cut a smaller increment that lowers the driving factor, then score again. "Carefully anyway" is not a tactic.',
    };
  }

  // --- value ---
  const A = Math.max(0, num(i.addressableValuePerYear, 0));
  if (A === 0) warnings.push("Addressable value is zero or missing — the ranking says nothing until the business case supplies a number.");
  const reach = clamp(num(i.reachShare, 1), 0, 1);
  const confKey = String(i.confidence || "S").toUpperCase();
  const conf = CONFIDENCE_DISCOUNT[confKey] !== undefined ? CONFIDENCE_DISCOUNT[confKey]! : CONFIDENCE_DISCOUNT.S!;
  if (!(confKey in CONFIDENCE_DISCOUNT)) warnings.push(`Unknown confidence "${i.confidence}" — treated as S (told to us).`);
  if (confKey === "S" && A > 0) warnings.push("The value figure is self-reported (S). It is discounted by half and must reach at least P before it carries a decision.");
  const compFactor = 1 + COMPOUNDING_STEP * Math.min(compounding, COMPOUNDING_CAP);
  if (compounding > COMPOUNDING_CAP) warnings.push(`Compounding counted at ${COMPOUNDING_CAP} of ${compounding} claimed processes — the cap stops "it applies everywhere" from dominating.`);
  const valueRate = A * reach * conf * compFactor;

  // --- velocity ---
  const daysToShip = Math.max(1, num(i.daysToShip, 0) || 1);
  if (num(i.daysToShip, null) === null) warnings.push("No ship date given — velocity defaulted to one day, which will overstate this process. Fill the increment section.");
  const daysToRead = Math.max(0, num(i.daysToReadResult, daysToShip));
  const cycleDays = Math.max(1, daysToShip + daysToRead);
  const turns = 365 / cycleDays;

  const shp = profile.dimensions && profile.dimensions.shippability;
  if (shp && shp.score !== null && shp.score < THRESHOLDS.redDimensionFloor && cycleDays <= 60) {
    warnings.push(`Shippability scores ${shp.score} but the plan claims a ${cycleDays}-day turn. One of the two is wrong; check before ranking on it.`);
  }

  const throughput = valueRate * turns;
  const score = round1(throughput / cost / 1000);

  terms.addressableValuePerYear = A;
  terms.reachShare = reach;
  terms.confidence = confKey;
  terms.confidenceDiscount = conf;
  terms.compoundingProcesses = compounding;
  terms.compoundingFactor = compFactor;
  terms.valueRate = Math.round(valueRate);
  terms.daysToShip = daysToShip;
  terms.daysToReadResult = daysToRead;
  terms.cycleDays = cycleDays;
  terms.turnsPerYear = round2(turns);
  terms.costFactor = costFactor;
  terms.effortCycles = effortCycles;
  terms.cost = cost;

  const out: any = {
    score,
    blocked: false,
    track: "optimisation",
    class: cls,
    classSource: clsRule,
    terms,
    warnings,
    explain: `€${Math.round(valueRate).toLocaleString("en-GB")}/yr captured × ${round2(turns)} turns/yr ÷ (${costFactor} × ${effortCycles} cycles) ÷ 1000 = ${score}`,
  };

  // --- what removing the main barrier would be worth ---
  const bClass = typeof i.barrierRemovedClass === "string" ? i.barrierRemovedClass.toUpperCase().trim() : null;
  if (bClass && bClass in COST_FACTOR && bClass !== cls) {
    const bCost = COST_FACTOR[bClass]! * (effortCycles + Math.max(0, num(i.barrierRemovalCycles, 0)));
    const bScore = round1(throughput / bCost / 1000);
    out.barrierRemoval = {
      classAfter: bClass,
      cost: bCost,
      score: bScore,
      gain: round1(bScore - score),
      note: "What the named main barrier is worth if it is removed, at the stated removal cost. Positive gain is the case for spending on the barrier instead of on the process.",
    };
  }

  return out;
}

export { knownSections, GATE_SECTIONS };
