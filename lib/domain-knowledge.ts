/**
 * Baseline domain knowledge — a SEED, not a ceiling.
 *
 * This is a small, deterministic starting point for each manufacturing domain:
 * personas, recurring epic themes, typical NFRs, data sources, standards, and
 * comparable patterns. It is what the offline engine falls back to and what a
 * research run starts from — NOT the limit of what the agent may use.
 *
 * The `domain-research` agent (`playbooks/domain-research.md`) extends this freely
 * with public data — real reference cases, testimonials, benchmarks, and lessons
 * from comparable implementations — and writes a `research.md` brief per case.
 * Keep this baseline broad and honest; the research agent goes wider.
 */

export interface DomainKnowledge {
  /** Canonical domain key (matches intake domains). */
  domain: string;
  /** Roles that appear in user stories. First is the primary persona. */
  personas: string[];
  /** Recurring epic themes for this domain. */
  epics: { title: string; description: string }[];
  /** Typical non-functional requirements. */
  nfrs: { category: string; requirement: string }[];
  /** Data sources / systems commonly involved. */
  dataSources: string[];
  /** Standards / regulations to check. */
  standards: string[];
  /** Comparable solution patterns (domain research). */
  patterns: string[];
}

const GENERIC: DomainKnowledge = {
  domain: "general",
  personas: ["shop-floor user", "process owner", "site manager"],
  epics: [
    { title: "Data foundation", description: "Capture and make available the data the solution depends on." },
    { title: "Insight & alerting", description: "Turn the data into a signal the user can act on." },
    { title: "Workflow & action", description: "Fit the signal into the daily workflow so it drives action." },
  ],
  nfrs: [
    { category: "Security", requirement: "Credentials and integrations are handled server-side; none reach the browser." },
    { category: "Auditability", requirement: "Actions and decisions are traceable." },
    { category: "Usability", requirement: "Usable on the shop floor with minimal training." },
    { category: "Performance", requirement: "Responses are fast enough not to interrupt the task." },
  ],
  dataSources: ["MES", "ERP", "manual entry"],
  standards: ["internal data governance"],
  patterns: ["dashboard + alert", "assistant-in-the-loop drafting", "closed-loop workflow"],
};

export const DOMAIN_KB: Record<string, DomainKnowledge> = {
  quality: {
    domain: "quality",
    personas: ["line operator", "shift quality lead", "quality engineer"],
    epics: [
      { title: "Defect capture & classification", description: "Record defects and cause codes consistently at source." },
      { title: "Root-cause analytics", description: "Attribute scrap/rework to drivers and surface trends." },
      { title: "Operator alerting", description: "Warn the line early enough to act before a batch is lost." },
    ],
    nfrs: [
      { category: "Traceability", requirement: "Every defect record is linked to batch, line, and shift." },
      { category: "Latency", requirement: "In-process signals arrive fast enough to correct the running batch." },
      { category: "Data quality", requirement: "Cause codes are validated against a controlled list." },
    ],
    dataSources: ["MES", "inspection system", "SPC / process telemetry"],
    standards: ["ISO 9001", "IATF 16949 (automotive)"],
    patterns: ["SPC control charts", "Pareto of cause codes", "early-warning model on process tags"],
  },
  maintenance: {
    domain: "maintenance",
    personas: ["maintenance technician", "reliability engineer", "maintenance planner"],
    epics: [
      { title: "Condition monitoring", description: "Collect equipment signals that precede failure." },
      { title: "Predictive alerting", description: "Flag a developing failure before it stops the line." },
      { title: "Work-order integration", description: "Turn an alert into a planned intervention." },
    ],
    nfrs: [
      { category: "Reliability", requirement: "Missed-failure and false-alarm rates are within agreed bounds." },
      { category: "Integration", requirement: "Alerts flow into the CMMS as actionable work orders." },
      { category: "Latency", requirement: "Warning lead time is long enough to plan an intervention." },
    ],
    dataSources: ["PLC / SCADA tags", "CMMS", "vibration / temperature sensors"],
    standards: ["ISO 55000 (asset management)"],
    patterns: ["anomaly detection on sensor streams", "remaining-useful-life estimate", "condition-based maintenance"],
  },
  energy: {
    domain: "energy",
    personas: ["energy manager", "production supervisor", "facility engineer"],
    epics: [
      { title: "Metering & baseline", description: "Establish a verified consumption baseline per line/asset." },
      { title: "Consumption analytics", description: "Attribute energy use to drivers and detect anomalies." },
      { title: "Reduction actions", description: "Recommend and track energy-saving actions." },
    ],
    nfrs: [
      { category: "Accuracy", requirement: "Baselines are verified against metered ground truth." },
      { category: "Traceability", requirement: "Savings claims are auditable to the baseline method." },
    ],
    dataSources: ["energy meters", "BMS", "production counts"],
    standards: ["ISO 50001 (energy management)"],
    patterns: ["regression baseline (CUSUM)", "load disaggregation", "peak-demand alerting"],
  },
  production: {
    domain: "production",
    personas: ["production supervisor", "line operator", "plant manager"],
    epics: [
      { title: "Throughput visibility", description: "Make OEE and losses visible in real time." },
      { title: "Loss analytics", description: "Attribute downtime and speed loss to causes." },
      { title: "Shift workflow", description: "Fit insights into shift handover and daily management." },
    ],
    nfrs: [
      { category: "Latency", requirement: "Line state reflects reality within the current shift." },
      { category: "Usability", requirement: "Readable at a glance from the line." },
    ],
    dataSources: ["MES", "PLC counters", "andon"],
    standards: ["OEE definitions (internal)"],
    patterns: ["OEE waterfall", "downtime Pareto", "digital shift handover"],
  },
  procurement: {
    domain: "procurement",
    personas: ["category buyer", "procurement lead", "supplier manager"],
    epics: [
      { title: "Knowledge retrieval", description: "Find comparable past tenders, specs, and terms fast." },
      { title: "Draft assistance", description: "Draft a tender/RFQ from the request and comparables." },
      { title: "Review & control", description: "Keep the buyer in control of every draft and decision." },
    ],
    nfrs: [
      { category: "Security", requirement: "Commercially sensitive documents stay within access controls." },
      { category: "Traceability", requirement: "Every drafted clause is attributable to a source." },
    ],
    dataSources: ["contract repository", "ERP / procurement system", "supplier master"],
    standards: ["internal procurement policy"],
    patterns: ["retrieval-augmented drafting", "clause library", "human-in-the-loop approval"],
  },
  logistics: {
    domain: "logistics",
    personas: ["warehouse operator", "logistics planner", "supply-chain manager"],
    epics: [
      { title: "Inventory visibility", description: "Know stock and material flow accurately and in time." },
      { title: "Flow analytics", description: "Detect bottlenecks and mis-flows." },
      { title: "Replenishment workflow", description: "Trigger and track corrective moves." },
    ],
    nfrs: [
      { category: "Accuracy", requirement: "Inventory state matches physical reality within tolerance." },
      { category: "Latency", requirement: "Flow signals are timely enough to act on." },
    ],
    dataSources: ["WMS", "ERP", "scanning / RFID"],
    standards: ["internal logistics policy"],
    patterns: ["digital twin of flow", "reorder-point alerting", "milk-run optimisation"],
  },
  safety: {
    domain: "safety",
    personas: ["EHS officer", "line supervisor", "operator"],
    epics: [
      { title: "Hazard capture", description: "Record near-misses and hazards easily at source." },
      { title: "Risk analytics", description: "Surface recurring risks and leading indicators." },
      { title: "Action tracking", description: "Drive corrective actions to closure." },
    ],
    nfrs: [
      { category: "Compliance", requirement: "Records meet EHS reporting obligations." },
      { category: "Confidentiality", requirement: "Personal data in reports is protected." },
    ],
    dataSources: ["EHS system", "incident reports"],
    standards: ["ISO 45001 (occupational H&S)"],
    patterns: ["leading-indicator dashboard", "near-miss capture app", "action-tracking workflow"],
  },
  engineering: {
    domain: "engineering",
    personas: ["process engineer", "automation engineer", "plant engineer"],
    epics: [
      { title: "Parameter capture", description: "Collect process/engineering parameters reliably." },
      { title: "Analysis & optimisation", description: "Find better operating points from the data." },
      { title: "Change workflow", description: "Manage parameter changes safely." },
    ],
    nfrs: [
      { category: "Safety", requirement: "Parameter changes go through controlled review." },
      { category: "Traceability", requirement: "Every change is versioned and attributable." },
    ],
    dataSources: ["historian", "PLC / DCS", "engineering documents"],
    standards: ["internal engineering standards"],
    patterns: ["design-of-experiments", "golden-batch comparison", "parameter optimisation"],
  },

  // ── Enterprise-wide digital domains (beyond the shop floor) ──────────────────
  // A digital use case can live anywhere in the business. These keep the same shape
  // as the manufacturing domains so the analysis is grounded regardless of area.
  it: {
    domain: "it",
    personas: ["end user", "IT service owner", "system administrator"],
    epics: [
      { title: "Service visibility", description: "Make system health, usage, and incidents visible." },
      { title: "Self-service & automation", description: "Let users resolve common needs without a ticket." },
      { title: "Governance & security", description: "Keep access, data, and change under control." },
    ],
    nfrs: [
      { category: "Security", requirement: "Access is role-based and least-privilege; secrets never reach the client." },
      { category: "Reliability", requirement: "The service meets its agreed availability and recovery objectives." },
      { category: "Auditability", requirement: "Access and changes are logged and reviewable." },
    ],
    dataSources: ["ITSM / ticketing", "identity provider", "monitoring / logs"],
    standards: ["ISO 27001 (information security)", "internal IT policy"],
    patterns: ["self-service portal", "automated provisioning", "observability dashboard"],
  },
  data: {
    domain: "data",
    personas: ["data analyst", "data engineer", "business owner"],
    epics: [
      { title: "Trusted data foundation", description: "Model and govern the data others depend on." },
      { title: "Analytics & insight", description: "Turn data into decisions people act on." },
      { title: "Access & literacy", description: "Make data discoverable and usable by its audience." },
    ],
    nfrs: [
      { category: "Data quality", requirement: "Quality rules are defined, measured, and reported per domain." },
      { category: "Lineage", requirement: "Every figure is traceable to its source and transformations." },
      { category: "Governance", requirement: "Ownership, access, and retention are defined and enforced." },
    ],
    dataSources: ["data warehouse / lakehouse", "source systems", "BI / semantic layer"],
    standards: ["internal data governance", "GDPR (where personal data)"],
    patterns: ["semantic layer + BI", "data quality framework", "master-data management"],
  },
  finance: {
    domain: "finance",
    personas: ["controller", "financial analyst", "budget owner"],
    epics: [
      { title: "Reporting & close", description: "Produce trusted figures faster and with less manual work." },
      { title: "Planning & forecasting", description: "Support budgeting, forecasting, and variance analysis." },
      { title: "Controls & compliance", description: "Keep figures auditable and controls enforced." },
    ],
    nfrs: [
      { category: "Correctness", requirement: "Figures reconcile to the system of record and are defensible in audit." },
      { category: "Auditability", requirement: "Every number traces to its source and calculation." },
      { category: "Segregation of duties", requirement: "Preparation and approval are separated and enforced." },
    ],
    dataSources: ["ERP / general ledger", "planning system", "sub-ledgers"],
    standards: ["IFRS / local GAAP", "internal controls (SOX-style)"],
    patterns: ["automated reconciliation", "driver-based forecasting", "controls dashboard"],
  },
  hr: {
    domain: "hr",
    personas: ["employee", "HR business partner", "people manager"],
    epics: [
      { title: "Employee self-service", description: "Let people handle common HR needs themselves." },
      { title: "People analytics", description: "Surface workforce insight without profiling individuals." },
      { title: "Process & compliance", description: "Run HR processes reliably and within the law." },
    ],
    nfrs: [
      { category: "Privacy", requirement: "Personal data is minimised, access-controlled, and retained per policy." },
      { category: "Fairness", requirement: "No analysis ranks or profiles individuals; aggregates only." },
      { category: "Compliance", requirement: "Processes meet labour law and works-council agreements." },
    ],
    dataSources: ["HRIS", "payroll", "learning system"],
    standards: ["GDPR", "local labour law", "works-council agreements"],
    patterns: ["employee self-service portal", "aggregate workforce dashboard", "case management"],
  },
  customer: {
    domain: "customer",
    personas: ["customer", "sales representative", "service agent"],
    epics: [
      { title: "Customer visibility", description: "Give a trustworthy, unified view of the customer." },
      { title: "Engagement & service", description: "Help teams respond and sell faster and better." },
      { title: "Self-service", description: "Let customers help themselves where they prefer to." },
    ],
    nfrs: [
      { category: "Privacy", requirement: "Customer data is consent-based, access-controlled, and retained per policy." },
      { category: "Usability", requirement: "Customer-facing flows work first time, on the customer's device." },
      { category: "Reliability", requirement: "Customer-facing services meet their availability targets." },
    ],
    dataSources: ["CRM", "e-commerce / web", "service / ticketing"],
    standards: ["GDPR", "accessibility (WCAG)", "internal data governance"],
    patterns: ["360° customer view", "assistant-in-the-loop service", "customer self-service portal"],
  },
  sustainability: {
    domain: "sustainability",
    personas: ["sustainability manager", "site energy/EHS lead", "reporting owner"],
    epics: [
      { title: "Data collection", description: "Gather emissions, energy, and resource data reliably." },
      { title: "Reporting & disclosure", description: "Produce auditable ESG/regulatory reports." },
      { title: "Reduction tracking", description: "Set targets and track reduction actions to impact." },
    ],
    nfrs: [
      { category: "Auditability", requirement: "Every reported figure traces to a verifiable source and method." },
      { category: "Accuracy", requirement: "Factors and baselines are versioned and defensible." },
      { category: "Traceability", requirement: "Claims are reproducible from raw data." },
    ],
    dataSources: ["energy / utility meters", "ERP (materials, travel)", "supplier data"],
    standards: ["GHG Protocol", "CSRD / ESRS", "ISO 14001"],
    patterns: ["emissions data pipeline", "auditable ESG report", "target-and-track dashboard"],
  },
};

/** Domain aliases → canonical key, so near-synonyms still ground the analysis. */
const DOMAIN_ALIASES: Record<string, string> = {
  software: "it",
  "it/software": "it",
  digital: "it",
  analytics: "data",
  "data & ai": "data",
  data_ai: "data",
  ai: "data",
  bi: "data",
  controlling: "finance",
  accounting: "finance",
  people: "hr",
  "human resources": "hr",
  sales: "customer",
  marketing: "customer",
  commercial: "customer",
  service: "customer",
  crm: "customer",
  esg: "sustainability",
  environment: "sustainability",
  energy_esg: "sustainability",
};

/** Knowledge for a domain, resolving aliases, then falling back to a generic base. */
export function knowledgeFor(domain: string | undefined): DomainKnowledge {
  const key = (domain ?? "").toLowerCase().trim();
  const canonical = DOMAIN_ALIASES[key] ?? key;
  return DOMAIN_KB[canonical] ?? { ...GENERIC, domain: key || "general" };
}
