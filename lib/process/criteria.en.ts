/**
 * English translations of the DTP Kriterienkatalog A (criteria + dimensions),
 * keyed by id. The German in criteria.ts stays the verbatim source of truth;
 * English is the default display language. Faithful, plain, no filler.
 */

export interface CriterionText {
  label: string;
  question: string;
  evidence: string;
  scale: [string, string, string, string, string];
}
export interface DimensionText {
  label: string;
  question: string;
}

export const EN_DIMENSIONS: Record<string, DimensionText> = {
  D1: { label: "Process representation & artifacts", question: "Do we know how the process runs — on paper and in reality?" },
  D2: { label: "Toolchain & system breaks", question: "Where does the data flow break, and can we get at the systems?" },
  D3: { label: "Flow & latency", question: "Where does a case sit instead of moving?" },
  D4: { label: "Goal clarity & goal attainment", question: "Why does the process exist — and does it deliver?" },
  D5: { label: "Measurability & diagnostics", question: "Can we see what is happening — down to the step level?" },
  D6: { label: "Feedback loop design", question: "Does seeing turn into acting?" },
  D7: { label: "Changeability & iteration risk", question: "How costly and risky is it to change something here?" },
  D8: { label: "Organizational maturity", question: "Can the organization carry the change — and sustain it?" },
};

export const EN_CRITERIA: Record<string, CriterionText> = {
  // D1
  "K1.1": {
    label: "Existence and currency of the process representation",
    question: "Show me the current representation of your process — when was it last changed, and by whom?",
    evidence: "Artifact (diagram, SOP, work instruction) with date/version history; spot check: three observed process steps held against the representation.",
    scale: [
      "No representation; the flow can only be described verbally.",
      "A representation exists, but the last change was >24 months ago or the spot check diverges from how the process is actually run.",
      "Main path covered correctly (spot check consistent); variants and special cases are missing.",
      "Last maintained ≤12 months ago, main path plus the main variants, spot check consistent.",
      "Versioned artifact with a named maintenance owner and several dated changes (a visible maintenance rhythm), spot check consistent.",
    ],
  },
  "K1.2": {
    label: "Executability of the documentation",
    question: "Could someone unfamiliar with the process run one pass using your documentation alone?",
    evidence: "Documentation gives role, tool, input, output for each step; test: a person unfamiliar with the process describes the flow from the documentation alone, the owner corrects.",
    scale: [
      "The documentation (if any) names only step names; no roles, no tools, no inputs/outputs.",
      "Roles OR tools named per step, not both; inputs/outputs missing.",
      "Role, tool, input/output present for each step on the main path; the test fails on special cases.",
      "The test succeeds for the main path without verbal help.",
      "The test succeeds including the most common special cases; escalation paths are described.",
    ],
  },
  "K1.3": {
    label: "Tool completeness of the representation",
    question: "Which tools are listed in your documentation — and which ones do people actually work with?",
    evidence: "Tool list in the documentation against one observed pass; every undocumented aid counts (private Excel files, mail loops, chat, notes).",
    scale: [
      "The documentation names no tools, or the pass mostly uses undocumented tools.",
      "Core IT systems documented; the handoffs between them (Excel, mail, chat) are missing entirely.",
      "Handoff tools partly documented; observation finds a few undocumented aids.",
      "The observed pass matches the tool list; at most one find.",
      "Tool list complete, including the purpose of each tool and named data flows; observation finds nothing.",
    ],
  },

  // D2
  "K2.1": {
    label: "System breaks on the main path",
    question: "Where does someone move a result by hand from one system into the next?",
    evidence: "Observed pass; count of manual transfers (retyping, copy-paste, export/import, printout, mail attachment).",
    scale: [
      "No one can name the full tool sequence; breaks cannot be counted.",
      "Tool sequence can be named; every handoff on the main path is manual.",
      "At least one system handoff automated; the majority still manual.",
      "Most main-path handoffs automated; manual transfer only at named remaining spots.",
      "Main path with no manual data transfer; remaining special cases documented and justified.",
    ],
  },
  "K2.2": {
    label: "Interface accessibility",
    question: "Can we get at the data of the systems involved — via API or export? Who approves it, and who has done it before?",
    evidence: "A data extract or API call actually pulled during the assessment; a named approval path with a precedent.",
    scale: [
      "No technical access and no nameable approval path (closed system, vendor black box, orphaned permissions).",
      "Access theoretically possible (vendor, corporate IT), but no precedent and the approval path is unclear.",
      "Manual export (CSV/Excel) possible and demonstrated in the session; no API.",
      "API or automated export available; access actually granted for the assessment.",
      "API in active use by at least one further consumer; access process established.",
    ],
  },
  "K2.3": {
    label: "Leading data source",
    question: "When two stores show different values — which one wins?",
    evidence: "A named leading system per core data item; count of parallel places where the same data is maintained (lists, local copies).",
    scale: [
      "For core data no leading source can be named; conflicts are settled by asking around.",
      "The same core data is maintained independently in ≥3 places; reconciliation is manual and ad hoc.",
      "Leading system named; parallel copies exist and are updated by hand.",
      "Leading system; copies are derived automatically, no independent maintenance in copies.",
      "One leading system, no separately maintained copies; changes there are visible to all consumers.",
    ],
  },

  // D3
  "K3.1": {
    label: "Cycle time measured",
    question: "How long does one pass take from trigger to result — and how do you know?",
    evidence: "Data extract with timestamps (ticket system, logs, workflow tool, mail headers); confidence level P or I — level S counts here as an estimate.",
    scale: [
      "No figure possible, not even a consistent estimate.",
      "Estimate only (level S); no measured data.",
      "A one-off measurement or sample exists (e.g. from an earlier project).",
      "Ongoing measurement; mean/median known, spread not analyzed.",
      "Ongoing measurement with distribution (median, outliers) per relevant process variant.",
    ],
  },
  "K3.2": {
    label: "Wait time vs. processing time",
    question: "Where does a case typically sit, and for how long?",
    evidence: "Timestamp breakdown into wait and active time; the three biggest wait points backed by numbers (latency profile, B Phase 2).",
    scale: [
      "Wait points cannot be named.",
      "Wait points named from experience; no numbers.",
      "For at least one wait point a measured duration exists (≥P).",
      "Wait/active time share on the main path measured; top 3 wait points quantified.",
      "Breakdown available on an ongoing basis; wait times are tracked over time (trend visible).",
    ],
  },
  "K3.3": {
    label: "Touches and handoffs",
    question: "How many people touch a case — and how many of them actually change the result?",
    evidence: "Pass log; number of handoffs, share of pure forwardings and sign-offs with no substantive contribution.",
    scale: [
      "Number of people involved unknown; cases find their way via mail distribution lists.",
      "People involved can be named; the share of pure pass-throughs is unknown.",
      "Handoffs counted; suspected spots for no-value handoffs named but not proven.",
      "Handoffs counted and classified from a log (value-adding / checking / pass-through).",
      "Classification in place AND no-value handoffs have demonstrably already been removed or merged.",
    ],
  },
  "K3.4": {
    label: "Parallelization and kill candidates",
    question: "Which steps could run at the same time? And which step could be dropped entirely without anyone noticing?",
    evidence: "Step list with dependency rationale; steps whose output demonstrably no one consumes (distribution-list check, read/access statistics) — input for branch 0 (B §4).",
    scale: [
      "No one can justify the dependencies between steps; the order is 'the way it has always been'.",
      "Dependencies live in individual people's heads; not documented.",
      "Dependencies documented; no value/effort rating per step.",
      "Value/effort rated per step; parallelization and kill candidates named in writing.",
      "On top of that: in the last 12 months at least one step was actually removed or parallelized.",
    ],
  },

  // D4
  "K4.1": {
    label: "Goal statement with derivable criteria",
    question: "What is the goal of this process in one sentence — and how do you measure whether it is met?",
    evidence: "Written statement; independent interviews with the owner and at least one person doing the work, answers compared.",
    scale: [
      "Owner and the people doing the work name different goals, or none.",
      "Goal verbally consistent; written down nowhere; no measurable criteria.",
      "Goal in writing; criteria only qualitative ('fast', 'reliable').",
      "Goal in writing with measurable criteria (quantity, unit, direction).",
      "Plus target values with a rationale from the business need (why this value and no other).",
    ],
  },
  "K4.2": {
    label: "Actual performance against goal",
    question: "How well does the process meet its goal today — what number backs that up?",
    evidence: "Current measured value per goal criterion against target; a time series over at least a few months.",
    scale: [
      "No statement on goal attainment possible.",
      "Statement only as an impression ('runs pretty well'); no number.",
      "Current value for at least one goal criterion can be shown; no target comparison or no history.",
      "Actual vs. target for the goal criteria documented; time series available.",
      "Actual vs. target including trend; deviations are annotated (causes known).",
    ],
  },
  "K4.3": {
    label: "Target picture (greenfield test)",
    question: "If you rebuilt the process from scratch today — what would be different, and what stops you?",
    evidence: "Named deltas (what works well, what works badly) and named blockers; compared against the backlog or plans.",
    scale: [
      "No answer, or 'all good' although the findings show the opposite.",
      "Complaints about symptoms; no concrete target picture.",
      "Target picture described qualitatively; blockers not named.",
      "Target picture and blockers named; none of it in a plan.",
      "Documented target picture; blockers addressed in a concrete backlog/plan with dates.",
    ],
  },
  "K4.4": {
    label: "Volume model & business relevance",
    question: "How often does the process run per year, how much working time goes into it, and what does a mistake cost?",
    evidence: "Substantiated volume model: passes per year from system data, roles involved × time, error/rework cases — raw material for Addressable Value (B §8) and the business case (Part 2).",
    scale: [
      "Neither volume nor effort can be named.",
      "Volume estimated (level S); effort unknown.",
      "Volume backed by system data; effort estimated.",
      "Volume and effort substantiated; error costs estimated.",
      "Volume, effort and error/rework rate substantiated; from these a traceable monetary value per improvement lever can be derived.",
    ],
  },

  // D5
  "K5.1": {
    label: "Timestamp harvestability",
    question: "Where does a timestamp arise automatically today — system log, ticket, mail header, file metadata?",
    evidence: "A real data extract with timestamps from at least one system involved, pulled during the assessment (exhaust data first, B §6.1).",
    scale: [
      "No timestamps can be gathered: the flow runs verbally or on paper, and no system involved writes analyzable timestamps.",
      "Timestamps only at the start OR the end of the process, or only recordable manually after the fact.",
      "Start and end timestamps present automatically; intermediate steps are dark.",
      "Timestamps at the main handoffs; analysis with reasonable effort (export + script).",
      "Timestamps per step in analyzable systems; history available over ≥12 months.",
    ],
  },
  "K5.2": {
    label: "KPI coverage",
    question: "Which metrics describe the process today — and can you show me the current value right now?",
    evidence: "KPI list with data source and refresh cadence per KPI; test: the current value is retrieved during the session.",
    scale: [
      "No metric exists.",
      "Metrics named; the current value cannot be retrieved during the session (it has to be 'pulled together').",
      "Values retrievable; collection is manual (someone maintains a list); cadence irregular.",
      "Values collected automatically on a fixed cadence; definition per KPI in writing.",
      "Plus history ≥12 months and a named group of recipients who demonstrably receive the values.",
    ],
  },
  "K5.3": {
    label: "KPI validity",
    question: "If all your metrics are green — can the process still miss its goal? Where?",
    evidence: "Mapping of existing KPIs to the goal criteria from K4.1; measurement gaps and known false alarms named in writing.",
    scale: [
      "Metrics measure activity (amount done), with no link to the goal criteria.",
      "Partial link; key goal criteria without any metric.",
      "Main goal criterion measured; secondary criteria open.",
      "All goal criteria from the goal statement backed by a metric.",
      "Plus known gaps and false alarms of the KPIs documented in writing — you know what the numbers do NOT show.",
    ],
  },
  "K5.4": {
    label: "Diagnostic depth (drill-down)",
    question: "Cycle time rises by 30% — how do you find out which step caused it?",
    evidence: "A demonstrated breakdown of a result KPI down to step/latency level on a real case.",
    scale: [
      "Such a deviation would not be noticed.",
      "The deviation would be noticed; finding the cause only by asking around.",
      "Cause findable through manual case-by-case analysis (looking up individual cases).",
      "Latency breakdown per step available on demand; demonstrated in the session.",
      "Breakdown available on an ongoing basis; main latencies traceable historically; earlier diagnoses documented.",
    ],
  },

  // D6
  "K6.1": {
    label: "Closed loop: measurement → change",
    question: "When did you last change something in the process because of a metric — what exactly?",
    evidence: "A dated example of metric → decision → change (minutes, ticket, changelog); a regular meeting with minutes.",
    scale: [
      "Changes happen only after an incident or escalation; no meeting, no example.",
      "There are conversations about the process; changes resulting from them cannot be shown.",
      "A regular meeting with minutes exists; changes derived from it cannot be found.",
      "At least one measurement-based change in the last 12 months can be shown.",
      "A regular cycle with several documented changes per year; the effect of the changes is re-measured.",
    ],
  },
  "K6.2": {
    label: "Active vs. static zones",
    question: "Which parts of the process are worked on continuously — and which have been untouched for years?",
    evidence: "Change histories of the artifacts and components (file versions, changelogs, ticket history); a map of active/static.",
    scale: [
      "For no component can a change history be found.",
      "History only for individual components; no overall picture can be produced.",
      "Active/static roughly nameable from interviews; history supports it partly.",
      "Active/static map backed by histories; static zones named.",
      "Plus, for static zones, whether they are stable-healthy or frozen-sick is justified (a deliberate, documented decision).",
    ],
  },

  // D7 (per core component)
  "K7.1": {
    label: "Iteration frequency vs. iteration need",
    question: "When was this component last changed — and when should it have been changed?",
    evidence: "Version/change history of the component against documented defects and workarounds (tickets, workaround lists).",
    scale: [
      "Component unchanged for years, although active workarounds exist around it; no one dares touch it.",
      "Need for change named; no change and no documented decision against it.",
      "Changes do happen, but less often than the need arises; the workaround list keeps growing.",
      "Iteration frequency covers the need; open defects stable or declining.",
      "Frequency is steered: unstable or critical components deliberately get higher test and iteration velocity.",
    ],
  },
  "K7.2": {
    label: "Coupling and consumers (blast radius)",
    question: "If we change this component tomorrow — who notices first, and what breaks?",
    evidence: "A documented consumer list (who reads, who writes, which downstream processes); incident history of the last change. Precursor to B §5 check points 1–3.",
    scale: [
      "Consumers unknown; the last change caused an unplanned outage or is avoided for that reason.",
      "Consumers only in the owner's head; never checked against reality.",
      "Consumer list documented; completeness unchecked.",
      "Consumer list documented and verified in the last 12 months (e.g. confirmed during a change).",
      "Couplings including interface agreements documented (who gets what in which format); changes are announced consumer by consumer.",
    ],
  },
  "K7.3": {
    label: "Test and rollback path",
    question: "Can you try out a change without hitting live operations — and undo it if it goes wrong?",
    evidence: "An existing test copy/environment, a documented fallback path (backup state, parallel operation); proof from the last change.",
    scale: [
      "Changes only on the open heart; no backup state, no way back.",
      "Manual backup copy before changes ('_alt', '_backup'); the way back is untested.",
      "Test copy possible and already used; rollback manual and person-dependent.",
      "Test and rollback path documented and actually used at the last change.",
      "Parallel operation or staged rollout possible; rollback demonstrably practiced.",
    ],
  },
  "K7.4": {
    label: "People able to change it",
    question: "Who besides that one person can change this component safely?",
    evidence: "Change history: number of distinct people with proven changes; has the cover case actually occurred?",
    scale: [
      "Exactly one person can change it; when they are away the component stands still (a case that has already happened).",
      "One person changes it; a second 'could in theory' but never has.",
      "Two people with proven changes in the history.",
      "≥2 people change it regularly; the knowledge is documented, not just in someone's head.",
      "The ability to change it is role knowledge: documented and handed over to a new person at least once.",
    ],
  },

  // D8
  "K8.1": {
    label: "Accountable role spoke",
    question: "Who in the business is accountable for this process — and can that person decide on a change?",
    evidence: "A named person; test in conversation: answers detailed questions about the flow AND names their decision scope; cross-check with their manager. Matches the spoke minimum (B §7).",
    scale: [
      "No one can be named, or several conflicting names; the cross-check fails.",
      "Person named; knows the process only superficially OR can decide nothing.",
      "Person knows the process; every decision needs case-by-case escalation.",
      "Person knows the process and decides within a defined scope; no reserved capacity for process work (champion missing).",
      "A named role with process depth, decision scope and allocated capacity; champion named — spoke minimum complete.",
    ],
  },
  "K8.2": {
    label: "Process literacy",
    question: "(ask the people doing the work, not just the owner) Describe the overall process — what happens before your step, what after, and what for?",
    evidence: "Sample interviews with ≥3 people doing the work; coverage and correctness against the observed actual flow.",
    scale: [
      "Respondents know only their own step; what comes before/after is unknown or wrong.",
      "The immediate previous and next step are known; the overall picture is missing.",
      "Overall flow roughly correct; the purpose of individual steps unclear ('we do it for department X, I think').",
      "The majority describe flow and purpose correctly.",
      "Plus respondents independently name the same weak points — the organization sees its own process.",
    ],
  },
  "K8.3": {
    label: "Technical literacy",
    question: "What do you do when the tool slows you down — show me how you helped yourself last time.",
    evidence: "Observed tool use in the sample; ratio of self-help (filters, templates, formulas) to standstill/ticket; origin of the aids in use.",
    scale: [
      "Basic functions of the tools involved are worked around (printing, retyping, calling out).",
      "Basic functions mastered; every deviation produces a ticket or a wait.",
      "Confident use; a few power users build aids that stay local.",
      "Aids are shared and used jointly; the majority use advanced functions.",
      "The team adapts tools itself within the permitted scope (reports, templates, small automations) and documents it.",
    ],
  },
  "K8.4": {
    label: "KPI understanding",
    question: "How would you tell whether the process is running well this week? And what exactly does your main KPI measure?",
    evidence: "Respondents define the main KPI correctly (numerator, denominator, period) and name signal figures; compared against the actual KPI definition.",
    scale: [
      "Main KPI unknown or explained wrongly; no signal figures can be named.",
      "KPI name known; definition wrong or not explainable.",
      "Definition correct at the owner; the people doing the work do not know it.",
      "Owner and the majority of the people doing the work explain the definition and drivers correctly.",
      "Plus respondents name signal figures that are NOT measured today — direct input for the feedback loop (D6) and the coaching-section KPIs (Part 2).",
    ],
  },
  "K8.5": {
    label: "Adoption evidence",
    question: "What was the last change to the process or tool — and does everyone work by it today?",
    evidence: "A spot check in operations: is the new method used, or do old ways live on (old list, old storage location, shadow mail distribution list)?",
    scale: [
      "The last change was effectively rolled back; everyone works the old way.",
      "New and old run in parallel; the majority the old way.",
      "Majority on the new way; old ways exist for special cases without a deliberate decision.",
      "New way adopted across the board; old ways switched off.",
      "Adoption was measured (usage data), stragglers actively brought along; the shutoff date of the old way documented.",
    ],
  },
};
