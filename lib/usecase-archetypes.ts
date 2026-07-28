/**
 * Use-case ARCHETYPES — the second grounding axis that lets the Analyst reason about
 * ANY digital use case, not just the manufacturing domains in `domain-knowledge.ts`.
 *
 * A demand has two orthogonal dimensions:
 *   - its **domain** (quality, procurement, finance, HR …) — the business context;
 *   - its **archetype** (analytics, prediction, GenAI assistant, automation …) — the
 *     shape of the digital solution, which drives feasibility, data needs, the
 *     non-functional requirements that matter, and the characteristic ways it fails.
 *
 * The domain says *what area* the problem lives in; the archetype says *what kind of
 * thing we are building*, and therefore *how to analyse it well*. Two demands in the
 * same domain (a maintenance dashboard vs. a maintenance failure-prediction model)
 * need very different analysis; two demands sharing an archetype across domains (a
 * quality-defect predictor vs. a demand-forecast) share the same feasibility and risk
 * questions. Grounding the analysis on the archetype is what generalises the Analyst.
 *
 * Like `domain-knowledge.ts`, this is a deterministic SEED — a floor the offline
 * engine falls back to and the live model may go beyond. The classifier is pure and
 * keyword-driven (same style as the lane/domain rules in `demand.ts`), so the same
 * demand always resolves to the same archetype.
 */

import type { DemandAnswers } from "./demand.js";

export interface UseCaseArchetype {
  /** Stable key. */
  id: string;
  /** Human label. */
  label: string;
  /** One line: what this archetype is. */
  summary: string;
  /** The questions that decide whether THIS kind of use case is feasible and worth it. */
  feasibilityQuestions: string[];
  /** What must be true about the data/inputs before it can work. */
  dataPrerequisites: string[];
  /** The non-functional requirements this archetype makes load-bearing. */
  typicalNfrs: { category: string; requirement: string }[];
  /** The characteristic ways this archetype fails or disappoints. */
  characteristicRisks: string[];
  /** How to phrase acceptance criteria so they are checkable for this shape. */
  acceptancePatterns: string[];
  /** Comparable, proven solution patterns for this shape. */
  comparablePatterns: string[];
  /** Shapes it is often confused with, and the tell that distinguishes them. */
  antiPatterns: string[];
}

/**
 * The archetype catalogue. Ordered by classifier precedence (most specific first),
 * so a demand that matches several resolves to the most decision-relevant one.
 */
export const ARCHETYPES: readonly UseCaseArchetype[] = [
  {
    id: "genai_assistant",
    label: "GenAI assistant / RAG",
    summary: "A language-model assistant that drafts, answers, summarises, or retrieves over an organisation's documents and knowledge.",
    feasibilityQuestions: [
      "Is the knowledge the assistant must draw on written down and retrievable, or does it live in people's heads?",
      "What is the cost of a confidently-wrong answer, and who catches it before it does harm?",
      "Is a human always in the loop to approve output, or does the assistant act unattended?",
      "Can we evaluate answer quality objectively (a graded question set), or only by vibes?",
    ],
    dataPrerequisites: [
      "A corpus of source documents that is current, access-controlled, and permitted for this use.",
      "A way to keep the index fresh as the source changes.",
      "A held-out set of real questions with known-good answers to measure against.",
    ],
    typicalNfrs: [
      { category: "Groundedness", requirement: "Every answer cites its sources; the assistant abstains rather than guessing when the corpus does not support an answer." },
      { category: "Security", requirement: "Retrieval respects the asker's access rights; no document surfaces to a user not entitled to it." },
      { category: "Privacy", requirement: "Prompts and documents are processed in-region; nothing sensitive leaves the trust boundary." },
      { category: "Human control", requirement: "Generated output is a draft a human approves; the assistant never commits an action on its own." },
    ],
    characteristicRisks: [
      "Hallucination — a fluent, plausible answer that is wrong and trusted anyway.",
      "Stale or wrong sources make confident answers worse than no answer.",
      "Access-control leakage through retrieval (a user sees content via the assistant they could not open directly).",
      "Adoption collapses if the first answers are wrong; trust is hard to win back.",
    ],
    acceptancePatterns: [
      "Given a question answerable from the corpus, when asked, then the answer is correct and cites the source passage.",
      "Given a question the corpus does not cover, when asked, then the assistant says so rather than inventing an answer.",
      "Given a user without rights to a document, when they ask about it, then it is not revealed.",
    ],
    comparablePatterns: ["retrieval-augmented generation (RAG)", "grounded Q&A with citations", "assistant-in-the-loop drafting", "semantic search over a document store"],
    antiPatterns: ["If the answer is a number computed from structured data, it is descriptive analytics, not GenAI.", "If there is no document corpus to ground on, reconsider the approach."],
  },
  {
    id: "computer_vision",
    label: "Computer vision",
    summary: "Detect, classify, measure, or read from images or video — inspection, counting, presence/defect detection, OCR.",
    feasibilityQuestions: [
      "Can a trained human do the task reliably from the same image? If not, a model probably can't either.",
      "Are lighting, angle, and framing controllable, or will they vary in the wild?",
      "How many labelled examples of each class (especially rare defects) can we get?",
      "What is the cost of a false accept vs. a false reject, and which must we minimise?",
    ],
    dataPrerequisites: [
      "A representative set of labelled images spanning the real variation (lighting, product mix, defect types).",
      "Enough examples of the RARE class — the defect, not just the good part.",
      "A capture setup at inference time that matches training conditions.",
    ],
    typicalNfrs: [
      { category: "Accuracy", requirement: "False-accept and false-reject rates are within agreed, separately-stated bounds." },
      { category: "Latency", requirement: "Inference keeps pace with the line / the operator's tempo." },
      { category: "Robustness", requirement: "Performance holds across shifts, product variants, and lighting changes, monitored over time." },
    ],
    characteristicRisks: [
      "Rare-class scarcity — too few defect images to learn or to trust the score.",
      "Domain shift — a new product or camera silently degrades a model that tested well.",
      "Edge cases (occlusion, glare) that never appeared in training.",
    ],
    acceptancePatterns: [
      "Given a labelled test set held out from training, when scored, then false-accept ≤ X% and false-reject ≤ Y%.",
      "Given a product variant not in training, when run, then the system flags low confidence rather than guessing.",
    ],
    comparablePatterns: ["automated optical inspection", "defect classification", "object counting", "OCR / document reading"],
    antiPatterns: ["If the input is structured sensor data, not pixels, it is prediction/anomaly detection, not vision."],
  },
  {
    id: "prediction",
    label: "Prediction / anomaly detection",
    summary: "Forecast a future value, estimate a probability, or flag an outlier from structured/time-series data — demand forecasts, failure prediction, fraud/anomaly flags.",
    feasibilityQuestions: [
      "Is there a real signal — do the available inputs plausibly determine the target, or is it mostly noise?",
      "How much labelled history exists, and does the past resemble the future we predict into?",
      "What lead time does an action need, and can the prediction deliver it that early?",
      "What does the user DO with a prediction, and is a wrong one recoverable?",
    ],
    dataPrerequisites: [
      "Enough labelled history covering the outcomes we care about, including the rare ones.",
      "Inputs available at prediction time (no leakage of information only known after the fact).",
      "A stable enough process that yesterday's patterns still hold tomorrow.",
    ],
    typicalNfrs: [
      { category: "Reliability", requirement: "Miss rate and false-alarm rate are within agreed, separately-stated bounds; alert fatigue is designed against." },
      { category: "Lead time", requirement: "Warnings arrive early enough to act, not merely to observe." },
      { category: "Explainability", requirement: "Each alert shows the drivers behind it, so a human can judge it." },
    ],
    characteristicRisks: [
      "No signal — the honest outcome may be that the data cannot predict the target.",
      "Alert fatigue — too many false alarms and users stop looking.",
      "Concept drift — the model quietly decays as the process changes.",
      "Leakage — a model that looks great offline because it peeked at the future.",
    ],
    acceptancePatterns: [
      "Given a back-test on held-out history, when evaluated, then the model beats the current baseline by an agreed margin on the metric that matters.",
      "Given a flagged event, when shown, then the top contributing factors are visible.",
    ],
    comparablePatterns: ["time-series forecasting", "anomaly detection on streams", "remaining-useful-life estimation", "propensity / risk scoring"],
    antiPatterns: ["If you only need to show what already happened, it is descriptive analytics — start there before predicting."],
  },
  {
    id: "optimization",
    label: "Optimization / decision support",
    summary: "Recommend the best action under constraints — scheduling, routing, allocation, planning, pricing.",
    feasibilityQuestions: [
      "Can the objective and the hard constraints be written down precisely and agreed?",
      "Who owns the decision today, and will they accept a recommended plan?",
      "Is the data describing the current state accurate enough to optimise against?",
      "Is a good-enough heuristic acceptable, or is mathematical optimality really required?",
    ],
    dataPrerequisites: [
      "A trustworthy model of the current state (resources, constraints, costs).",
      "An agreed objective function and the real constraints, including the soft ones people apply implicitly.",
    ],
    typicalNfrs: [
      { category: "Transparency", requirement: "A recommendation explains why, so the owner can trust or override it." },
      { category: "Controllability", requirement: "The human can lock decisions and re-optimise around them." },
      { category: "Performance", requirement: "A plan is produced within the decision window it serves." },
    ],
    characteristicRisks: [
      "Optimising the wrong objective, or one that ignores constraints people hold implicitly.",
      "A mathematically optimal plan that operators won't follow — adoption over optimality.",
      "Garbage-in: an optimiser is only as good as its state data.",
    ],
    acceptancePatterns: [
      "Given a real scenario, when optimised, then the plan respects every hard constraint and improves the objective vs. today's practice.",
      "Given an operator override, when applied, then the system re-optimises around it.",
    ],
    comparablePatterns: ["constraint solver / mathematical programming", "heuristic scheduler", "what-if decision support", "recommend-and-approve loop"],
    antiPatterns: ["If the rules are simple and fixed, it is automation, not optimization."],
  },
  {
    id: "automation",
    label: "Process automation / workflow",
    summary: "Execute a rule-based process with less manual effort — RPA, workflow orchestration, straight-through processing, notifications.",
    feasibilityQuestions: [
      "Is the process stable, high-volume, and rule-based enough to automate, or does it need judgement each time?",
      "How many exceptions are there, and who handles them when automation can't?",
      "Are the systems it touches integrable via API, or only through fragile UI scripting?",
      "What breaks downstream if the automation runs on a bad input?",
    ],
    dataPrerequisites: [
      "Clean, structured triggers and inputs, or a reliable way to validate them first.",
      "A documented, agreed process definition including the exception paths.",
    ],
    typicalNfrs: [
      { category: "Reliability", requirement: "Failures are caught, retried, and escalated — never silently dropped." },
      { category: "Auditability", requirement: "Every automated action is logged and reversible or reviewable." },
      { category: "Idempotency", requirement: "A re-run does not double-process or corrupt state." },
    ],
    characteristicRisks: [
      "Automating a broken process just makes the mess faster — fix the process first.",
      "Brittle integrations (screen-scraping) that break on every upstream change.",
      "Silent failure that erodes trust or corrupts downstream data.",
    ],
    acceptancePatterns: [
      "Given a valid case, when it enters, then it is processed end-to-end with no manual touch and a logged trail.",
      "Given an invalid or exceptional case, when detected, then it is routed to a human, not force-processed.",
    ],
    comparablePatterns: ["robotic process automation (RPA)", "workflow / BPM orchestration", "straight-through processing", "event-driven notification"],
    antiPatterns: ["If the process needs judgement on each case, it is decision support or GenAI assistance, not automation."],
  },
  {
    id: "analytics",
    label: "Descriptive analytics / BI",
    summary: "Make what already happened visible and comparable — dashboards, reports, KPIs, self-service exploration.",
    feasibilityQuestions: [
      "Is there a single agreed definition for each metric, or will three teams compute it three ways?",
      "Does the source data exist, and is it trustworthy enough to publish decisions on?",
      "What decision will change because someone saw this? If none, why build it?",
      "Real-time or is daily/weekly refresh enough (usually it is)?",
    ],
    dataPrerequisites: [
      "Source systems with the underlying facts, reconciled to an agreed source of truth.",
      "Agreed metric definitions and dimensions (a small semantic layer).",
    ],
    typicalNfrs: [
      { category: "Correctness", requirement: "Figures reconcile to the system of record; a number shown is a number that can be defended." },
      { category: "Freshness", requirement: "Data recency is stated on the view and meets the decision's needs." },
      { category: "Usability", requirement: "Readable at a glance by its actual audience, not only its author." },
    ],
    characteristicRisks: [
      "Metric ambiguity — the same KPI defined differently erodes trust in the whole dashboard.",
      "A dashboard nobody acts on — visibility without a decision is decoration.",
      "Data-quality problems surfaced (not caused) by the dashboard get blamed on it.",
    ],
    acceptancePatterns: [
      "Given the agreed metric definition, when the dashboard shows it, then it reconciles to the source of truth within tolerance.",
      "Given the intended decision, when the user opens the view, then the signal needed for that decision is visible without digging.",
    ],
    comparablePatterns: ["KPI dashboard", "self-service BI / semantic layer", "scheduled report", "drill-down exploration"],
    antiPatterns: ["If it must predict or recommend, it is prediction/optimization — but descriptive analytics is usually the right first step."],
  },
  {
    id: "integration",
    label: "Integration / data platform",
    summary: "Move and reconcile data between systems, or build the shared data foundation others depend on — pipelines, APIs, master data.",
    feasibilityQuestions: [
      "Are the source and target schemas stable and owned, or moving under us?",
      "What is the agreed source of truth when two systems disagree?",
      "What are the volume, frequency, and latency requirements, realistically?",
      "Who owns and operates this pipeline after go-live?",
    ],
    dataPrerequisites: [
      "Documented, owned source and target schemas and access.",
      "Agreed matching/merge keys and a rule for conflicts.",
    ],
    typicalNfrs: [
      { category: "Data quality", requirement: "Records are validated at the boundary; bad data is quarantined, not propagated." },
      { category: "Reliability", requirement: "Runs are monitored, retriable, and idempotent; gaps and duplicates are detectable." },
      { category: "Lineage", requirement: "Every field's origin and transformations are traceable." },
    ],
    characteristicRisks: [
      "Undocumented schema changes upstream break the pipeline silently.",
      "No agreed source of truth turns integration into an endless reconciliation argument.",
      "It becomes load-bearing infrastructure with no owner.",
    ],
    acceptancePatterns: [
      "Given a source record, when it flows through, then it appears in the target correctly with lineage, or is quarantined with a reason.",
      "Given a duplicate or late record, when processed, then no double-count or gap results.",
    ],
    comparablePatterns: ["ETL / ELT pipeline", "event streaming / CDC", "master-data management", "API / integration layer"],
    antiPatterns: ["Integration is usually an enabler for another archetype — name the use case it serves, or it risks being infrastructure for its own sake."],
  },
  {
    id: "iot_monitoring",
    label: "IoT / connected monitoring",
    summary: "Instrument physical assets and stream their state — sensor telemetry, remote monitoring, digital twins, connected products.",
    feasibilityQuestions: [
      "Can the assets be instrumented affordably, and is connectivity reliable where they live?",
      "What sampling rate and retention does the use actually need (over-sampling is costly, under-sampling is useless)?",
      "How are devices provisioned, secured, and updated over their life?",
      "Is edge processing needed, or can everything go to the cloud?",
    ],
    dataPrerequisites: [
      "Sensors/gateways that capture the needed signals at adequate rate and quality.",
      "Reliable connectivity, or edge buffering for when it drops.",
      "A device identity, security, and lifecycle plan.",
    ],
    typicalNfrs: [
      { category: "Security", requirement: "Devices are authenticated and updatable; the fleet is not a breach vector." },
      { category: "Reliability", requirement: "Data survives connectivity loss (buffer + backfill); gaps are visible." },
      { category: "Scalability", requirement: "Ingest and storage scale to the device count and sampling rate at acceptable cost." },
    ],
    characteristicRisks: [
      "Connectivity and power realities in the field defeat a design that worked on the bench.",
      "Unmanaged devices become a security and maintenance liability.",
      "Data volume/cost balloons without a retention and down-sampling plan.",
    ],
    acceptancePatterns: [
      "Given an instrumented asset, when it reports, then its state is visible within the agreed latency and retained per policy.",
      "Given a connectivity drop, when it recovers, then buffered data backfills without loss or duplication.",
    ],
    comparablePatterns: ["sensor telemetry pipeline", "remote condition monitoring", "digital twin", "connected-product platform"],
    antiPatterns: ["The value is rarely the telemetry itself — pair it with analytics/prediction that acts on the stream."],
  },
  {
    id: "self_service",
    label: "Self-service application / portal",
    summary: "Give users a workflow they run themselves — request portals, forms, case management, employee/customer self-service.",
    feasibilityQuestions: [
      "Who are the users, how many, how often, and how tech-comfortable?",
      "What is the process today, and where exactly does it hurt?",
      "What must it integrate with to actually remove work (not just add a form)?",
      "How will it be governed — access, roles, data retention?",
    ],
    dataPrerequisites: [
      "The reference data the workflow needs (users, catalog, entitlements).",
      "Integration points to the systems of record the requests feed.",
    ],
    typicalNfrs: [
      { category: "Usability", requirement: "A first-time user completes the core task without training or a manual." },
      { category: "Accessibility", requirement: "Meets the organisation's accessibility standard for its user base." },
      { category: "Security", requirement: "Authentication, role-based access, and data retention are enforced." },
    ],
    characteristicRisks: [
      "Building a form over a broken process — digitising the pain instead of removing it.",
      "Low adoption because it adds a step rather than replacing one.",
      "Scope creep from 'while we're at it' requests.",
    ],
    acceptancePatterns: [
      "Given a new user with no training, when they attempt the core task, then they complete it unaided.",
      "Given a submitted request, when accepted, then it reaches the system of record without re-keying.",
    ],
    comparablePatterns: ["request/approval portal", "digital form + workflow", "case-management app", "customer/employee self-service"],
    antiPatterns: ["If the goal is to remove the human step entirely, consider automation instead of a self-service form."],
  },
  {
    id: "data_foundation",
    label: "Data foundation / governance",
    summary: "Establish the trustworthy, governed data others build on — data model, quality, catalog, master data, governance.",
    feasibilityQuestions: [
      "Which concrete downstream use cases will consume this foundation (name at least one)?",
      "Who owns each data domain, and will they steward quality?",
      "What is the minimum viable foundation that unblocks the first use case?",
      "How is success measured when the value is indirect?",
    ],
    dataPrerequisites: [
      "Named data domains with accountable owners.",
      "At least one committed downstream consumer to anchor scope.",
    ],
    typicalNfrs: [
      { category: "Data quality", requirement: "Quality rules are defined, measured, and reported per domain." },
      { category: "Governance", requirement: "Ownership, access, and retention are defined and enforced." },
      { category: "Discoverability", requirement: "Data is cataloged with meaning and lineage so consumers can find and trust it." },
    ],
    characteristicRisks: [
      "A foundation with no committed consumer becomes an expensive, abstract project that stalls.",
      "Boiling the ocean — modelling everything instead of what the first use case needs.",
      "No owner means quality decays the day the project ends.",
    ],
    acceptancePatterns: [
      "Given the first downstream use case, when it consumes the foundation, then it gets correct, governed, documented data.",
      "Given a data-quality rule, when violated, then it is detected and reported to the domain owner.",
    ],
    comparablePatterns: ["data model / warehouse layer", "master-data management", "data catalog + lineage", "data-quality framework"],
    antiPatterns: ["Never a use case on its own — always justified by the consumers it unblocks."],
  },
];

/** Keyword rules → archetype id. First match wins, so order = precedence. */
const ARCHETYPE_RULES: { id: string; terms: RegExp }[] = [
  { id: "genai_assistant", terms: /\b(chatbot|assistant|copilot|llm|gpt|generative|gen[- ]?ai|rag|retrieval[- ]aug|summari[sz]e|draft(ing)?|knowledge base|q&a|natural language|ask (a|the) )/i },
  { id: "computer_vision", terms: /\b(image|vision|camera|visual inspection|photo|video|ocr|optical|defect detection|read the label|recogni[sz]e)/i },
  { id: "prediction", terms: /\b(predict|forecast|anomaly|anomalies|early warning|failure prediction|remaining useful life|propensity|risk score|classif|machine learning|\bml\b|churn|fraud)/i },
  { id: "optimization", terms: /\b(optimi[sz]|schedul|routing|allocation|planning|assign|minimi[sz]e|maximi[sz]e|best (option|plan|route)|pricing)/i },
  { id: "automation", terms: /\b(automat|rpa|robotic process|workflow|straight[- ]through|orchestrat|trigger|bot\b|no manual|reduce manual|auto[- ]?(fill|process|route))/i },
  { id: "iot_monitoring", terms: /\b(sensor|iot|telemetry|connected (asset|device|product)|digital twin|remote monitoring|edge device|gateway|plc|scada)/i },
  { id: "integration", terms: /\b(integrat|interface|pipeline|etl|elt|sync|data flow|api\b|master data|connect .* system|feed .* into|data platform|streaming|cdc)/i },
  { id: "self_service", terms: /\b(portal|self[- ]service|form\b|request (portal|system)|case management|app for|self[- ]serve|submit a request|ticketing)/i },
  { id: "data_foundation", terms: /\b(data model|data foundation|data governance|data catalog|data quality|single source of truth|golden record|data warehouse|lakehouse)/i },
  { id: "analytics", terms: /\b(dashboard|report|kpi|metric|visibility|analytics|business intelligence|\bbi\b|drill[- ]down|scorecard|track(ing)? .* over time|monitor .* performance)/i },
];

/**
 * Classify a demand into a use-case archetype from its text. Deterministic: the same
 * answers always resolve to the same archetype. Falls back to descriptive analytics —
 * the honest default, since making the problem visible is the safe first step when the
 * shape is unclear.
 */
export function classifyArchetype(answers: DemandAnswers): UseCaseArchetype {
  const hay = [
    answers.title, answers.problem, answers.desiredOutcome, answers.affectedProcess,
    answers.currentPain, answers.constraints, answers.frequencyScale,
  ].join(" \n ").toLowerCase();

  for (const rule of ARCHETYPE_RULES) {
    if (rule.terms.test(hay)) {
      const found = ARCHETYPES.find((a) => a.id === rule.id);
      if (found) return found;
    }
  }
  return archetypeById("analytics");
}

/** Look up an archetype by id (falls back to descriptive analytics). */
export function archetypeById(id: string): UseCaseArchetype {
  return ARCHETYPES.find((a) => a.id === id) ?? ARCHETYPES.find((a) => a.id === "analytics")!;
}
