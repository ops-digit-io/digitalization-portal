// score-model.ts — section scores → dimension profile → traffic light → priority.
//
// Ported 1:1 from backend/services/scoreModel.js. Every weight, threshold and
// constant is the source's; nothing has been rounded, renamed or tidied.
//
// Three jobs, deliberately separated:
//
//   scoreProfile(sectionScores, gateResults)  the multi-dimensional profile
//   trafficLight(profile)                     one colour a portfolio can carry
//   priority(inputs)                          the ranking of processes against each other
//
// The reasoning behind every number in here is in docs/score-model.md. Two rules
// govern the whole file and are worth stating once:
//
//   1. A knock-out is not a low score. It is a fact about whether the work can be
//      done at all — no responsible spoke, no obtainable timestamps, no reachable
//      interface. It dominates the colour instead of being averaged into it.
//   2. Bad news counts on partial evidence; good news does not. A dimension backed
//      by half its sections can turn the light red, but never green.
//
// Nothing here throws on bad input. A missing section is reported as "not assessed",
// which is a different statement from "assessed and bad", and the model keeps them
// apart everywhere.

// ------------------------------------------------------------------- types

/** What the grader hands over: a bare number, a grader result object, or nothing. */
export type SectionScoreInput = number | { score: number } | null | undefined;

/** A recorded gate verdict: a boolean, a verdict object, or "no verdict". */
export type GateVerdictInput = boolean | { passed: boolean } | null | undefined;

export type DimensionKey = "visibility" | "shippability" | "carry" | "health" | "value";
export type KnockOutKey = "spoke" | "timestamps" | "interface-access";
export type CostClass = "CC-A" | "CC-B" | "CC-C" | "CC-D";
export type ConfidenceKey = "I" | "P" | "S";
export type Light = "red" | "amber" | "green" | "grey";
export type KnockOutState = "pass" | "fail" | "unknown";

export interface DimensionDef {
  key: DimensionKey;
  label: string;
  weight: number;
  question: string;
  /** section key → weight inside this dimension; sums to 100. */
  sections: Record<string, number>;
}

export interface KnockOutDef {
  key: KnockOutKey;
  label: string;
  statement: string;
  gateSection: string;
  flags: string[];
  consequence: string;
}

export interface Thresholds {
  dimensionAssessed: number;
  greenDimensionFloor: number;
  redDimensionFloor: number;
  redVisibilityFloor: number;
  greenCoverage: number;
  greyCoverage: number;
  koEvidenceFloor: number;
}

/** One of the five dimensions, as it comes out of the profile. */
export interface DimensionEntry {
  key: DimensionKey;
  label: string;
  question: string;
  weight: number;
  /** Weighted mean over the sections that ARE assessed. null = nothing assessed. */
  score: number | null;
  /** 0..1, the share of this dimension's internal weight that is backed by an artefact. */
  coverage: number;
  /** At least half the internal weight assessed. Gates GREEN and the overall figure. */
  assessed: boolean;
  /** section key → score, or null for "not assessed" (never zero). */
  sections: Record<string, number | null>;
  missing: string[];
}

/**
 * The same statement as `note`/`reason`, in a form a translator can render.
 *
 * The engine's English text is the port and stays byte-identical; these codes
 * exist so the display layer can say the same thing in another language without
 * anyone parsing a sentence back into facts.
 */
export interface TextCode {
  code: string;
  params?: Record<string, string | number>;
}

export interface KnockOutEntry {
  key: KnockOutKey;
  label: string;
  statement: string;
  consequence: string;
  state: KnockOutState;
  /** Which key the verdict was read from, or the backing section, or null. */
  source: string | null;
  note: string;
  noteCode: TextCode;
}

export interface ScoreProfileResult {
  dimensions: Record<DimensionKey, DimensionEntry>;
  knockOuts: KnockOutEntry[];
  gateVerdicts: Record<string, boolean | null>;
  gateFailures: string[];
  overall: number | null;
  coverage: number;
  sectionsAssessed: number;
  sectionsTotal: number;
  notAssessed: string[];
  unknownSections: string[];
  thresholds: Thresholds;
}

export interface TrafficLightResult {
  light: Light;
  reason: string;
  /** Label → one-line reading, in words a plant manager can check. */
  detail: Record<string, string>;
  drivers: string[];
  knockOutDriven?: boolean;
  /** `reason` and `drivers` again, translatable. See TextCode. */
  reasonCode: TextCode;
  driverCodes: TextCode[];
}

export interface Factors {
  risk?: number;
  effort?: number;
  friction?: number;
  durability?: number;
}

export interface FactorClassResult {
  class: CostClass | null;
  rule: string;
  missing?: number;
}

export interface PriorityInputs {
  /** € per year the technology addresses */
  addressableValuePerYear?: number;
  /** 0..1, the part this increment reaches now */
  reachShare?: number;
  /** how the value figure was obtained */
  confidence?: ConfidenceKey;
  /** further processes the same cut fits with no redesign */
  compoundingProcesses?: number;
  /** decision → in use, calendar days */
  daysToShip?: number;
  /** in use → the number can be read; defaults to daysToShip */
  daysToReadResult?: number;
  /** iteration cycles of hub+spoke work */
  effortCycles?: number;
  costOfChangeClass?: CostClass | string;
  /** {risk,effort,friction,durability} 1..4 — used if no class */
  factors?: Factors;
  /** class if the named main barrier were removed */
  barrierRemovedClass?: CostClass | string;
  /** extra cycles that removal costs */
  barrierRemovalCycles?: number;
  /** a scoreProfile result, for cross-checks */
  profile?: ScoreProfileResult;
  /** overrides the profile if given */
  knockOutFailed?: boolean;
}

/** The terms a blocked track can still report: only the cost side was computed. */
export interface BlockedTerms {
  cost: number;
  costFactor: number;
  effortCycles: number;
}

export interface PriorityTerms extends BlockedTerms {
  addressableValuePerYear: number;
  reachShare: number;
  confidence: string;
  confidenceDiscount: number;
  compoundingProcesses: number;
  compoundingFactor: number;
  valueRate: number;
  daysToShip: number;
  daysToReadResult: number;
  cycleDays: number;
  turnsPerYear: number;
}

export interface BarrierRemoval {
  classAfter: CostClass;
  cost: number;
  score: number;
  gain: number;
  note: string;
}

export interface BlockedPriorityResult {
  score: null;
  blocked: true;
  track: "enabler" | "re-cut";
  class: CostClass;
  terms: BlockedTerms;
  /** Only on the enabler track: how many blocked processes hang off the same obstacle. */
  enablerPriority?: number;
  warnings: string[];
  explain: string;
}

export interface RankedPriorityResult {
  score: number;
  blocked: false;
  track: "optimisation";
  class: CostClass;
  classSource: string | null;
  terms: PriorityTerms;
  warnings: string[];
  explain: string;
  barrierRemoval?: BarrierRemoval;
}

export type PriorityResult = BlockedPriorityResult | RankedPriorityResult;

// ---------------------------------------------------------------- dimensions
//
// Five dimensions. Every one of the fourteen sections feeds at least one of them;
// the weights inside a dimension say how much that section evidences it, and they
// sum to 100 per dimension. The dimension weights say how much each dimension
// constrains the ability to ship the NEXT increment — that ordering, not process
// health, is the north star (briefing part 3).

export const DIMENSIONS: readonly DimensionDef[] = [
  {
    key: "visibility",
    label: "Visibility",
    weight: 30,
    question: "Can we see what this process does, at step level, without asking anyone?",
    sections: { diagnostics: 45, kpi: 35, mapping: 20 },
  },
  {
    key: "shippability",
    label: "Shippability",
    weight: 25,
    question: "Can a value increment land on this process inside one iteration cycle?",
    sections: { increment: 35, diagnosis: 20, iteration: 20, "cost-of-change": 15, toolchain: 10 },
  },
  {
    key: "carry",
    label: "Organisational carry",
    weight: 20,
    question: "Will the change still be in use in six months?",
    sections: { literacy: 45, knowledge: 30, profile: 25 },
  },
  {
    key: "health",
    label: "Process health",
    weight: 15,
    question: "Does the process do its job today, on a chain that does not break?",
    sections: { flow: 35, toolchain: 25, purpose: 20, mapping: 20 },
  },
  {
    key: "value",
    label: "Addressable value",
    weight: 10,
    question: "Is there enough on the other side to be worth a cycle?",
    sections: { "business-case": 50, increment: 30, purpose: 20 },
  },
];

// ---------------------------------------------------------------- knock-outs
//
// Each knock-out has one authoritative source (a recorded gate verdict) and one
// fallback reading (the section score, which can only say "the artefact does not
// carry the evidence", never "the answer is yes").
//
// `flags` are keys the caller may set directly in gateResults when the verdict is
// known outside a gate section. Interface access is the case that needs it: the
// toolchain section carries the finding but is not a gate in sections.ts.

export const KNOCK_OUTS: readonly KnockOutDef[] = [
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
//
// Every gate in the sequence can fail. Two of them back a knock-out (profile →
// spoke, diagnostics → timestamps); the rest are not fatal but they are verdicts,
// and a process cannot be called green while one of them stands failed.
//
// The list mirrors the `gate: true` sections in lib/process/sections.ts. It is kept
// as a literal here — as in the source, whose live read is only a convenience — so
// this module stays dependency-free and can be reasoned about on its own.

const GATE_SECTIONS: readonly string[] = [
  "profile",
  "purpose",
  "diagnostics",
  "cost-of-change",
  "diagnosis",
  "increment",
  "business-case",
];

// ---------------------------------------------------------------- thresholds
//
// Every number below is a SETTING, not a measurement. None of them has been
// calibrated against a real OESL process, because none has been assessed yet.
// The first three assessments are calibration runs (docs/OPEN-POINTS.md §5).

export const THRESHOLDS: Thresholds = {
  dimensionAssessed: 0.5, // share of a dimension's internal weight that must be assessed
  greenDimensionFloor: 60, // no dimension below this for green
  redDimensionFloor: 40, // two or more dimensions below this is red
  redVisibilityFloor: 30, // visibility alone below this is red
  greenCoverage: 0.8, // share of total dimension weight that must be assessed for green
  greyCoverage: 0.25, // below this, the model refuses to call anything but a knock-out
  koEvidenceFloor: 40, // below this a section cannot be said to carry its knock-out evidence
};

export const CONFIDENCE_DISCOUNT: Record<ConfidenceKey, number> = { I: 1.0, P: 0.8, S: 0.5 };
export const COST_FACTOR: Record<CostClass, number> = { "CC-A": 1, "CC-B": 2, "CC-C": 4, "CC-D": 8 };
const COMPOUNDING_STEP = 0.5; // each further process where the same cut applies
const COMPOUNDING_CAP = 4; // ... counted at most four times

// ------------------------------------------------------------------- helpers

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Accepts a bare number, a grader result object, or junk. Junk becomes null. */
function coerceScore(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") {
    if (Array.isArray(v)) return null;
    return coerceScore((v as Record<string, unknown>).score);
  }
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return clamp(Math.round(n), 0, 100);
}

/** Accepts true/false, null, {passed:…}. Anything else is "no verdict". */
function coerceVerdict(v: unknown): boolean | null {
  if (v === true || v === false) return v;
  if (v && typeof v === "object") {
    const passed = (v as Record<string, unknown>).passed;
    if (passed === true || passed === false) return passed;
  }
  return null;
}

function num<T>(v: unknown, fallback: T): number | T {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function plainObject(v: unknown): Record<string, unknown> {
  return v !== null && v !== undefined && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

/** Every section key the model reads, in dimension order. */
function knownSections(): string[] {
  const out: string[] = [];
  for (const d of DIMENSIONS) for (const k of Object.keys(d.sections)) if (!out.includes(k)) out.push(k);
  return out;
}

// ------------------------------------------------------------- the profile

function buildDimension(def: DimensionDef, scores: Record<string, unknown>): DimensionEntry {
  let weightTotal = 0;
  let weightAssessed = 0;
  let acc = 0;
  const sections: Record<string, number | null> = {};
  const missing: string[] = [];

  for (const [key, w] of Object.entries(def.sections)) {
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
    // "assessed" gates GREEN and the overall figure. A partial dimension still
    // reports a score and can still turn the light red — bad news counts on
    // partial evidence, good news does not.
    assessed: coverage >= THRESHOLDS.dimensionAssessed,
    sections,
    missing,
  };
}

function resolveKnockOut(
  def: KnockOutDef,
  gates: Record<string, unknown>,
  scores: Record<string, unknown>,
): KnockOutEntry {
  const base = { key: def.key, label: def.label, statement: def.statement, consequence: def.consequence };

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

  if (verdict === true) {
    return {
      ...base, state: "pass", source,
      note: `recorded verdict on "${source}"`,
      noteCode: { code: "ko.verdict", params: { source: String(source) } },
    };
  }
  if (verdict === false) {
    return {
      ...base, state: "fail", source,
      note: `recorded verdict on "${source}"`,
      noteCode: { code: "ko.verdict", params: { source: String(source) } },
    };
  }

  const backing = coerceScore(scores[def.gateSection]);
  if (backing === null) {
    return {
      ...base, state: "unknown", source: null,
      note: `${def.gateSection} not assessed`,
      noteCode: { code: "ko.notAssessed", params: { section: def.gateSection } },
    };
  }
  if (backing < THRESHOLDS.koEvidenceFloor) {
    return {
      ...base,
      state: "unknown",
      source: def.gateSection,
      note: `${def.gateSection} scored ${backing} — the artefact does not carry the evidence`,
      noteCode: { code: "ko.weakEvidence", params: { section: def.gateSection, score: backing } },
    };
  }
  return {
    ...base,
    state: "unknown",
    source: def.gateSection,
    note: `${def.gateSection} scored ${backing}, but no gate verdict has been recorded`,
    noteCode: { code: "ko.noVerdict", params: { section: def.gateSection, score: backing } },
  };
}

/**
 * The dimension profile.
 *
 * @param sectionScores 0..100 per section key. Sections absent from this object are
 *        "not assessed" — never zero.
 * @param gateResults recorded gate verdicts by section key, plus optional direct
 *        knock-out flags ("interface-access", "timestamps", "spoke").
 */
export function scoreProfile(
  sectionScores?: Record<string, SectionScoreInput> | null,
  gateResults?: Record<string, GateVerdictInput> | null,
): ScoreProfileResult {
  const scores = plainObject(sectionScores);
  const gates = plainObject(gateResults);

  const dimensions = {} as Record<DimensionKey, DimensionEntry>;
  for (const def of DIMENSIONS) dimensions[def.key] = buildDimension(def, scores);

  const knockOuts = KNOCK_OUTS.map((def) => resolveKnockOut(def, gates, scores));

  // Coverage across the whole model, weighted by dimension weight.
  let coverage = 0;
  for (const d of Object.values(dimensions)) coverage += (d.weight / 100) * d.coverage;

  // The overall figure exists so a portfolio can be sorted when two processes
  // carry the same colour. It is never the colour and it is never reported alone.
  let wSum = 0;
  let acc = 0;
  for (const d of Object.values(dimensions)) {
    if (!d.assessed || d.score === null) continue;
    wSum += d.weight;
    acc += d.weight * d.score;
  }

  // Gate verdicts. The two that back a knock-out are already handled above; the
  // others are not fatal, but a failed one is a recorded finding and it stops the
  // process being called green until it is re-run and passed.
  const koGateSections = KNOCK_OUTS.map((k) => k.gateSection);
  const gateVerdicts: Record<string, boolean | null> = {};
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

/** A dimension that carries a number. Narrowed so the floors can be compared. */
type ScoredDimension = DimensionEntry & { score: number };

/** Runtime shape check — the light must survive a hand-built or half-built profile. */
function isDimensionEntry(v: unknown): v is DimensionEntry {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const d = v as Record<string, unknown>;
  return (d.score === null || typeof d.score === "number") && typeof d.label === "string";
}

function isKnockOutEntry(v: unknown): v is KnockOutEntry {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  return typeof (v as Record<string, unknown>).state === "string";
}

/**
 * One colour, and the reason for it in words a plant manager can check.
 *
 * red    any knock-out failed, or visibility below its floor, or two or more
 *        dimensions below the red floor
 * grey   nothing (or almost nothing) assessed and no knock-out failed
 * green  all three knock-outs cleared by a recorded verdict, every dimension
 *        assessed and at or above the green floor, coverage at or above 80 %
 * amber  everything else
 */
export function trafficLight(profile: ScoreProfileResult | null | undefined): TrafficLightResult {
  if (!profile || typeof profile !== "object" || !profile.dimensions) {
    return {
      light: "grey", reason: "No profile could be computed.", detail: {}, drivers: [],
      reasonCode: { code: "light.noProfile" }, driverCodes: [],
    };
  }

  const dims = Object.values(plainObject(profile.dimensions)).filter(isDimensionEntry);
  const kos = Array.isArray(profile.knockOuts) ? profile.knockOuts.filter(isKnockOutEntry) : [];
  const failed = kos.filter((k) => k.state === "fail");
  const unknown = kos.filter((k) => k.state === "unknown");
  const passed = kos.filter((k) => k.state === "pass");
  const coverage = num(profile.coverage, 0);

  const detail: Record<string, string> = {};
  for (const d of dims) {
    detail[d.label] =
      d.score === null
        ? "not assessed"
        : `${d.score}${d.assessed ? "" : ` (partial, ${Math.round(num(d.coverage, 0) * 100)} % of evidence)`}`;
  }
  detail["Knock-outs"] =
    `${passed.length} of ${kos.length} cleared` +
    (failed.length ? `, ${failed.length} failed` : "") +
    (unknown.length ? `, ${unknown.length} open` : "");
  detail["Coverage"] = `${Math.round(coverage * 100)} % of the model assessed`;
  if (Array.isArray(profile.notAssessed) && profile.notAssessed.length) {
    detail["Not assessed"] = profile.notAssessed.join(", ");
  }

  const drivers: string[] = [];
  const driverCodes: TextCode[] = [];

  // 1. A failed knock-out dominates. It outranks coverage, it outranks every
  //    dimension score, and it does not average with anything.
  if (failed.length) {
    for (const k of failed) {
      drivers.push(`${k.label}: failed — ${k.consequence}`);
      driverCodes.push({ code: "driver.koFailed", params: { ko: k.key } });
    }
    const first = failed[0];
    return {
      light: "red",
      reason:
        failed.length === 1 && first
          ? `Knock-out failed: ${first.label.toLowerCase()}. ${first.consequence}`
          : `${failed.length} knock-outs failed: ${failed.map((k) => k.label.toLowerCase()).join(", ")}.`,
      detail,
      drivers,
      knockOutDriven: true,
      reasonCode:
        failed.length === 1 && first
          ? { code: "light.koFailedOne", params: { ko: first.key } }
          : { code: "light.koFailedMany", params: { n: failed.length, kos: failed.map((k) => k.key).join(",") } },
      driverCodes,
    };
  }

  const scored = dims.filter((d): d is ScoredDimension => d.score !== null);
  const below = scored.filter((d) => d.score < THRESHOLDS.redDimensionFloor);
  const vis = profile.dimensions.visibility;

  // 2. Two failures of degree are a pattern, not an outlier — and no visibility
  //    means no reading of any result, which is the same as no velocity.
  if (vis && vis.score !== null && vis.score < THRESHOLDS.redVisibilityFloor) {
    drivers.push(`Visibility ${vis.score} — below ${THRESHOLDS.redVisibilityFloor}; no increment could be read.`);
    driverCodes.push({
      code: "driver.visibilityFloor",
      params: { score: vis.score, floor: THRESHOLDS.redVisibilityFloor },
    });
    return {
      light: "red",
      reason: `Visibility is ${vis.score}. Nothing shipped on this process could be read, so nothing can be improved on evidence.`,
      detail,
      drivers,
      knockOutDriven: false,
      reasonCode: { code: "light.visibilityFloor", params: { score: vis.score } },
      driverCodes,
    };
  }
  if (below.length >= 2) {
    for (const d of below) {
      drivers.push(`${d.label} ${d.score} — below ${THRESHOLDS.redDimensionFloor}.`);
      driverCodes.push({
        code: "driver.dimBelow",
        params: { dim: d.key, score: d.score, floor: THRESHOLDS.redDimensionFloor },
      });
    }
    return {
      light: "red",
      reason: `${below.length} dimensions below ${THRESHOLDS.redDimensionFloor}: ${below
        .map((d) => d.label.toLowerCase())
        .join(", ")}. One is a finding; two are a pattern.`,
      detail,
      drivers,
      knockOutDriven: false,
      reasonCode: {
        code: "light.dimsBelow",
        params: { n: below.length, floor: THRESHOLDS.redDimensionFloor, dims: below.map((d) => d.key).join(",") },
      },
      driverCodes,
    };
  }

  // 3. Too little assessed to say anything. Deliberately after the red checks:
  //    a spoke gate that failed at intake is red on an otherwise empty file.
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
      reasonCode:
        coverage === 0
          ? { code: "light.greyEmpty" }
          : { code: "light.greyThin", params: { pct: Math.round(coverage * 100) } },
      driverCodes: [],
    };
  }

  // 4. Green is a claim, and it has to be paid for with evidence.
  const unassessedDims = dims.filter((d) => !d.assessed);
  const weakDims = scored.filter((d) => d.score < THRESHOLDS.greenDimensionFloor);
  const gateFailures = Array.isArray(profile.gateFailures) ? profile.gateFailures : [];
  const greenBlockers: string[] = [];
  const blockerCodes: TextCode[] = [];
  if (gateFailures.length) {
    greenBlockers.push(`gate failed and not yet re-run: ${gateFailures.join(", ")}`);
    blockerCodes.push({ code: "blocker.gateFailed", params: { sections: gateFailures.join(",") } });
  }
  if (unknown.length) {
    greenBlockers.push(`${unknown.length} knock-out(s) without a recorded verdict`);
    blockerCodes.push({ code: "blocker.koNoVerdict", params: { n: unknown.length } });
  }
  if (unassessedDims.length) {
    greenBlockers.push(`${unassessedDims.map((d) => d.label.toLowerCase()).join(", ")} not sufficiently assessed`);
    blockerCodes.push({ code: "blocker.dimsUnassessed", params: { dims: unassessedDims.map((d) => d.key).join(",") } });
  }
  if (weakDims.length) {
    greenBlockers.push(
      `${weakDims.map((d) => `${d.label.toLowerCase()} ${d.score}`).join(", ")} below ${THRESHOLDS.greenDimensionFloor}`,
    );
    blockerCodes.push({
      code: "blocker.dimsWeak",
      params: {
        floor: THRESHOLDS.greenDimensionFloor,
        dims: weakDims.map((d) => `${d.key}:${d.score}`).join(","),
      },
    });
  }
  if (coverage < THRESHOLDS.greenCoverage) {
    greenBlockers.push(
      `coverage ${Math.round(coverage * 100)} % below ${Math.round(THRESHOLDS.greenCoverage * 100)} %`,
    );
    blockerCodes.push({
      code: "blocker.coverage",
      params: { pct: Math.round(coverage * 100), floor: Math.round(THRESHOLDS.greenCoverage * 100) },
    });
  }

  if (!greenBlockers.length) {
    const worst = scored.reduce<ScoredDimension | null>((a, d) => (a === null || d.score < a.score ? d : a), null);
    return {
      light: "green",
      reason: "All three knock-outs cleared, every dimension assessed and at or above the green floor.",
      detail,
      drivers: [`Weakest dimension: ${weakest(scored)}`],
      knockOutDriven: false,
      reasonCode: { code: "light.green" },
      driverCodes: worst
        ? [{ code: "driver.weakest", params: { dim: worst.key, score: worst.score } }]
        : [{ code: "driver.weakestNone" }],
    };
  }

  return {
    light: "amber",
    reason: `Work to do: ${greenBlockers.join("; ")}.`,
    detail,
    drivers: greenBlockers,
    knockOutDriven: false,
    reasonCode: { code: "light.amber" },
    driverCodes: blockerCodes,
  };
}

function weakest(scored: ScoredDimension[]): string {
  if (!scored.length) return "none scored";
  const w = scored.reduce((a, b) => (a.score <= b.score ? a : b));
  return `${w.label} ${w.score}`;
}

// ------------------------------------------------------------- cost of change

/**
 * The class rule from the cost-of-change coaching prompt, in code so the portal
 * and the conversation cannot drift apart. First rule that fires decides.
 * Factors are 1..4; missing factors are treated as unknown and, per the section's
 * own instruction, an absent factor is scored as what its absence implies — here
 * the caller is told rather than guessed for.
 */
export function classFromFactors(factors: Factors | null | undefined): FactorClassResult {
  const f = plainObject(factors);
  const risk = num(f.risk, null);
  const vals = (["risk", "effort", "friction", "durability"] as const)
    .map((k) => num(f[k], null))
    .filter((v): v is number => v !== null)
    .map((v) => clamp(Math.round(v), 1, 4));

  if (vals.length < 4)
    return { class: null, rule: "incomplete — fewer than four factors given", missing: 4 - vals.length };

  const fours = vals.filter((v) => v === 4).length;
  const threes = vals.filter((v) => v === 3).length;
  const ones = vals.filter((v) => v === 1).length;
  // Four entries means all four factors were finite, so `risk` is a number here;
  // `?? 0` only reproduces the source's Math.round(null) === 0 for the impossible case.
  const r = clamp(Math.round(risk ?? 0), 1, 4);

  // The `i > 0` test skips risk itself — the entries are in the declared order,
  // so index 0 is risk and "another factor at 3 or 4" means one of the other three.
  if (fours >= 2 || (r === 4 && vals.some((v, i) => i > 0 && v >= 3))) {
    return { class: "CC-D", rule: "1 — two factors at 4, or risk 4 with another at 3 or 4" };
  }
  if (fours >= 1 || threes >= 2) return { class: "CC-C", rule: "2 — any factor at 4, or two at 3" };
  if (threes >= 1) return { class: "CC-B", rule: "3 — any factor at 3" };
  if (ones >= 3) return { class: "CC-A", rule: "4 — all at 1 or 2, at least three at 1" };
  return { class: "CC-B", rule: "5 — anything else" };
}

function isCostClass(v: string): v is CostClass {
  return Object.prototype.hasOwnProperty.call(COST_FACTOR, v);
}

// ---------------------------------------------------------------- priority

/**
 * Rank processes against each other.
 *
 *     priority = (addressable value × velocity contribution) / cost of change
 *
 * spelled out:
 *
 *     valueRate  = A × reach × confidence × compounding      € per year, captured
 *     turns      = 365 / (daysToShip + daysToReadResult)     value turns per year
 *     cost       = costFactor(class) × effortCycles          unit-cost cycles
 *     priority   = valueRate × turns / cost / 1000           ranking index
 *
 * The result is an INDEX. It has no physical meaning; only ratios between
 * processes do. Everything that went into it is returned in `terms` so the number
 * can be argued with.
 */
export function priority(inputs: PriorityInputs | null | undefined): PriorityResult {
  const i = plainObject(inputs);
  const warnings: string[] = [];

  // --- cost of change ------------------------------------------------------
  const given = typeof i.costOfChangeClass === "string" ? i.costOfChangeClass.toUpperCase().trim() : null;
  let cls: CostClass;
  let clsRule: string | null;
  if (given && isCostClass(given)) {
    cls = given;
    clsRule = "given";
  } else {
    const derived = classFromFactors(i.factors as Factors | null | undefined);
    if (derived.class) {
      cls = derived.class;
      clsRule = `derived, rule ${derived.rule}`;
    } else {
      cls = "CC-B";
      clsRule = "defaulted";
      warnings.push(
        "No cost-of-change class and no complete factor set — defaulted to CC-B. Fill the cost-of-change section before this ranking is used.",
      );
    }
  }
  const costFactor = COST_FACTOR[cls];
  const effortCycles = Math.max(1, num(i.effortCycles, 1));
  const cost = costFactor * effortCycles;

  // --- the blocked tracks --------------------------------------------------
  const profile = plainObject(i.profile);
  const profileKos = Array.isArray(profile.knockOuts) ? profile.knockOuts : [];
  const koFailed =
    typeof i.knockOutFailed === "boolean"
      ? i.knockOutFailed
      : profileKos.some((k) => plainObject(k).state === "fail");

  const compounding = Math.max(0, num(i.compoundingProcesses, 0));

  if (koFailed) {
    return {
      score: null,
      blocked: true,
      track: "enabler",
      class: cls,
      terms: { cost, costFactor, effortCycles },
      // Enablers do not compete with optimisations; they are ranked among
      // themselves by how many blocked processes hang off the same obstacle.
      enablerPriority: round2((1 + compounding) / cost),
      warnings,
      explain:
        "A knock-out has failed. The only admissible work is the enabler that removes it " +
        "(staff the spoke, make timestamps obtainable, obtain interface access). Ranked against " +
        "other enablers by how many processes are blocked by the same obstacle.",
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
        "CC-D is prohibitive as this increment, not as an idea. Cut a smaller increment that lowers " +
        'the driving factor, then score again. "Carefully anyway" is not a tactic.',
    };
  }

  // --- value ---------------------------------------------------------------
  const A = Math.max(0, num(i.addressableValuePerYear, 0));
  if (A === 0)
    warnings.push(
      "Addressable value is zero or missing — the ranking says nothing until the business case supplies a number.",
    );
  const reach = clamp(num(i.reachShare, 1), 0, 1);
  const confKey = String(i.confidence || "S").toUpperCase();
  const conf = isConfidenceKey(confKey) ? CONFIDENCE_DISCOUNT[confKey] : CONFIDENCE_DISCOUNT.S;
  if (!isConfidenceKey(confKey)) warnings.push(`Unknown confidence "${String(i.confidence)}" — treated as S (told to us).`);
  if (confKey === "S" && A > 0)
    warnings.push(
      "The value figure is self-reported (S). It is discounted by half and must reach at least P before it carries a decision.",
    );
  const compFactor = 1 + COMPOUNDING_STEP * Math.min(compounding, COMPOUNDING_CAP);
  if (compounding > COMPOUNDING_CAP)
    warnings.push(
      `Compounding counted at ${COMPOUNDING_CAP} of ${compounding} claimed processes — the cap stops "it applies everywhere" from dominating.`,
    );
  const valueRate = A * reach * conf * compFactor;

  // --- velocity ------------------------------------------------------------
  const daysToShip = Math.max(1, num(i.daysToShip, 0) || 1);
  if (num(i.daysToShip, null) === null)
    warnings.push(
      "No ship date given — velocity defaulted to one day, which will overstate this process. Fill the increment section.",
    );
  const daysToRead = Math.max(0, num(i.daysToReadResult, daysToShip));
  const cycleDays = Math.max(1, daysToShip + daysToRead);
  const turns = 365 / cycleDays;

  const shp = plainObject(plainObject(profile.dimensions).shippability);
  const shpScore = typeof shp.score === "number" ? shp.score : null;
  if (shpScore !== null && shpScore < THRESHOLDS.redDimensionFloor && cycleDays <= 60) {
    warnings.push(
      `Shippability scores ${shpScore} but the plan claims a ${cycleDays}-day turn. One of the two is wrong; check before ranking on it.`,
    );
  }

  const throughput = valueRate * turns;
  const score = round1(throughput / cost / 1000);

  const terms: PriorityTerms = {
    addressableValuePerYear: A,
    reachShare: reach,
    confidence: confKey,
    confidenceDiscount: conf,
    compoundingProcesses: compounding,
    compoundingFactor: compFactor,
    valueRate: Math.round(valueRate),
    daysToShip,
    daysToReadResult: daysToRead,
    cycleDays,
    turnsPerYear: round2(turns),
    costFactor,
    effortCycles,
    cost,
  };

  const out: RankedPriorityResult = {
    score,
    blocked: false,
    track: "optimisation",
    class: cls,
    classSource: clsRule,
    terms,
    warnings,
    explain:
      `€${Math.round(valueRate).toLocaleString("en-GB")}/yr captured × ${round2(turns)} turns/yr ` +
      `÷ (${costFactor} × ${effortCycles} cycles) ÷ 1000 = ${score}`,
  };

  // --- what removing the main barrier would be worth -----------------------
  const bClass = typeof i.barrierRemovedClass === "string" ? i.barrierRemovedClass.toUpperCase().trim() : null;
  if (bClass && isCostClass(bClass) && bClass !== cls) {
    const bCost = COST_FACTOR[bClass] * (effortCycles + Math.max(0, num(i.barrierRemovalCycles, 0)));
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

function isConfidenceKey(v: string): v is ConfidenceKey {
  return Object.prototype.hasOwnProperty.call(CONFIDENCE_DISCOUNT, v);
}
