/**
 * Domain knowledge base for the requirements-analysis agent (`playbooks/
 * requirements-analysis.md`).
 *
 * This is the "common domain research and knowledge" the analysis tool draws on to
 * enhance an intake and derive requirements: for each manufacturing domain, the
 * personas involved, the epic themes that recur, the typical non-functional
 * requirements, the data sources and systems in play, relevant standards, and
 * comparable solution patterns. Deterministic and data-driven — adding a domain is
 * one entry. A live model may add more; this is the floor, and the offline engine.
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
};

/** Knowledge for a domain, falling back to a generic base. */
export function knowledgeFor(domain: string | undefined): DomainKnowledge {
  const key = (domain ?? "").toLowerCase().trim();
  return DOMAIN_KB[key] ?? { ...GENERIC, domain: key || "general" };
}
