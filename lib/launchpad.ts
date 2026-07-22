/**
 * Launchpad tile registry (SAP Fiori / Digital Manufacturing style).
 *
 * Data-driven: the home page groups these into categories and forwards each tile
 * to a dedicated portal tool. Adding a tile is one entry — same extensibility
 * ethos as the rest of the portal. KPI values are computed on the server and
 * matched to a tile by `id`.
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
};

// Tiles are pure entry points — no metrics rendered on them.
export const LAUNCHPAD: TileGroup[] = [
  {
    category: "Demand & intake",
    tiles: [
      { id: "assistant", title: "AI Assistant", subtitle: "Intake, simulate, analyse", href: "/assistant", icon: I.chat, tone: "info" },
      { id: "board", title: "Portfolio Board", subtitle: "All demand by stage", href: "/board", icon: I.grid, tone: "info" },
      { id: "attention", title: "Needs Attention", subtitle: "Unreadable or stalled", href: "/board", icon: I.alert, tone: "warn" },
      { id: "new", title: "New Demand", subtitle: "Describe a problem", href: "/assistant", icon: I.spark, tone: "info" },
    ],
  },
  {
    category: "Analyse & value",
    tiles: [
      { id: "analysis", title: "Implementation Analysis", subtitle: "Workload vs. value", href: "/analysis", icon: I.chart, tone: "ok" },
      { id: "value", title: "Portfolio Value", subtitle: "Pipeline · committed · realized", href: "/analysis?horizon=year", icon: I.euro, tone: "ok" },
      { id: "simulate", title: "Business Case Simulation", subtitle: "P10 / P50 / P90 bands", href: "/simulate", icon: I.bolt, tone: "ok" },
      { id: "review", title: "Value Review", subtitle: "Variance vs. business case", href: "/analysis", icon: I.gauge, tone: "ok" },
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
      { id: "docs", title: "Specification", subtitle: "Governance & data model", href: "/board", icon: I.book, tone: "slate" },
      { id: "traces", title: "Agent Traces", subtitle: "Replayable AI runs", href: "/assistant", icon: I.gauge, tone: "slate" },
      { id: "settings", title: "Administration", subtitle: "Roles, skills, playbooks", href: "/board", icon: I.cog, tone: "slate", disabled: true },
    ],
  },
];
