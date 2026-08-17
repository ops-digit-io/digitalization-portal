/**
 * Operations IT Support — the run lane as an operated service.
 *
 * The run lane was a trapdoor. A demand classified `run` got a row in
 * `registry/handovers.md` and left the portal: no service it belonged to, no team
 * that carried it, no standard it was answered to. That is fine as a routing rule
 * and useless as a description of a department someone actually leads.
 *
 * This module reads the same file with four more columns — service, region, team
 * and severity — so the lane has a catalogue and a load behind it.
 *
 * CONSTRAINT #6 IS THE DESIGN, NOT A FOOTNOTE. There is no per-person anything
 * here and there never will be: `Team owner` is a team, load aggregates by
 * service and region, and nothing sorts people. `lib/champions.ts` states the
 * same rule for the champion network — "a gap is a finding about the network. It
 * is never a finding about a person" — and this is that rule for the support team.
 * A queue that ranks colleagues is a works-council problem wearing a dashboard.
 *
 * Pure: markdown in, data out. Never throws.
 */

import { parseFirstTable, columnIndex } from "../markdown.js";

/** Response targets, most urgent first. Plant local hours. */
export const SEVERITIES = ["S1", "S2", "S3", "S4"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_TARGET: Record<Severity, string> = {
  S1: "production stopped — 30 min, 24×5",
  S2: "production degraded — 2 h, regional hours",
  S3: "single workplace — 1 working day",
  S4: "request / question — 3 working days",
};

export interface HandoverRow {
  id: string;
  title: string;
  plant: string;
  domain: string;
  service: string;
  region: string;
  teamOwner: string;
  severity: Severity | "";
  requester: string;
  decided: string;
  by: string;
  externalRef: string;
  status: string;
  needsAttention: boolean;
  issues: string[];
}

function cell(cells: string[], idx: number): string {
  return idx < 0 ? "" : (cells[idx] ?? "").trim();
}

function rows(md: string | undefined): { get: (label: string) => string }[] {
  const table = parseFirstTable(md ?? "");
  if (!table || table.headers.length === 0) return [];
  const idx = new Map<string, number>();
  for (const h of table.headers) idx.set(h.trim().toLowerCase(), columnIndex(table.headers, h));
  return table.rows.map((cells) => ({
    get: (label: string) => cell(cells, idx.get(label.trim().toLowerCase()) ?? -1),
  }));
}

/** Parse `registry/handovers.md`. Malformed rows are kept and marked. */
export function parseHandovers(md: string | undefined): HandoverRow[] {
  return rows(md)
    .map((r) => {
      const issues: string[] = [];

      const id = r.get("ID");
      if (id === "") issues.push("no ID");

      const rawSeverity = r.get("Severity / SLA").toUpperCase();
      const severity: Severity | "" = (SEVERITIES as readonly string[]).includes(rawSeverity)
        ? (rawSeverity as Severity)
        : "";
      if (severity === "") issues.push(rawSeverity === "" ? "no severity" : `unreadable severity "${rawSeverity}"`);

      const service = r.get("Service");
      if (service === "") issues.push("no service — the lane cannot be an operated service without one");

      const teamOwner = r.get("Team owner");
      if (teamOwner === "") issues.push("no team owner");

      // The acceptance rule the handover doc already states: without an external
      // reference the trail breaks at the boundary and nobody can follow it on.
      const externalRef = r.get("External ref");
      if (externalRef === "") issues.push("no external reference — the trail breaks at the boundary");

      return {
        id,
        title: r.get("Title"),
        plant: r.get("Plant"),
        domain: r.get("Domain"),
        service,
        region: r.get("Region"),
        teamOwner,
        severity,
        requester: r.get("Requester"),
        decided: r.get("Decided"),
        by: r.get("By"),
        externalRef,
        status: r.get("Status").toLowerCase(),
        needsAttention: issues.length > 0,
        issues,
      };
    })
    .filter((r) => r.id !== "" || r.title !== "");
}

export interface ServiceLoad {
  service: string;
  total: number;
  open: number;
  /** Counts per severity, most urgent first. */
  bySeverity: { severity: Severity; count: number }[];
}

/** Load per service. Never per person — see the module docblock. */
export function loadByService(handovers: readonly HandoverRow[]): ServiceLoad[] {
  const names = [...new Set(handovers.map((h) => h.service).filter((s) => s !== ""))].sort();
  return names
    .map((service) => {
      const mine = handovers.filter((h) => h.service === service);
      return {
        service,
        total: mine.length,
        open: mine.filter((h) => h.status === "open").length,
        bySeverity: SEVERITIES.map((severity) => ({ severity, count: mine.filter((h) => h.severity === severity).length })),
      };
    })
    .sort((a, b) => b.open - a.open || b.total - a.total || (a.service < b.service ? -1 : 1));
}

export interface RegionLoad {
  region: string;
  teams: string[];
  total: number;
  open: number;
  plants: number;
}

/** Load per region — the shape of an international team's work, not of its people. */
export function loadByRegion(handovers: readonly HandoverRow[]): RegionLoad[] {
  const names = [...new Set(handovers.map((h) => h.region).filter((r) => r !== ""))].sort();
  return names.map((region) => {
    const mine = handovers.filter((h) => h.region === region);
    return {
      region,
      teams: [...new Set(mine.map((h) => h.teamOwner).filter((t) => t !== ""))].sort(),
      total: mine.length,
      open: mine.filter((h) => h.status === "open").length,
      plants: new Set(mine.map((h) => h.plant).filter((p) => p !== "")).size,
    };
  });
}

export interface ServiceSummary {
  handovers: number;
  open: number;
  services: number;
  regions: number;
  /** Rows with no external reference — the trail breaks there. */
  untraceable: number;
  needsAttention: number;
}

export function summariseService(handovers: readonly HandoverRow[]): ServiceSummary {
  return {
    handovers: handovers.length,
    open: handovers.filter((h) => h.status === "open").length,
    services: new Set(handovers.map((h) => h.service).filter((s) => s !== "")).size,
    regions: new Set(handovers.map((h) => h.region).filter((r) => r !== "")).size,
    untraceable: handovers.filter((h) => h.externalRef === "").length,
    needsAttention: handovers.filter((h) => h.needsAttention).length,
  };
}
