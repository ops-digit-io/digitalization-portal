# Use-case archetype catalogue

The analysis lens for each solution shape. This mirrors `lib/usecase-archetypes.ts`
(the deterministic seed); keep them in step. For each archetype: what it is, the
feasibility questions to answer first, the data prerequisites, the NFRs that decide
success, the characteristic failure modes, and the shapes it's confused with.

---

## Descriptive analytics / BI

Make what already happened visible and comparable — dashboards, reports, KPIs,
self-service exploration. **Usually the right first step** before predicting or
optimising.

- **Feasibility:** Is there one agreed definition per metric? Does the source data
  exist and reconcile? What decision changes because someone saw this? Is daily/weekly
  refresh enough (usually yes)?
- **Data prerequisites:** source systems with the underlying facts reconciled to a
  source of truth; agreed metric definitions and dimensions (a small semantic layer).
- **Load-bearing NFRs:** correctness (reconciles to the system of record), freshness
  (recency stated and adequate), usability (readable by its actual audience).
- **Characteristic risks:** metric ambiguity erodes trust in the whole dashboard; a
  dashboard nobody acts on; data-quality problems surfaced then blamed on the tool.
- **Confused with:** if it must predict or recommend, it's prediction/optimization —
  but start descriptive.

## Prediction / anomaly detection

Forecast a value, estimate a probability, or flag an outlier from structured / time-
series data — demand forecasts, failure prediction, fraud/anomaly flags.

- **Feasibility:** Is there a real signal, or mostly noise? Enough labelled history,
  and does the past resemble the future? What lead time does the action need? Is a
  wrong prediction recoverable?
- **Data prerequisites:** labelled history covering the rare outcomes; inputs
  available at prediction time (no leakage); a stable-enough process.
- **Load-bearing NFRs:** reliability (miss/false-alarm bounds, designed against alert
  fatigue), lead time, explainability (drivers behind each alert).
- **Characteristic risks:** no signal (the honest possible outcome); alert fatigue;
  concept drift; leakage (looks great offline because it peeked at the future).
- **Confused with:** if you only need to show what happened, it's descriptive
  analytics — do that first.

## Computer vision

Detect, classify, measure, or read from images/video — inspection, counting,
presence/defect detection, OCR.

- **Feasibility:** Can a trained human do it from the same image? Are lighting/angle
  controllable? How many labelled examples, especially of the rare defect? Cost of a
  false accept vs. false reject?
- **Data prerequisites:** representative labelled images spanning real variation;
  enough of the RARE class; capture conditions at inference that match training.
- **Load-bearing NFRs:** accuracy (separate false-accept / false-reject bounds),
  latency (keeps pace with the line), robustness across shifts/variants/lighting.
- **Characteristic risks:** rare-class scarcity; domain shift silently degrades a
  model that tested well; untrained edge cases (glare, occlusion).
- **Confused with:** structured sensor data (not pixels) is prediction, not vision.

## GenAI assistant / RAG

A language-model assistant that drafts, answers, summarises, or retrieves over an
organisation's documents and knowledge.

- **Feasibility:** Is the knowledge written down and retrievable? What is the cost of
  a confidently-wrong answer, and who catches it? Human always in the loop? Can we
  evaluate quality with a graded question set?
- **Data prerequisites:** a current, access-controlled, permitted corpus; a way to
  keep the index fresh; a held-out set of real questions with known-good answers.
- **Load-bearing NFRs:** groundedness (cite sources, abstain when unsupported),
  security (retrieval respects the asker's rights), privacy (in-region processing),
  human control (output is a draft a human approves).
- **Characteristic risks:** hallucination trusted anyway; stale/wrong sources; access-
  control leakage via retrieval; trust lost on early wrong answers.
- **Confused with:** if the answer is a number from structured data, it's analytics.

## Automation / workflow

Execute a rule-based process with less manual effort — RPA, workflow orchestration,
straight-through processing, notifications.

- **Feasibility:** Stable, high-volume, rule-based enough? How many exceptions, and
  who handles them? APIs available or only fragile UI scripting? What breaks
  downstream on a bad input?
- **Data prerequisites:** clean structured triggers/inputs (or validation first); a
  documented process definition including exception paths.
- **Load-bearing NFRs:** reliability (failures caught, retried, escalated — never
  silently dropped), auditability (every action logged and reversible), idempotency
  (a re-run doesn't double-process).
- **Characteristic risks:** automating a broken process just makes the mess faster;
  brittle screen-scraping; silent failure that corrupts downstream data.
- **Confused with:** if each case needs judgement, it's decision support or GenAI.

## Optimization / decision support

Recommend the best action under constraints — scheduling, routing, allocation,
planning, pricing.

- **Feasibility:** Can the objective and hard constraints be written down and agreed?
  Who owns the decision, and will they accept a recommended plan? Is the state data
  accurate enough? Is a good-enough heuristic acceptable vs. true optimality?
- **Data prerequisites:** a trustworthy model of current state (resources,
  constraints, costs); an agreed objective and the real constraints, including the
  soft ones people apply implicitly.
- **Load-bearing NFRs:** transparency (explains why), controllability (human can lock
  decisions and re-optimise), performance (plan within the decision window).
- **Characteristic risks:** optimising the wrong objective; a mathematically optimal
  plan operators won't follow; garbage-in state data.
- **Confused with:** simple fixed rules are automation, not optimization.

## Integration / data platform

Move and reconcile data between systems, or build the shared data foundation others
depend on — pipelines, APIs, master data.

- **Feasibility:** Are source/target schemas stable and owned? What's the source of
  truth on conflict? Volume/frequency/latency realistically? Who operates it after
  go-live?
- **Data prerequisites:** documented, owned schemas and access; agreed matching keys
  and a conflict rule.
- **Load-bearing NFRs:** data quality (validate at the boundary, quarantine bad
  data), reliability (monitored, retriable, idempotent), lineage (origin and
  transformations traceable).
- **Characteristic risks:** undocumented upstream schema changes break it silently;
  no agreed source of truth → endless reconciliation; becomes owner-less
  infrastructure.
- **Confused with:** usually an enabler — name the use case it serves.

## IoT / connected monitoring

Instrument physical assets and stream their state — sensor telemetry, remote
monitoring, digital twins, connected products.

- **Feasibility:** Can assets be instrumented affordably, with reliable connectivity?
  What sampling rate/retention does the use actually need? How are devices
  provisioned, secured, updated? Edge processing needed?
- **Data prerequisites:** sensors/gateways capturing the needed signals at adequate
  rate/quality; reliable connectivity or edge buffering; a device identity/security/
  lifecycle plan.
- **Load-bearing NFRs:** security (authenticated, updatable fleet), reliability (data
  survives connectivity loss, gaps visible), scalability (ingest/storage at cost).
- **Characteristic risks:** field connectivity/power defeats a bench design;
  unmanaged devices become a liability; data volume/cost balloons without retention.
- **Confused with:** the value is rarely the telemetry — pair with analytics/prediction.

## Self-service application / portal

Give users a workflow they run themselves — request portals, forms, case management,
employee/customer self-service.

- **Feasibility:** Who are the users, how many/often/tech-comfortable? Where exactly
  does today's process hurt? What must it integrate with to remove work? How is it
  governed?
- **Data prerequisites:** reference data the workflow needs (users, catalog,
  entitlements); integration points to systems of record.
- **Load-bearing NFRs:** usability (first-timer completes the core task unaided),
  accessibility, security (auth, RBAC, retention).
- **Characteristic risks:** a form over a broken process; low adoption because it
  adds a step; scope creep.
- **Confused with:** if the goal is to remove the human step, it's automation.

## Data foundation / governance

Establish the trustworthy, governed data others build on — data model, quality,
catalog, master data, governance.

- **Feasibility:** Which concrete downstream use cases consume it (name one)? Who owns
  each domain and will steward quality? Minimum viable foundation for the first use
  case? How is indirect success measured?
- **Data prerequisites:** named data domains with accountable owners; at least one
  committed downstream consumer.
- **Load-bearing NFRs:** data quality (rules defined/measured/reported), governance
  (ownership/access/retention), discoverability (cataloged with meaning and lineage).
- **Characteristic risks:** no committed consumer → stalls; boiling the ocean; no
  owner → quality decays after the project.
- **Confused with:** never a use case on its own — justified by the consumers it
  unblocks.
