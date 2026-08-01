/**
 * The portal's TOOLS, as a usage taxonomy — the unit the telemetry tool counts
 * against so "how many clicks which tool has" has a stable answer.
 *
 * A tool is identified by the first segment of its route (`/process/…` →
 * `process`, `/champions` → `champions`). That keeps attribution automatic: a
 * new page under an existing tool is counted without touching anything here, and
 * a genuinely new tool is one entry. The set is also the server-side allow-list
 * for UI events, so a malformed or hostile `tool` can't invent a counter.
 *
 * This is deliberately COARSE and content-free. The telemetry tool records which
 * tool was viewed or clicked, never which record, which user, or what was typed —
 * the same principle the people-facing tools hold to (aggregate, never a person).
 */

export interface PortalTool {
  id: string;
  label: string;
}

/** The known tools, by route segment. `home` is the launchpad. */
export const PORTAL_TOOLS: readonly PortalTool[] = [
  { id: "home", label: "Launchpad" },
  { id: "process", label: "Process Funnel" },
  { id: "intake", label: "Intake" },
  { id: "demands", label: "Demands" },
  { id: "board", label: "Portfolio Board" },
  { id: "requirements", label: "Requirements" },
  { id: "personas", label: "Personas" },
  { id: "analysis", label: "Implementation Analysis" },
  { id: "value", label: "Value Cockpit" },
  { id: "simulate", label: "Business Case Simulation" },
  { id: "funnel", label: "Use-case Funnel" },
  { id: "triage", label: "Triage" },
  { id: "champions", label: "Digital Champions" },
  { id: "handovers", label: "Handovers" },
  { id: "assistant", label: "Analyst" },
  { id: "uc", label: "Use-case detail" },
  { id: "build", label: "PoC Builder" },
  { id: "catalog", label: "Skills & Playbooks" },
  { id: "skill-library", label: "Skill Library" },
  { id: "digest", label: "Review Digest" },
  { id: "settings", label: "Settings" },
  { id: "admin", label: "Administration" },
];

const BY_ID = new Map(PORTAL_TOOLS.map((t) => [t.id, t]));

export function isKnownTool(id: string): boolean {
  return BY_ID.has(id);
}

export function toolLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

/**
 * The tool a path belongs to. `/` is `home`; otherwise the first path segment,
 * lower-cased. Unknown segments are returned as-is (still counted) — the route
 * decides what a tool is, this only names the ones we have labels for.
 */
export function toolFromPath(pathname: string): string {
  const clean = (pathname || "/").split(/[?#]/)[0]!;
  const seg = clean.split("/").filter(Boolean)[0];
  if (!seg) return "home";
  return seg.toLowerCase().slice(0, 40);
}

/** The interaction kinds the UI telemetry records. */
export const UI_EVENT_TYPES = ["view", "click", "action"] as const;
export type UiEventType = (typeof UI_EVENT_TYPES)[number];

export function isUiEventType(t: string): t is UiEventType {
  return (UI_EVENT_TYPES as readonly string[]).includes(t);
}
