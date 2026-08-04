/**
 * The bilingual display layer for the Process Funnel.
 *
 * English is the default; German is the second locale (and the verbatim source of
 * the assessment catalogue, doc A/B). Every fixed, user-visible string in the
 * module resolves through here by id, so the language toggle is instant and the
 * German source stays the canonical data in `criteria.ts` / `phases.ts` /
 * `artefacts.ts`. User data (titles, owners, evidence notes) is never translated.
 *
 * Nothing here shortens the reader: the S1–S5 levels render as a 1–5 scale with
 * the full description, and the S/P/I confidence ladder renders as words
 * (self-report / sample / instrumented).
 */

import type { Locale } from "../i18n";
import { byId, dimById, type Level } from "./criteria";
import { EN_CRITERIA, EN_DIMENSIONS } from "./criteria.en";
import { byPhase, BRANCHES, RISK_CHECKS, RISK_CLASSES, CONFIDENCE_LADDER } from "./phases";
import { SECTIONS_DE, STAGES_DE, ADVISORY_DE, SCORE_DIMENSIONS_DE, KNOCK_OUTS_DE } from "./model.de";
import type { Recommendation, WarnCode } from "./self-assessment";

const en = (locale: Locale) => locale !== "de";

// --------------------------------------------------------------- catalogue text
export interface DimText { label: string; question: string }
export interface CritText { label: string; question: string; evidence: string; scale: [string, string, string, string, string] }

export function dimText(locale: Locale, id: string): DimText {
  const de = dimById[id]!;
  const t = EN_DIMENSIONS[id];
  return en(locale) && t ? t : { label: de.label, question: de.question };
}

export function critText(locale: Locale, id: string): CritText {
  const de = byId[id]!;
  const t = EN_CRITERIA[id];
  return en(locale) && t ? t : { label: de.label, question: de.question, evidence: de.evidence, scale: de.scale };
}

// ------------------------------------------------------------------- phase text
export interface PhaseText { label: string; purpose: string; gate: { label: string; condition: string; fail: string } }

const EN_PHASES: Record<string, PhaseText> = {
  P0: {
    label: "Intake & prioritisation",
    purpose: "From all candidates (pull and push), pick the processes where value, spoke readiness and compounding potential justify the engagement — and cleanly defer the rest.",
    gate: { label: "Intake gate", condition: "Spoke minimum in place: a named owner with authority to change + a champion with capacity + a stated willingness to measure.", fail: "Defer — no engagement without a spoke, not even at high value." },
  },
  P1: {
    label: "Recon",
    purpose: "Understand the process as it really runs today — structure, tool chain, friction, organisation — and distil the goal statement from it.",
    gate: { label: "Recon gate", condition: "Goal statement drawn + a VSM sketch possible + catalogue scoring complete.", fail: "Close the gaps. No statable goal → kill candidate, escalate to the owner." },
  },
  P2: {
    label: "Baseline & diagnostics",
    purpose: "Back the recon narrative with numbers: where do the main latencies really sit, and with what confidence do we know it?",
    gate: { label: "Diagnostics gate", condition: "Main latencies named and evidenced at least at sample level; the latency profile separates hand-off latency from in-step latency.", fail: "Sharpen the survey — do not diagnose on anecdote (self-report). Exception: an inaccessible interface → branch 1b." },
  },
  P3: {
    label: "Diagnosis & branching",
    purpose: "From the latency profile and catalogue scoring, determine the dominant problem class and pick the branch — decidable, not by feel.",
    gate: { label: "Change-risk gate", condition: "All 7 checks evidenced, risk class (R1–R3) assigned, change tactic chosen, fallback path named.", fail: "R3 without carrying value → back into diagnosis (a cheaper intervention?) or honestly defer, with a reason." },
  },
  P4: {
    label: "Enabler step (intervention)",
    purpose: "Implement exactly one intervention in the chosen branch, at a test cadence that fits the component's health, and measure the effect.",
    gate: { label: "Effect gate", condition: "The KPI moves in the expected direction OR the hypothesis is cleanly falsified — both create knowledge.", fail: "Measurement unusable → back to phase 2. Falsification or open findings → back to phase 3." },
  },
  P5: {
    label: "Target state & hand-over",
    purpose: "Bring the process to a state where it monitors itself, and hand it back to the spoke — the hub withdraws.",
    gate: { label: "Operations gate", condition: "The spoke runs at least one full KPI cycle without the hub; instrumentation keeps running; the escalation threshold is armed.", fail: "The cadence breaks without the hub → hand-over incomplete, back to phase 5. Healthy only under supervision is not healthy." },
  },
};

export function phaseText(locale: Locale, id: string): PhaseText {
  const de = byPhase[id]!;
  if (en(locale) && EN_PHASES[id]) return EN_PHASES[id]!;
  return { label: de.label, purpose: de.purpose, gate: { label: de.gate.label, condition: de.gate.condition, fail: de.gate.fail } };
}

// ------------------------------------------------------------------ branch text
export interface BranchText { label: string; when: string; conditions: string[] }

const EN_BRANCHES: Record<string, BranchText> = {
  Z0: {
    label: "Kill (value-to-effort too low)",
    when: "Checked first — nothing is cheaper than a step you no longer do.",
    conditions: [
      "No consumer: no one can be named who reads or processes the output.",
      "Goal reachable without the step (a controlled switch-off test, with a fallback path).",
      "Negative balance: measured effort is out of all proportion to demonstrable value.",
    ],
  },
  Z1: {
    label: "Interfaces",
    when: "1b (not extractable) takes precedence — it blocks diagnostics itself and, through compounding, pays into every other process on the same system.",
    conditions: [
      "1a Friction in the interface design: the dominant latency sits BETWEEN the steps; data is transferred by hand across system breaks.",
      "1b Technical interfaces not accessible: the data points exist but cannot be exported (no API/report/access) — phase 2 cannot get past self-report here.",
    ],
  },
  Z2: {
    label: "Process design",
    when: "Even with perfect tools, the flow would miss the goal.",
    conditions: [
      "Thought experiment: with perfect tools and frictionless hand-offs the flow still misses the goal statement — sequence, loops or responsibilities are the problem.",
      "Latency WITHIN the steps: waiting on decisions, approval chains, rework.",
      "The VSM shows serial strands that could run in parallel.",
    ],
  },
  Z3: {
    label: "Toolbox evolution",
    when: "Process design holds, but the friction sits mechanically in the tool.",
    conditions: [
      "Friction WITHIN a step, mechanically attributable to the tool (manual consolidation, version conflicts, no multi-user operation, a capacity limit).",
      "An INCREMENTAL evolution step exists that preserves the process shape: Excel → SharePoint list → small app / Mendix. Smallest step, no big bang.",
      "Extra signal: the component should long since have changed (the need to iterate is there, iteration speed near zero).",
    ],
  },
};

export function branchText(locale: Locale, id: string): BranchText {
  const de = BRANCHES.find((b) => b.id === id)!;
  if (en(locale) && EN_BRANCHES[id]) return EN_BRANCHES[id]!;
  return { label: de.label, when: de.when, conditions: de.conditions };
}

// --------------------------------------------------------------- risk-tor text
export interface RiskClassText { label: string; tactic: string }
const EN_RISK_CLASSES: Record<string, RiskClassText> = {
  R1: { label: "iterate directly", tactic: "Small user base, no dependent processes, rollback trivial." },
  R2: { label: "parallel operation with a fallback path", tactic: "Several users or one dependent process; the old runs until the new has run one full cycle without fault, then a hard switch." },
  R3: { label: "strangler", tactic: "Many users, shadow usage likely; build alongside the existing one, migrate consumers one by one, switch off the old only when no one still reads it." },
};
export function riskClassText(locale: Locale, id: string): RiskClassText {
  const de = RISK_CLASSES.find((r) => r.id === id)!;
  if (en(locale) && EN_RISK_CLASSES[id]) return EN_RISK_CLASSES[id]!;
  return { label: de.label, tactic: de.tactic };
}

export interface RiskCheckText { label: string; how: string }
const EN_RISK_CHECKS: Record<number, RiskCheckText> = {
  1: { label: "User base", how: "Evaluate access/version history; otherwise distribution lists and a survey via the spoke." },
  2: { label: "Dependent processes", how: "Recon artefacts of the neighbourhood; ask the spoke network: „who else reads this?“" },
  3: { label: "Shadow usage", how: "An announcement test with a deadline — collect objections before anything changes; look for copies and links." },
  4: { label: "Reversibility", how: "Name the fallback path and dry-run it once." },
  5: { label: "Parallel operation", how: "Check technically and organisationally — who maintains what during the transition?" },
  6: { label: "Ownership", how: "Clarify ownership; external ownership means a change needs their involvement and cadence." },
  7: { label: "Literacy gap", how: "Hold recon literacy against the target state's required profile." },
};
export function riskCheckText(locale: Locale, n: number): RiskCheckText {
  const de = RISK_CHECKS.find((r) => r.n === n)!;
  if (en(locale) && EN_RISK_CHECKS[n]) return EN_RISK_CHECKS[n]!;
  return { label: de.label, how: de.how };
}

// ----------------------------------------------------- confidence ladder (S/P/I)
export interface ConfidenceText { id: "S" | "P" | "I"; word: string; label: string; meaning: string; enough: string }
const EN_CONFIDENCE: Record<"S" | "P" | "I", { word: string; label: string; meaning: string; enough: string }> = {
  S: { word: "Self-report", label: "Self-report (structured)", meaning: "The last 3–5 concrete cases reconstructed from inbox/calendar — real individual values, not felt averages.", enough: "Enough for triage, diagnostic direction, recon. Not for baseline claims in the business case or the branch decision." },
  P: { word: "Sample", label: "Sample", meaning: "Over at least one full process cycle, every case stamped at defined stations (routing slip / mandatory field), not self-observation.", enough: "Enough for the diagnostics gate, the branch decision, the KPI baseline." },
  I: { word: "Instrumented", label: "Instrumented", meaning: "Timestamps fall out as a by-product of the systems, without anyone stamping.", enough: "The target for steady state; the operations gate demands this (or, as a substitute, routine sample collection at a fixed cadence)." },
};
const DE_CONFIDENCE_WORD: Record<"S" | "P" | "I", string> = { S: "Selbstauskunft", P: "Stichprobe", I: "Instrumentiert" };

export function confidenceText(locale: Locale): ConfidenceText[] {
  return CONFIDENCE_LADDER.map((c) =>
    en(locale)
      ? { id: c.id, ...EN_CONFIDENCE[c.id] }
      : { id: c.id, word: DE_CONFIDENCE_WORD[c.id], label: c.label, meaning: c.meaning, enough: c.enough },
  );
}
/** The one word for a confidence code — the abbreviation never appears alone. */
export function confidenceWord(locale: Locale, code: "S" | "P" | "I"): string {
  return en(locale) ? EN_CONFIDENCE[code].word : DE_CONFIDENCE_WORD[code];
}

// ------------------------------------------------------------------ status text
export type Status = "gruen" | "gelb" | "rot" | "grau";
const STATUS: Record<Locale, Record<Status, { pill: string; full: string }>> = {
  en: {
    gruen: { pill: "Green", full: "Green — healthy" },
    gelb: { pill: "Amber", full: "Amber — needs action" },
    rot: { pill: "Red", full: "Red — sick" },
    grau: { pill: "Grey", full: "Grey — not yet assessed" },
  },
  de: {
    gruen: { pill: "Grün", full: "Grün — gesund" },
    gelb: { pill: "Gelb", full: "Gelb — Handlungsbedarf" },
    rot: { pill: "Rot", full: "Rot — krank" },
    grau: { pill: "Grau", full: "Grau — nicht erhoben" },
  },
};
/** The score model's traffic light, in words (hue is never the interface). */
export function lightLabel(locale: Locale, l: "red" | "amber" | "green" | "grey"): string {
  const EN = { red: "Red", amber: "Amber", green: "Green", grey: "Not assessed" };
  const DE = { red: "Rot", amber: "Gelb", green: "Grün", grey: "Nicht erhoben" };
  return (en(locale) ? EN : DE)[l];
}

export function statusPill(locale: Locale, s: Status): string { return STATUS[en(locale) ? "en" : "de"][s].pill; }
export function statusFull(locale: Locale, s: Status): string { return STATUS[en(locale) ? "en" : "de"][s].full; }

/** Localised one-line explanation of the health status, built from the profile. */
export interface ProfileLike {
  status: Status;
  knockOuts: { id: string; label: string; state: "pass" | "fail" | "open"; rated: boolean; level: number }[];
  dimensions: { id: string; label: string; score: number }[];
  coverage: number;
}
export function explainStatus(locale: Locale, p: ProfileLike): string {
  const E = en(locale);
  /** "D7 1.0" / "D7 1,0" — one decimal, so a score never reads as a bare integer. */
  const dim1 = (d: { id: string; score: number }) =>
    `${d.id} ${E ? d.score.toFixed(1) : d.score.toFixed(1).replace(".", ",")}`;
  const koFail = p.knockOuts.filter((k) => k.state === "fail");
  const belowRed = p.dimensions.filter((d) => d.score < 2.0);
  const belowGreen = p.dimensions.filter((d) => d.score < 3.0);
  const koOpen = p.knockOuts.filter((k) => k.state === "open");
  const pct = Math.round(p.coverage * 100);

  if (p.status === "grau") {
    return E
      ? "Nothing assessed yet. By convention (§1.3) every criterion would stand at level 1 — start the assessment."
      : "Noch nichts erhoben. Per Konvention (§1.3) stünde jedes Kriterium auf S1 — Erhebung starten.";
  }
  if (koFail.length) {
    const list = koFail.map((k) => `${k.id} ${critText(locale, k.id).label}`).join(", ");
    const un = koFail.filter((k) => !k.rated).map((k) => k.id);
    if (E) {
      const note = un.length ? ` (${un.join(", ")} not yet assessed)` : "";
      return `At least one knock-out at level 1: ${list}${note}. Optimisation claims are worthless — build the enabler first, then re-score.`;
    }
    const note = un.length ? ` (davon ${un.join(", ")} noch nicht erhoben)` : "";
    return `Mindestens ein K.o. auf S1: ${list}${note}. Optimierungsaussagen sind wertlos — erst Enabler, dann neu scoren.`;
  }
  if (belowRed.length >= 2) {
    const list = belowRed.map(dim1).join(", ");
    return E
      ? `At least two dimensions below 2.0: ${list}. One outlier is a finding, two are a pattern.`
      : `Mindestens zwei Dimensionen < 2,0: ${list}. Ein Ausreißer ist ein Befund, zwei sind ein Muster.`;
  }
  if (p.status === "gruen") {
    return E
      ? "All knock-outs at level 3 or better and every dimension at 3.0 or better — running and steerable."
      : "Alle K.o.-Kriterien ≥ S3 und alle Dimensionen ≥ 3,0 — läuft und ist steuerbar.";
  }
  const bits: string[] = [];
  if (koOpen.length) bits.push(E ? `${koOpen.map((k) => k.id).join(", ")} at level 2` : `${koOpen.map((k) => k.id).join(", ")} auf S2`);
  if (belowGreen.length) {
    const list = belowGreen.map(dim1).join(", ");
    bits.push(E ? `below 3.0 — ${list}` : `unter 3,0 — ${list}`);
  }
  return E
    ? `Needs attention: ${bits.join("; ") || "under supervision"}. (${pct}% assessed)`
    : `Handlungsbedarf: ${bits.join("; ") || "unter Aufsicht"}. (${pct} % erhoben)`;
}

// ---------------------------------------------------- direction vector (§6.4)
export type DirectionCode = "Z0" | "Z1" | "Z2" | "Z3" | "enablement" | "feedback";
const DIRECTION: Record<Locale, Record<DirectionCode, string>> = {
  en: {
    Z0: "Branch 0 — Kill: consumer-less steps with a negative balance (K3.4, K4.4).",
    Z1: "Branch 1 — Interfaces (1b before 1a): K5.1 or K2.2 at level 2 or below; latency between the steps (check K3.2).",
    Z2: "Branch 2 — Process design: D3 low while D2 is 3 or above; latency within the steps, loops and rework.",
    Z3: "Branch 3 — Toolbox evolution: friction in one step, K7.1 shows an iteration backlog.",
    enablement: "No branch first — enablement: D8 below 2.5, otherwise the literacy gap becomes the blocker at the risk gate.",
    feedback: "Build in a feedback loop (pull phase 5 forward): the process lives on habit, not on control.",
  },
  de: {
    Z0: "Zweig 0 — Killen: konsumentenlose Schritte bei negativem Saldo (K3.4, K4.4).",
    Z1: "Zweig 1 — Interfaces (1b vor 1a): K5.1 oder K2.2 ≤ S2; Latenz zwischen den Schritten (K3.2 prüfen).",
    Z2: "Zweig 2 — Prozessdesign: D3 niedrig bei D2 ≥ 3; Latenz in den Schritten, Schleifen/Nacharbeit.",
    Z3: "Zweig 3 — Toolbox-Evolution: Friktion in einem Schritt, K7.1 zeigt Iterationsstau.",
    enablement: "Kein Zweig zuerst: Befähigung — D8 < 2,5, sonst wird das Literacy-Delta am Risiko-Tor zum Blocker.",
    feedback: "Feedback-Loop einbauen (Phase 5 vorziehen): der Prozess lebt von Gewohnheit, nicht von Steuerung.",
  },
};
export function directionText(locale: Locale, code: string): string {
  const dict = DIRECTION[en(locale) ? "en" : "de"];
  return dict[code as DirectionCode] ?? code;
}

// -------------------------------------------------------------- triage (§7.3)
const TRIAGE: Record<Locale, Record<Recommendation, { headline: string; reason: string }>> = {
  en: {
    aufnehmen: { headline: "Take it on", reason: "Spoke minimum plausible and no knock-out at level 1. The process goes into the full assessment." },
    enabler: { headline: "Take it on — as an enabler (branch 1b)", reason: "" },
    zurueckstellen: { headline: "Defer", reason: "No named owner with authority to change (K8.1 = level 1). No engagement without a spoke — not even at high value." },
    selbsthilfe: { headline: "To the spoke — self-serve with a playbook", reason: "Spoke strong, measurable, documented, goal clear — the spoke can carry this with a playbook. Save hub time for harder processes." },
  },
  de: {
    aufnehmen: { headline: "Aufnehmen", reason: "Spoke-Minimum plausibel und keine K.o. auf S1. Der Prozess geht ins volle Assessment." },
    enabler: { headline: "Aufnehmen — als Enabler (Zweig 1b)", reason: "" },
    zurueckstellen: { headline: "Zurückstellen", reason: "Kein benannter Verantwortlicher mit Änderungsbefugnis (K8.1=S1). Kein Engagement ohne Spoke — auch nicht bei hohem Value." },
    selbsthilfe: { headline: "An den Spoke — Selbsthilfe mit Playbook", reason: "Spoke stark, messbar, dokumentiert, Ziel klar — das trägt der Spoke mit einem Playbook selbst. Hub-Zeit für schwierigere Prozesse aufsparen." },
  },
};
const WARN: Record<Locale, Record<WarnCode, string>> = {
  en: {
    "no-goal": "Goal statement missing (K4.1 = 1) — a kill candidate at the recon gate if no goal can be stated.",
    "thin-value": "Quantity / business basis thin (K4.4) — sharpen the addressable value before prioritising.",
    "no-map": "No current process representation (K1.1) — recon produces it, but the start is more expensive.",
    "no-leadtime": "Lead time not measured (K3.1) — pull it up to sample level in the baseline.",
  },
  de: {
    "no-goal": "Ziel-Statement fehlt (K4.1=S1) — am Recon-Tor Kill-Kandidat, wenn kein Ziel formulierbar ist.",
    "thin-value": "Mengengerüst/Business-Bezug dünn (K4.4) — Addressable Value vor der Priorisierung schärfen.",
    "no-map": "Keine aktuelle Prozessdarstellung (K1.1) — die Recon erzeugt sie, aber der Start ist teurer.",
    "no-leadtime": "Durchlaufzeit nicht gemessen (K3.1) — Stufe P in der Baseline nachziehen.",
  },
};
export function triageHeadline(locale: Locale, r: Recommendation): string {
  return TRIAGE[en(locale) ? "en" : "de"][r].headline;
}
export function triageReason(locale: Locale, r: Recommendation, enablerWhich: ("K5.1" | "K2.2")[]): string {
  const L = en(locale) ? "en" : "de";
  if (r === "enabler") {
    const which = enablerWhich
      .map((id) => (id === "K5.1" ? (L === "en" ? "measurability (K5.1)" : "Messbarkeit (K5.1)") : L === "en" ? "interface access (K2.2)" : "Interface-Zugang (K2.2)"))
      .join(L === "en" ? " and " : " und ");
    return L === "en"
      ? `Optimisation knock-out: ${which} at level 1. First and only intervention: establish that (branch 1b) — no optimisation promise beyond it.`
      : `Optimierungs-K.o.: ${which} auf S1. Erste und einzige Intervention: das herstellen (Zweig 1b) — kein Optimierungsversprechen darüber hinaus.`;
  }
  return TRIAGE[L][r].reason;
}
export function warnText(locale: Locale, code: WarnCode): string {
  return WARN[en(locale) ? "en" : "de"][code];
}

// ----------------------------------------------------------------- misc labels
export function anflugLabel(locale: Locale, a: "process" | "technology"): string {
  if (en(locale)) return a === "technology" ? "Technology push" : "Process pull";
  return a === "technology" ? "Technologie-Push" : "Prozess-Pull";
}
export function koClassLabel(locale: Locale, k: "intake" | "optimisation"): string {
  if (en(locale)) return k === "intake" ? "Intake knock-out" : "Optimisation knock-out";
  return k === "intake" ? "Aufnahme-K.o." : "Optimierungs-K.o.";
}
export function koStateLabel(locale: Locale, s: "pass" | "fail" | "open"): string {
  if (en(locale)) return s === "pass" ? "passed" : s === "fail" ? "failed" : "open";
  return s === "pass" ? "bestanden" : s === "fail" ? "gescheitert" : "offen";
}

// ---------------------------------------------------------------- UI chrome dict
const UI_EN: Record<string, string> = {
  "nav.home": "Home",
  "funnel.title": "Process Funnel",
  "badge.prefunnel": "pre-funnel",
  "badge.offline": "offline · rule-based analysis",
  "funnel.tagline": "Process health before the engagement: assess, branch, and clarify the change risk — one cockpit per diagnosis.",
  "list.heading": "Diagnoses",
  "tile.notAssessed": "not assessed",
  "tile.assessed": "assessed",
  "tile.koFailed": "knock-out failed",
  "tile.phases": "Phases",
  "loading": "Loading…",
  "list.empty": "No diagnosis yet. Start one on the right.",
  "row.noOwner": "no owner",
  "prefilter.title": "Pre-filter · short self-assessment",
  "prefilter.sub": "Seven criteria, roughly self-rated — cheap, and it scales. Decides before hub time is spent.",
  "prefilter.seeded": "The levels carry into the diagnosis as a starting rating (self-report confidence).",
  "create.title": "New diagnosis",
  "create.sub": "One process, one spoke, one approach direction.",
  "field.process": "Process",
  "field.owner": "Owner",
  "field.champion": "Champion",
  "field.unit": "Unit / cost centre",
  "field.anflug": "Approach",
  "field.components": "Core components (comma-separated)",
  "create.deferWarn": "The pre-filter recommends deferring (no spoke). Take it on only with a justified exception.",
  "create.open": "New diagnosis",
  "dialog.close": "Close",
  "btn.start": "Start diagnosis",
  "btn.starting": "Starting…",
  "rated": "rated",
  "back": "Back",
  "coverage": "Coverage",
  "stat.coverage": "Anamnesis assessed",
  "score.partial": "partial evidence",
  "digest.heading": "Engagement digest",
  "stat.portfolio": "Portfolio value",
  "stat.portfolioNote": "ranking only — never reported alone",
  "stat.phase": "Current stage",
  "report.link": "Report (Markdown)",
  "report.title": "Process diagnosis",
  "report.anamnesis": "Anamnesis",
  "report.light": "Traffic light",
  "report.notFilled": "not filled in",
  "report.catalogueNote": "A second reading of the same process, scored separately. It does not drive the traffic light above.",
  "report.digestNote": "Derived from the anamnesis — not a finding.",
  "report.drivers": "What the colour rests on",
  "report.nothing": "Nothing has been filled in yet.",
  "report.score": "Score",
  "report.coverage": "Coverage",
  "report.catalogueAssessed": "Catalogue assessed",
  "tabs.label": "Diagnosis sections",
  "tab.overview": "Overview",
  "tab.catalogue": "Catalogue",
  "tab.advisory": "Advisory",
  "digest.none": "No overview yet.",
  "digest.derivedFrom": "Derived from the sections below.",
  "digest.generate": "Generate overview",
  "digest.regenerate": "Regenerate",
  "digest.paste": "Paste result",
  "digest.pasteHint": "Ran the prompt elsewhere? Paste the reply — the JSON is read out of it.",
  "digest.pasteSave": "Save overview",
  "digest.pasteCancel": "Cancel",
  "digest.pasted": "pasted — run outside the portal",
  "digest.derived": "derived — not a finding",
  "digest.confidence": "confidence",
  "digest.process": "Process",
  "digest.processScore": "process score",
  "digest.technology": "Technology",
  "digest.technologyScore": "technology score",
  "digest.tools": "Tools",
  "digest.tool": "Tool",
  "digest.velocity": "Velocity of change",
  "digest.criticality": "Criticality of touch",
  "digest.demand": "Demand of touch",
  "digest.friction": "Friction",
  "digest.actual": "Actual",
  "digest.potential": "Potential",
  "digest.prunable": "Prunable",
  "digest.influences": "Influences",
  "digest.influencedBy": "Influenced by",
  "digest.notDiscussed": "not discussed in the anamnesis",
  "digest.gaps": "Gaps",
  "digest.noneRecorded": "none recorded",
  "digest.cost": "cost",
  "score.heading": "Score profile",
  "score.overall": "Overall",
  "score.notAssessed": "not assessed",
  "score.knockOuts": "Knock-outs",
  "advisory.intro": "Derived from the anamnesis — proposals, not findings. Each carries a verdict, and rejecting one carries a reason.",
  "advisory.run": "Run pass",
  "advisory.notRun": "This pass has not been run yet.",
  "advisory.standsOn": "Sections this pass depends on are still empty",
  "advisory.verdicts": "verdicts",
  "advisory.proposalId": "Proposal id",
  "advisory.reason": "Reason",
  "advisory.accepted": "Accept",
  "advisory.rejected": "Reject",
  "advisory.deferred": "Defer",
  "advisory.rejectNeedsReason": "A rejection needs a reason — a proposal that quietly disappears teaches nobody anything.",
  "tab.profile": "Profile",
  "tab.analyse": "Analysis & demands",
  "ko.heading": "Knock-outs",
  "ko.notRated": "not assessed → level 1 (§1.3)",
  "ko.cleared": "cleared",
  "dim.heading": "Dimension profile",
  "dim.weight": "Weight",
  "dim.worst": "weakest component",
  "directions.heading": "Direction vector (pre-indication)",
  "analyse.intro": "This is where a diagnosis becomes work. The agent reads the finished assessment — the knock-outs, the weak dimensions, the chosen branch and the written artefacts — and proposes separate demands. Nothing is created until you confirm it below.",
  "analyse.order": "Enablers come first. If a knock-out sits at level 1 — no spoke, no measurability, no interface access — building that is the only intervention the catalogue allows (§5), so it is the only thing proposed. Optimisation demands on top of it would be a promise nobody can keep.",
  "analyse.step1": "1 · Analyse the diagnosis",
  "analyse.step2": "2 · Review and create",
  "analyse.blocked": "Nothing has been assessed yet, so there is nothing to derive. Every criterion would stand at level 1 by convention (§1.3) — proposing demands from that would put fiction into the demand funnel. Rate the catalogue first.",
  "analyse.thin": "Only {pct} % of the catalogue is assessed. What comes out will be thin — the agent can only work from what has actually been rated.",
  "analyse.goAssess": "Go to the profile",
  "analyse.empty": "The diagnosis gives no cause for a demand — no knock-out is failing and no dimension is below 3.0.",
  "analyse.basis": "From the diagnosis",
  "analyse.destination": "Created in the demand funnel (du-demands), where they run through the normal intake.",
  "analyse.openFunnel": "Open the demand funnel",
  "analyse.existing": "Demands already created",
  "btn.analyse": "Analyse",
  "btn.analysing": "Analysing…",
  "analyse.running": "The agent is breaking down the diagnosis…",
  "analyse.offline": "no model key: rule-based proposal",
  "proposals.heading": "Proposed demands",
  "proposals.none": "No demands proposed.",
  "proposals.create": "create",
  "field.title": "Title",
  "field.problem": "Problem",
  "field.lane": "Lane",
  "lane.auto": "— automatic —",
  "proposals.basis": "Basis",
  "btn.createSelected": "Create selected demands",
  "btn.creating": "Creating…",
  "created.heading": "Created",
  "gate.label": "Gate",
  "gate.pass": "✓ Passed",
  "gate.fail": "✕ Failed",
  "gate.open": "○ open",
  "gate.reason": "Reason",
  "btn.gatePass": "Pass gate",
  "btn.gateFail": "Fail gate",
  "btn.setCurrent": "Set as current phase",
  "gate.failReason": "Reason (required when failing)",
  "gate.failPlaceholder": "Why was the gate missed?",
  "btn.confirmFail": "Confirm fail",
  "btn.cancel": "Cancel",
  "btn.close": "Close",
  "prompt.copy": "Copy prompt",
  "prompt.copied": "copied ✓",
  "prompt.title": "Coaching prompt",
  "prompt.manual": "Copying was blocked by the browser — select the text below and copy it.",
  "prompt.offline": "No model key configured. Copy the prompt, run it in your assistant, and paste the result back here.",
  "artefacts.heading": "Artefacts",
  "sections.heading": "Sections",
  "section.locked": "locked",
  "section.gate": "gate",
  "section.gateQuestion": "Gate question",
  "section.waitingFor": "Waiting for",
  "anamnesis.intro": "The anamnesis is a sequence, not a checklist: each section unlocks when the ones it depends on are done, and a gate section can fail and stop the run.",
  "catalog.heading": "Catalogue scoring (D1–D8)",
  "btn.assess": "assess",
  "branch.heading": "Branch",
  "risk.heading": "Risk class",
  "riskchecks.heading": "Change risk — 7 checks",
  "collapse": "collapse ▲",
  "expand": "expand ▼",
  "field.answer": "Answer",
  "field.evidence": "Evidence",
  "btn.save": "Save",
  "btn.saving": "Saving…",
  "dim.value": "Dimension value",
  "section.rating": "Rating",
  "section.coaching": "Coaching",
  "evidence.inline": "Evidence",
  "perComp.badge": "per core component",
  "perComp.none": "No core components set — add them in the cockpit, then rate here.",
  "component": "Component",
  "field.confidence": "Confidence",
  "btn.clearLevel": "Clear level",
  "coach.off": "Live coaching off — manual rating still possible.",
  "coach.ask": "Ask the coach about assessing this dimension.",
  "coach.thinking": "Coach is thinking…",
  "msg.you": "You",
  "msg.coach": "Coach",
  "input.message": "Message…",
  "btn.send": "Send",
  "note.label": "Note / evidence",
  "note.saved": "saved",
  "note.unsaved": "unsaved",
  "note.placeholder": "Observations, evidence, quotes…",
  "artefact.filled": "filled",
  "artefact.empty": "empty",
  "artefact.open": "Open ▼",
  "artefact.close": "Close ▲",
  "btn.loadTemplate": "Load template",
  "btn.preview": "Preview",
  "btn.edit": "Edit",
  "btn.aiGenerate": "Generate with AI",
  "artefact.savedTick": "saved ✓",
  "artefact.truncated": "saved, but the model ran out of room — this document is cut off. Re-run or shorten the input.",
  "artefact.noKey": "No model key — copy the prompt and run it in your own assistant.",
  "artefact.noContent": "No content.",
  "placeholder.process": "Raw-material goods receipt",
  "placeholder.components": "SAP MM, Excel list, Mendix app",
};

const UI_DE: Record<string, string> = {
  "nav.home": "Home",
  "funnel.title": "Process Funnel",
  "badge.prefunnel": "pre-funnel",
  "badge.offline": "offline · Analyse regelbasiert",
  "funnel.tagline": "Prozessgesundheit vor dem Engagement: bewerten, verzweigen, das Änderungsrisiko klären — ein Cockpit je Diagnose.",
  "list.heading": "Diagnosen",
  "tile.notAssessed": "nicht erhoben",
  "tile.assessed": "erhoben",
  "tile.koFailed": "K.o. gescheitert",
  "tile.phases": "Phasen",
  "loading": "Lädt…",
  "list.empty": "Noch keine Diagnose. Rechts eine neue starten.",
  "row.noOwner": "kein Owner",
  "prefilter.title": "Vorfilter · Kurzform-Selbstbewertung",
  "prefilter.sub": "Sieben Kriterien, grob selbst eingestuft — billig und skaliert. Entscheidet, bevor Hub-Zeit fließt.",
  "prefilter.seeded": "Die Stufen werden als Startbewertung (Konfidenz Selbstauskunft) in die Diagnose übernommen.",
  "create.title": "Neue Diagnose",
  "create.sub": "Ein Prozess, ein Spoke, eine Anflugrichtung.",
  "field.process": "Prozess",
  "field.owner": "Verantwortlicher",
  "field.champion": "Champion",
  "field.unit": "Einheit / Kostenstelle",
  "field.anflug": "Anflug",
  "field.components": "Kernkomponenten (kommagetrennt)",
  "create.deferWarn": "Vorfilter empfiehlt Zurückstellen (kein Spoke). Aufnahme nur mit begründeter Ausnahme.",
  "create.open": "Neue Diagnose",
  "dialog.close": "Schließen",
  "btn.start": "Diagnose starten",
  "btn.starting": "Startet…",
  "rated": "bewertet",
  "back": "zurück",
  "coverage": "Abdeckung",
  "stat.coverage": "Anamnese erhoben",
  "score.partial": "Teilbeleg",
  "digest.heading": "Engagement-Überblick",
  "stat.portfolio": "Portfolio-Wert",
  "stat.portfolioNote": "nur zur Reihung — nie allein berichtet",
  "stat.phase": "Aktuelle Stufe",
  "report.link": "Bericht (Markdown)",
  "report.title": "Prozessdiagnose",
  "report.anamnesis": "Anamnese",
  "report.light": "Ampel",
  "report.notFilled": "nicht ausgefüllt",
  "report.catalogueNote": "Eine zweite Lesart desselben Prozesses, getrennt bewertet. Sie steuert die Ampel oben nicht.",
  "report.digestNote": "Abgeleitet aus der Anamnese — kein Befund.",
  "report.drivers": "Worauf die Farbe beruht",
  "report.nothing": "Es ist noch nichts ausgefüllt.",
  "report.score": "Bewertung",
  "report.coverage": "Erhebung",
  "report.catalogueAssessed": "Katalog erhoben",
  "tabs.label": "Abschnitte der Diagnose",
  "tab.overview": "Überblick",
  "tab.catalogue": "Katalog",
  "tab.advisory": "Beratung",
  "digest.none": "Noch kein Überblick.",
  "digest.derivedFrom": "Abgeleitet aus den Abschnitten unten.",
  "digest.generate": "Überblick erzeugen",
  "digest.regenerate": "Neu erzeugen",
  "digest.paste": "Ergebnis einfügen",
  "digest.pasteHint": "Prompt anderswo ausgeführt? Antwort einfügen — das JSON wird daraus gelesen.",
  "digest.pasteSave": "Überblick speichern",
  "digest.pasteCancel": "Abbrechen",
  "digest.pasted": "eingefügt — außerhalb des Portals erzeugt",
  "digest.derived": "abgeleitet — kein Befund",
  "digest.confidence": "Konfidenz",
  "digest.process": "Prozess",
  "digest.processScore": "Prozess-Score",
  "digest.technology": "Technologie",
  "digest.technologyScore": "Technologie-Score",
  "digest.tools": "Werkzeuge",
  "digest.tool": "Werkzeug",
  "digest.velocity": "Änderungsgeschwindigkeit",
  "digest.criticality": "Kritikalität einer Änderung",
  "digest.demand": "Änderungsbedarf",
  "digest.friction": "Friktion",
  "digest.actual": "Akut",
  "digest.potential": "Potenziell",
  "digest.prunable": "Streichbar",
  "digest.influences": "Beeinflusst",
  "digest.influencedBy": "Beeinflusst von",
  "digest.notDiscussed": "in der Anamnese nicht besprochen",
  "digest.gaps": "Lücken",
  "digest.noneRecorded": "nichts erfasst",
  "digest.cost": "Kosten",
  "score.heading": "Score-Profil",
  "score.overall": "Gesamt",
  "score.notAssessed": "nicht erhoben",
  "score.knockOuts": "Knock-outs",
  "advisory.intro": "Abgeleitet aus der Anamnese — Vorschläge, keine Befunde. Jeder trägt ein Verdikt, und eine Ablehnung trägt eine Begründung.",
  "advisory.run": "Durchlauf starten",
  "advisory.notRun": "Dieser Durchlauf wurde noch nicht gefahren.",
  "advisory.standsOn": "Abschnitte, auf die dieser Durchlauf angewiesen ist, sind noch leer",
  "advisory.verdicts": "Verdikte",
  "advisory.proposalId": "Vorschlags-ID",
  "advisory.reason": "Begründung",
  "advisory.accepted": "Annehmen",
  "advisory.rejected": "Ablehnen",
  "advisory.deferred": "Zurückstellen",
  "advisory.rejectNeedsReason": "Eine Ablehnung braucht eine Begründung — ein Vorschlag, der stillschweigend verschwindet, lehrt niemanden etwas.",
  "tab.profile": "Profil",
  "tab.analyse": "Analyse & Bedarfe",
  "ko.heading": "Knock-outs",
  "ko.notRated": "nicht erhoben → S1 (§1.3)",
  "ko.cleared": "freigegeben",
  "dim.heading": "Dimensionsprofil",
  "dim.weight": "Gewicht",
  "dim.worst": "schwächste Komponente",
  "directions.heading": "Richtungsvektor (Vorindikation)",
  "analyse.intro": "Hier wird aus der Diagnose Arbeit. Der Agent liest die fertige Erhebung — K.o.-Kriterien, schwache Dimensionen, gewählten Zweig und die geschriebenen Artefakte — und schlägt einzelne Bedarfe vor. Angelegt wird erst, wenn Sie unten bestätigen.",
  "analyse.order": "Enabler zuerst. Steht ein K.o. auf S1 — kein Spoke, keine Messbarkeit, kein Interface-Zugang — ist dessen Herstellung die einzige zulässige Intervention (§5) und damit das Einzige, was vorgeschlagen wird. Optimierungsbedarfe darüber wären ein Versprechen, das niemand halten kann.",
  "analyse.step1": "1 · Diagnose analysieren",
  "analyse.step2": "2 · Prüfen und anlegen",
  "analyse.blocked": "Es ist noch nichts erhoben, also gibt es nichts abzuleiten. Per Konvention (§1.3) stünde jedes Kriterium auf S1 — daraus Bedarfe vorzuschlagen hieße, Fiktion in den Bedarfs-Funnel zu schreiben. Erst den Katalog bewerten.",
  "analyse.thin": "Erst {pct} % des Katalogs sind erhoben. Das Ergebnis bleibt dünn — der Agent kann nur aus dem arbeiten, was tatsächlich bewertet wurde.",
  "analyse.goAssess": "Zum Profil",
  "analyse.empty": "Die Diagnose gibt keinen Bedarf her — kein K.o. gescheitert und keine Dimension unter 3,0.",
  "analyse.basis": "Aus der Diagnose",
  "analyse.destination": "Angelegt im Bedarfs-Funnel (du-demands), wo sie das normale Intake durchlaufen.",
  "analyse.openFunnel": "Bedarfs-Funnel öffnen",
  "analyse.existing": "Bereits angelegte Bedarfe",
  "btn.analyse": "Analysieren",
  "btn.analysing": "Analysiert…",
  "analyse.running": "Der Agent zerlegt die Diagnose…",
  "analyse.offline": "ohne Modell-Key: regelbasierter Vorschlag",
  "proposals.heading": "Vorgeschlagene Bedarfe",
  "proposals.none": "Keine Bedarfe vorgeschlagen.",
  "proposals.create": "anlegen",
  "field.title": "Titel",
  "field.problem": "Problem",
  "field.lane": "Lane",
  "lane.auto": "— automatisch —",
  "proposals.basis": "Basis",
  "btn.createSelected": "Ausgewählte Bedarfe anlegen",
  "btn.creating": "Legt an…",
  "created.heading": "Angelegt",
  "gate.label": "Tor",
  "gate.pass": "✓ Bestanden",
  "gate.fail": "✕ Verfehlt",
  "gate.open": "○ offen",
  "gate.reason": "Grund",
  "btn.gatePass": "Tor bestehen",
  "btn.gateFail": "Tor verfehlen",
  "btn.setCurrent": "Als aktuelle Phase setzen",
  "gate.failReason": "Grund (Pflicht bei Verfehlen)",
  "gate.failPlaceholder": "Warum wurde das Tor verfehlt?",
  "btn.confirmFail": "Verfehlen bestätigen",
  "btn.cancel": "Abbrechen",
  "btn.close": "Schließen",
  "prompt.copy": "Prompt kopieren",
  "prompt.copied": "kopiert ✓",
  "prompt.title": "Coaching-Prompt",
  "prompt.manual": "Der Browser hat das Kopieren blockiert — Text unten markieren und kopieren.",
  "prompt.offline": "Kein Modell-Key hinterlegt. Prompt kopieren, im eigenen Assistenten fahren und das Ergebnis hier wieder einsetzen.",
  "artefacts.heading": "Artefakte",
  "sections.heading": "Abschnitte",
  "section.locked": "gesperrt",
  "section.gate": "Tor",
  "section.gateQuestion": "Tor-Frage",
  "section.waitingFor": "Wartet auf",
  "anamnesis.intro": "Die Anamnese ist eine Sequenz, keine Checkliste: Jeder Abschnitt wird frei, wenn die Abschnitte, von denen er abhängt, fertig sind — und ein Tor-Abschnitt kann scheitern und den Lauf stoppen.",
  "catalog.heading": "Katalog-Scoring (D1–D8)",
  "btn.assess": "bewerten",
  "branch.heading": "Zweig",
  "risk.heading": "Risikoklasse",
  "riskchecks.heading": "Änderungsrisiko — 7 Prüfpunkte",
  "collapse": "einklappen ▲",
  "expand": "ausklappen ▼",
  "field.answer": "Antwort",
  "field.evidence": "Evidenz",
  "btn.save": "Speichern",
  "btn.saving": "Speichert…",
  "dim.value": "Dimensionswert",
  "section.rating": "Bewertung",
  "section.coaching": "Coaching",
  "evidence.inline": "Evidenz",
  "perComp.badge": "je Kernkomponente",
  "perComp.none": "Keine Kernkomponenten hinterlegt — im Cockpit ergänzen, dann hier bewerten.",
  "component": "Komponente",
  "field.confidence": "Konfidenz",
  "btn.clearLevel": "Stufe löschen",
  "coach.off": "Live-Coaching aus — manuelle Bewertung weiter möglich.",
  "coach.ask": "Frag den Coach zur Erhebung dieser Dimension.",
  "coach.thinking": "Coach denkt…",
  "msg.you": "Du",
  "msg.coach": "Coach",
  "input.message": "Nachricht…",
  "btn.send": "Senden",
  "note.label": "Notiz / Evidenz",
  "note.saved": "gespeichert",
  "note.unsaved": "ungespeichert",
  "note.placeholder": "Beobachtungen, Belege, Zitate…",
  "artefact.filled": "gefüllt",
  "artefact.empty": "leer",
  "artefact.open": "Öffnen ▼",
  "artefact.close": "Schließen ▲",
  "btn.loadTemplate": "Vorlage laden",
  "btn.preview": "Vorschau",
  "btn.edit": "Bearbeiten",
  "btn.aiGenerate": "Mit KI erzeugen",
  "artefact.savedTick": "gespeichert ✓",
  "artefact.truncated": "gespeichert, aber dem Modell ging der Platz aus — dieses Dokument ist abgeschnitten. Erneut erzeugen oder Eingabe kürzen.",
  "artefact.noKey": "Kein Modell-Key — Prompt kopieren und im eigenen Assistenten fahren.",
  "artefact.noContent": "Kein Inhalt.",
  "placeholder.process": "Wareneingang Rohmaterial",
  "placeholder.components": "SAP MM, Excel-Liste, Mendix-App",
};

/** Process-module chrome string for a locale (English default, German second). */
export function pc(locale: Locale, key: string): string {
  const dict = en(locale) ? UI_EN : UI_DE;
  return dict[key] ?? UI_EN[key] ?? key;
}

// =============================================================== ported model
//
// `sections.ts`, `advisory.ts` and `score-model.ts` are verbatim ports and stay
// English — the grader matches English headings and the score model was checked
// against the original case by case. The German reading is an overlay keyed by
// the same ids (see model.de.ts), so nothing in the engine has to move.
//
// English therefore always resolves to the source object's own string: there is
// no second English copy to drift.

export function sectionText<T extends { key: string; label: string; description: string; gateQuestion?: string }>(
  locale: Locale,
  s: T,
): { label: string; description: string; gateQuestion?: string } {
  const de = SECTIONS_DE[s.key];
  if (en(locale) || !de) {
    return { label: s.label, description: s.description, ...(s.gateQuestion ? { gateQuestion: s.gateQuestion } : {}) };
  }
  // A gate question the overlay does not carry falls back to the English one
  // rather than vanishing — a missing gate question is worse than a foreign one.
  const q = de.gateQuestion ?? s.gateQuestion;
  return { label: de.label, description: de.description, ...(q ? { gateQuestion: q } : {}) };
}

export function stageText<T extends { id: string; label: string; subtitle: string }>(
  locale: Locale,
  g: T,
): { label: string; subtitle: string } {
  const de = STAGES_DE[g.id];
  return en(locale) || !de ? { label: g.label, subtitle: g.subtitle } : de;
}

export function advisoryText<T extends { key: string; label: string; description: string }>(
  locale: Locale,
  a: T,
): { label: string; description: string } {
  const de = ADVISORY_DE[a.key];
  return en(locale) || !de ? { label: a.label, description: a.description } : de;
}

export function scoreDimLabel(locale: Locale, key: string, fallback: string): string {
  return (en(locale) ? undefined : SCORE_DIMENSIONS_DE[key]) ?? fallback;
}

export function koLabel(locale: Locale, key: string, fallback: string): string {
  return (en(locale) ? undefined : KNOCK_OUTS_DE[key]?.label) ?? fallback;
}

// ------------------------------------------------- the score model's sentences
//
// The engine writes its own English prose and carries a matching code for every
// sentence (TextCode). English reads the prose; German is built from the code, so
// no one has to parse a sentence back into facts to translate it.

type Params = Record<string, string | number>;

const deSection = (key: string) => SECTIONS_DE[key]?.label ?? key;
const deDim = (key: string) => SCORE_DIMENSIONS_DE[key] ?? key;
const deKo = (key: string) => KNOCK_OUTS_DE[key];
/** "visibility,carry" → "Sichtbarkeit, Organisatorische Tragfähigkeit" */
const deDims = (csv: string) => String(csv).split(",").filter(Boolean).map(deDim).join(", ");

function deCode(code: string, p: Params): string {
  const s = (k: string) => String(p[k] ?? "");
  switch (code) {
    // knock-out notes
    case "ko.verdict": return `erfasstes Verdikt zu „${deSection(s("source"))}“`;
    case "ko.notAssessed": return `${deSection(s("section"))} nicht erhoben`;
    case "ko.weakEvidence":
      return `${deSection(s("section"))} mit ${s("score")} bewertet — das Artefakt trägt den Beleg nicht`;
    case "ko.noVerdict":
      return `${deSection(s("section"))} mit ${s("score")} bewertet, aber es ist kein Gate-Verdikt erfasst`;

    // the light
    case "light.noProfile": return "Es konnte kein Profil berechnet werden.";
    case "light.koFailedOne": {
      const k = deKo(s("ko"));
      return k ? `Knock-out nicht bestanden: ${k.label}. ${k.consequence}` : "Knock-out nicht bestanden.";
    }
    case "light.koFailedMany":
      return `${s("n")} Knock-outs nicht bestanden: ${String(p.kos ?? "").split(",").filter(Boolean)
        .map((k) => deKo(k)?.label ?? k).join(", ")}.`;
    case "light.visibilityFloor":
      return `Die Sichtbarkeit liegt bei ${s("score")}. Was an diesem Prozess ausgeliefert wird, ließe sich nicht ablesen — also lässt sich auch nichts auf Belegen verbessern.`;
    case "light.dimsBelow":
      return `${s("n")} Dimensionen unter ${s("floor")}: ${deDims(s("dims"))}. Eine ist ein Befund, zwei sind ein Muster.`;
    case "light.greyEmpty": return "Nicht erhoben. Es ist noch kein Abschnitt ausgefüllt.";
    case "light.greyThin":
      return `Nicht erhoben. Erst ${s("pct")} % des Modells sind durch ein Artefakt belegt.`;
    case "light.green":
      return "Alle drei Knock-outs freigegeben, jede Dimension erhoben und auf oder über der Grün-Schwelle.";

    // drivers
    case "driver.koFailed": {
      const k = deKo(s("ko"));
      return k ? `${k.label}: nicht bestanden — ${k.consequence}` : "Knock-out nicht bestanden";
    }
    case "driver.visibilityFloor":
      return `Sichtbarkeit ${s("score")} — unter ${s("floor")}; kein Inkrement wäre ablesbar.`;
    case "driver.dimBelow":
      return `${deDim(s("dim"))} ${s("score")} — unter ${s("floor")}.`;
    case "driver.weakest": return `Schwächste Dimension: ${deDim(s("dim"))} ${s("score")}`;
    case "driver.weakestNone": return "Schwächste Dimension: keine bewertet";

    // what still blocks green
    case "blocker.gateFailed":
      return `Gate nicht bestanden und noch nicht erneut gefahren: ${String(p.sections ?? "").split(",")
        .filter(Boolean).map(deSection).join(", ")}`;
    case "blocker.koNoVerdict": return `${s("n")} Knock-out(s) ohne erfasstes Verdikt`;
    case "blocker.dimsUnassessed": return `${deDims(s("dims"))} nicht ausreichend erhoben`;
    case "blocker.dimsWeak":
      return `${String(p.dims ?? "").split(",").filter(Boolean).map((pair) => {
        const [k = "", v = ""] = pair.split(":");
        return `${deDim(k)} ${v}`;
      }).join(", ")} unter ${s("floor")}`;
    case "blocker.coverage": return `Erhebungsgrad ${s("pct")} % unter ${s("floor")} %`;

    default: return "";
  }
}

export interface LightLike {
  reason: string;
  drivers: string[];
  reasonCode?: { code: string; params?: Params };
  driverCodes?: { code: string; params?: Params }[];
}

/** The one-line reason for the colour. */
export function explainLight(locale: Locale, t: LightLike): string {
  if (en(locale) || !t.reasonCode) return t.reason;
  // Amber has no sentence of its own: it IS the list of what still blocks green.
  if (t.reasonCode.code === "light.amber") {
    const list = lightDrivers(locale, t);
    return list.length ? `Zu tun: ${list.join("; ")}.` : t.reason;
  }
  return deCode(t.reasonCode.code, t.reasonCode.params ?? {}) || t.reason;
}

/** The reason, itemised. */
export function lightDrivers(locale: Locale, t: LightLike): string[] {
  if (en(locale) || !t.driverCodes) return t.drivers;
  return t.driverCodes.map((c, i) => deCode(c.code, c.params ?? {}) || t.drivers[i] || "").filter(Boolean);
}

/** A knock-out's one-line note ("diagnostics not assessed"). */
export function koNote(locale: Locale, k: { note: string; noteCode?: { code: string; params?: Params } }): string {
  if (en(locale) || !k.noteCode) return k.note;
  return deCode(k.noteCode.code, k.noteCode.params ?? {}) || k.note;
}

/** Stage label when only the id is at hand (tiles, progress strips). */
export function stageLabel(locale: Locale, id: string, fallback: string): string {
  return (en(locale) ? undefined : STAGES_DE[id]?.label) ?? fallback;
}
