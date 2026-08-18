/**
 * Launchpad tile registry (SAP Fiori / Digital Manufacturing style).
 *
 * Data-driven: the home page groups these into categories and forwards each tile
 * to a dedicated portal tool. Tiles are pure entry points — no metrics rendered.
 * Adding a tile is one entry. Titles/subtitles here are the English defaults;
 * translations live in `lib/i18n.ts` keyed by `tile.<id>.title|subtitle`.
 */

export type Tone = "info" | "ok" | "violet" | "warn" | "slate";

export interface Tile {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  /** 24×24 stroke icon path(s). */
  icon: string;
  tone: Tone;
  /** Drafted tool, not yet built — rendered muted with a "soon" marker. */
  disabled?: boolean;
}

export interface TileGroup {
  category: string;
  tiles: Tile[];
}

// Minimal stroke-icon paths (fill:none, stroke:currentColor).
const I = {
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM13 13h7v7h-7zM4 13h7v7H4z",
  chat: "M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z",
  chart: "M4 4v16h16 M8 15l3-4 3 3 4-6",
  bolt: "M13 3 4 14h6l-1 7 9-12h-6z",
  wrench: "M15 4a4 4 0 0 0 4.9 4.9L21 10 M15 4l-2 2 5 5 2-2 M13 6 4 15l-1 5 5-1 6-6",
  euro: "M15 6a5 5 0 1 0 0 12 M6 10h7 M6 14h6",
  swap: "M7 8h13l-3-3 M17 16H4l3 3",
  alert: "M12 3 2 20h20z M12 10v4 M12 17h.01",
  spark: "M12 3v5 M12 16v5 M3 12h5 M16 12h5 M6 6l3 3 M15 15l3 3 M18 6l-3 3 M9 15l-3 3",
  gauge: "M12 13l4-4 M4 18a8 8 0 1 1 16 0",
  book: "M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 0-2 2z M18 20a2 2 0 0 0 2-2",
  cog: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M12 3v3 M12 18v3 M3 12h3 M18 12h3 M6 6l2 2 M16 16l2 2 M18 6l-2 2 M8 16l-2 2",
  sort: "M6 4v16 M6 4l-3 3 M6 20l-3-3 M11 6h10 M11 12h7 M11 18h4",
  route: "M6 4v10a4 4 0 0 0 4 4h8 M18 14l3 4-3 4 M6 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z M9 4v14 M15 6v14",
  users: "M16 20a4 4 0 0 0-8 0 M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 20a3 3 0 0 0-4-2.8",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z M9 12l2 2 4-4",
  copy: "M9 9h11v11H9z M5 15H4V4h11v1",
  bell: "M18 9a6 6 0 1 0-12 0c0 6-3 7-3 7h18s-3-1-3-7 M13.7 21a2 2 0 0 1-3.4 0",
  download: "M12 3v11 M8 11l4 4 4-4 M5 20h14",
  mesh: "M6 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M18 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M12 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M8 8h8 M7 10l4 5 M17 9l-4 6",
  org: "M4 21V7l6-3 6 3v14 M4 21h18 M16 21V10l4 2v9 M8 9h.01 M12 9h.01 M8 13h.01 M12 13h.01 M8 17h.01 M12 17h.01",
  factory: "M3 21h18 M3 21V10l5 3V10l5 3V10l5 3v8 M6 17h.01 M11 17h.01 M16 17h.01",
  waves: "M2 7c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0 M2 13c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0 M2 19c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0",
  loop: "M4 9a8 8 0 0 1 13-3l3 3 M20 15a8 8 0 0 1-13 3l-3-3 M20 3v6h-6 M4 21v-6h6",
  radar: "M12 12a9 9 0 1 0 9 9 M12 12a5 5 0 1 0 5 5 M12 12l8-8 M16 4h4v4",
  stack: "M12 3 3 7.5 12 12l9-4.5z M3 12l9 4.5L21 12 M3 16.5 12 21l9-4.5",
};

// Tiles are pure entry points — no metrics rendered on them.
export const LAUNCHPAD: TileGroup[] = [
  {
    // The process funnel sits BEFORE the demand funnel: diagnose a process, cut the
    // smallest shippable increment, and let the evidenced result become a demand.
    category: "Diagnose (pre-funnel)",
    tiles: [
      { id: "org", title: "Department OS", subtitle: "The org behind the demands — mandate, decision rights, metrics", href: "/org", icon: I.org, tone: "violet" },
      { id: "process", title: "Process Funnel", subtitle: "Diagnose & score a process before intake", href: "/process", icon: I.route, tone: "violet" },
    ],
  },
  {
    // The standing landscape the demands run on, and what happens to it: the
    // whole application portfolio, the OT depth beneath it, what gets rolled out,
    // and what is being scouted. Pre-demand, like the process funnel beside it —
    // one diagnoses a process, these diagnose what the process stands on.
    category: "Landscape & technology",
    tiles: [
      { id: "tool-landscape", title: "Tool Landscape", subtitle: "Every application, by capability · overlaps, shadow IT, lifecycle debt", href: "/tool-landscape", icon: I.stack, tone: "violet" },
      { id: "landscape", title: "System Landscape", subtitle: "Plants × ISA-95 · integration state · the UNS backlog", href: "/landscape", icon: I.factory, tone: "violet" },
      { id: "rollout", title: "Rollout", subtitle: "Technology decisions & scaling waves across the plants", href: "/rollout", icon: I.waves, tone: "violet" },
      { id: "ai-framework", title: "AI Framework", subtitle: "Production models on the ladder · control loops & their safety case", href: "/ai-framework", icon: I.loop, tone: "violet" },
      { id: "scout", title: "Technology Scout", subtitle: "Sweep public sources · relevance vs. fit to our own gaps", href: "/scout", icon: I.radar, tone: "info" },
    ],
  },
  {
    category: "Demand & intake",
    tiles: [
      { id: "intake", title: "Intake", subtitle: "Capture a demand — chat, form or markdown", href: "/intake", icon: I.spark, tone: "info" },
      { id: "demands", title: "Demands", subtitle: "Every demand taken in", href: "/demands", icon: I.chat, tone: "info" },
      { id: "board", title: "Portfolio Board", subtitle: "All demand by stage", href: "/board", icon: I.grid, tone: "info" },
      { id: "attention", title: "Needs Attention", subtitle: "Unreadable or stalled", href: "/attention", icon: I.alert, tone: "warn" },
    ],
  },
  {
    category: "Analyse & value",
    tiles: [
      { id: "analyst", title: "Analyst", subtitle: "Simulate, size, scaffold", href: "/assistant", icon: I.chat, tone: "ok" },
      { id: "requirements", title: "Requirements", subtitle: "Epics & stories from intake", href: "/requirements", icon: I.book, tone: "ok" },
      { id: "personas", title: "Persona Analyst", subtitle: "Requestor profiles & cohorts", href: "/personas", icon: I.users, tone: "ok" },
      { id: "persona-library", title: "Persona Library", subtitle: "The vocabulary requirements cite", href: "/personas/library", icon: I.book, tone: "ok" },
      { id: "analysis", title: "Implementation Analysis", subtitle: "Workload vs. value", href: "/analysis", icon: I.chart, tone: "ok" },
      { id: "value", title: "Value Cockpit", subtitle: "Pipeline · committed · realized", href: "/value", icon: I.euro, tone: "ok" },
      { id: "simulate", title: "Business Case Simulation", subtitle: "P10 / P50 / P90 bands", href: "/simulate", icon: I.bolt, tone: "ok" },
      { id: "review", title: "Value Review", subtitle: "Variance vs. business case", href: "/analysis", icon: I.gauge, tone: "ok" },
    ],
  },
  {
    category: "Portfolio & steering",
    tiles: [
      { id: "funnel", title: "Use-case Funnel", subtitle: "Stage flow, kill rate by gate", href: "/funnel", icon: I.chart, tone: "info" },
      { id: "triage", title: "Triage", subtitle: "Classify & assign lanes", href: "/triage", icon: I.route, tone: "info" },
      { id: "backlog", title: "Backlog", subtitle: "Prioritize (S2)", href: "/backlog", icon: I.sort, tone: "slate" },
      { id: "roadmap", title: "Roadmap", subtitle: "Milestones & gates", href: "/roadmap", icon: I.map, tone: "slate" },
      { id: "champions", title: "Digital Champions", subtitle: "Network coverage & gaps", href: "/champions", icon: I.users, tone: "info" },
    ],
  },
  {
    category: "Build & deliver",
    tiles: [
      { id: "poc", title: "Agentic PoC Builder", subtitle: "Repo · spec · artifact", href: "/build", icon: I.wrench, tone: "violet" },
      { id: "handovers", title: "Handovers", subtitle: "Run-lane & G7 records", href: "/handovers", icon: I.swap, tone: "violet" },
    ],
  },
  {
    category: "Govern & operate",
    tiles: [
      { id: "docs", title: "Specification", subtitle: "Governance & data model", href: "/docs", icon: I.book, tone: "slate" },
      { id: "catalog", title: "Skills & Playbooks", subtitle: "Agent capabilities", href: "/catalog", icon: I.copy, tone: "info" },
      { id: "categories", title: "Categories", subtitle: "Manage plants & domains (admin)", href: "/admin/categories", icon: I.cog, tone: "slate" },
      { id: "poc-templates", title: "PoC Templates", subtitle: "Check & manage template repos (admin)", href: "/admin/templates", icon: I.copy, tone: "slate" },
      { id: "skill-library", title: "Skill Library", subtitle: "Import reference skills (agentskills.io)", href: "/skill-library", icon: I.download, tone: "info" },
      { id: "traces", title: "Agent Traces", subtitle: "Replayable AI runs", href: "/assistant", icon: I.gauge, tone: "slate", disabled: true },
      { id: "digest", title: "Review Digest", subtitle: "Due dates & staleness", href: "/digest", icon: I.bell, tone: "slate" },
      { id: "mesh", title: "Context Mesh", subtitle: "How every artifact relates", href: "/mesh", icon: I.mesh, tone: "info" },
      { id: "usage", title: "Usage & Cost", subtitle: "AI spend and portal use by tool (admin)", href: "/admin/usage", icon: I.gauge, tone: "info" },
      { id: "settings", title: "Configuration", subtitle: "Integrations & status", href: "/settings", icon: I.shield, tone: "info" },
    ],
  },
];

/** Flat list of all tiles, for the search palette. */
export const ALL_TILES: Tile[] = LAUNCHPAD.flatMap((g) => g.tiles);
