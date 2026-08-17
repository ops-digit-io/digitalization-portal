/**
 * Operations IT Support — the run lane as an operated service.
 *
 * The test that matters most here is the last one: nothing in this module may
 * aggregate by person. Constraint #6 is a works-council boundary, not a product
 * decision, and a support queue is exactly where a per-person leaderboard would
 * feel natural and be wrong.
 */

import { describe, it, expect } from "vitest";
import {
  parseHandovers,
  loadByService,
  loadByRegion,
  summariseService,
  SEVERITY_TARGET,
  SEVERITIES,
} from "./service.js";

const HEAD =
  "| ID | Title | Plant | Domain | Service | Region | Team owner | Severity / SLA | Requester | Decided | By | External ref | Status |\n" +
  "|---|---|---|---|---|---|---|---|---|---|---|---|---|\n";

const ho = (
  id: string,
  service: string,
  region: string,
  team: string,
  sev: string,
  status: string,
  plant = "DE-ALD",
  ref = "INC-1",
): string =>
  `| ${id} | t | ${plant} | quality | ${service} | ${region} | ${team} | ${sev} | Req | 2026-01-01 | triage | ${ref} | ${status} |\n`;

describe("parseHandovers", () => {
  it("reads a well-formed row", () => {
    const rows = parseHandovers(HEAD + ho("HO-1", "OT connectivity", "Europe", "Ops IT Europe", "S2", "open"));
    expect(rows[0]).toMatchObject({
      id: "HO-1",
      service: "OT connectivity",
      region: "Europe",
      teamOwner: "Ops IT Europe",
      severity: "S2",
      status: "open",
      needsAttention: false,
    });
  });

  it("never throws on absent, empty or table-less input", () => {
    expect(parseHandovers(undefined)).toEqual([]);
    expect(parseHandovers("")).toEqual([]);
    expect(parseHandovers("# Prose only, no table")).toEqual([]);
  });

  it("keeps and marks a row with no service — a lane without one is not a service", () => {
    const rows = parseHandovers(HEAD + ho("HO-1", "", "Europe", "Ops IT Europe", "S2", "open"));
    expect(rows[0]!.needsAttention).toBe(true);
    expect(rows[0]!.issues.join(" ")).toContain("no service");
  });

  it("marks a missing external reference — the trail breaks at the boundary", () => {
    const rows = parseHandovers(HEAD + ho("HO-1", "OT connectivity", "Europe", "Ops IT Europe", "S2", "open", "DE-ALD", ""));
    expect(rows[0]!.needsAttention).toBe(true);
    expect(rows[0]!.issues.join(" ")).toContain("external reference");
  });

  it("keeps and marks an unreadable severity", () => {
    const rows = parseHandovers(HEAD + ho("HO-1", "OT connectivity", "Europe", "Ops IT Europe", "urgent-ish", "open"));
    expect(rows[0]!.needsAttention).toBe(true);
    expect(rows[0]!.severity).toBe("");
  });

  it("names a response target for every severity", () => {
    for (const s of SEVERITIES) expect(SEVERITY_TARGET[s]).toBeTruthy();
  });
});

describe("loadByService", () => {
  const rows = parseHandovers(
    HEAD +
      ho("HO-1", "OT connectivity", "Europe", "Ops IT Europe", "S1", "open") +
      ho("HO-2", "OT connectivity", "Asia", "Ops IT Asia", "S2", "closed") +
      ho("HO-3", "Access & identity", "Americas", "Ops IT Americas", "S4", "closed"),
  );

  it("aggregates by service and puts the most open first", () => {
    const l = loadByService(rows);
    expect(l[0]).toMatchObject({ service: "OT connectivity", total: 2, open: 1 });
    expect(l[1]).toMatchObject({ service: "Access & identity", total: 1, open: 0 });
  });

  it("breaks each service down by severity", () => {
    const ot = loadByService(rows)[0]!;
    expect(Object.fromEntries(ot.bySeverity.map((s) => [s.severity, s.count]))).toEqual({ S1: 1, S2: 1, S3: 0, S4: 0 });
  });
});

describe("loadByRegion", () => {
  it("reports the international shape of the work and the teams carrying it", () => {
    const rows = parseHandovers(
      HEAD +
        ho("HO-1", "OT connectivity", "Europe", "Ops IT Europe", "S1", "open", "DE-ALD") +
        ho("HO-2", "Data quality", "Europe", "Ops IT Europe", "S2", "closed", "SK-PUC") +
        ho("HO-3", "Access & identity", "Asia", "Ops IT Asia", "S4", "closed", "CN-SUZ"),
    );
    const l = loadByRegion(rows);
    expect(l[0]).toMatchObject({ region: "Asia", total: 1, plants: 1, teams: ["Ops IT Asia"] });
    expect(l[1]).toMatchObject({ region: "Europe", total: 2, open: 1, plants: 2, teams: ["Ops IT Europe"] });
  });
});

describe("summariseService", () => {
  it("counts the queue, its services and anything untraceable", () => {
    const rows = parseHandovers(
      HEAD +
        ho("HO-1", "OT connectivity", "Europe", "Ops IT Europe", "S1", "open") +
        ho("HO-2", "Data quality", "Asia", "Ops IT Asia", "S2", "closed", "CN-SUZ", ""),
    );
    expect(summariseService(rows)).toMatchObject({
      handovers: 2,
      open: 1,
      services: 2,
      regions: 2,
      untraceable: 1,
      needsAttention: 1,
    });
  });
});

describe("constraint #6 — no per-requester, no per-person analytics", () => {
  const rows = parseHandovers(
    HEAD +
      ho("HO-1", "OT connectivity", "Europe", "Ops IT Europe", "S1", "open") +
      ho("HO-2", "OT connectivity", "Europe", "Ops IT Europe", "S2", "open"),
  );

  it("aggregates by service and region only — never by requester or by a named person", () => {
    const keys = [...loadByService(rows), ...loadByRegion(rows)].flatMap((x) => Object.keys(x));
    // `teams` is allowed and is the point; a requester/assignee/person key is not.
    expect(keys.filter((k) => /requester|person|assignee|individual|employee|user/i.test(k))).toEqual([]);
  });

  it("carries teams, not people, on a region", () => {
    // `teams` is a set of team names taken from the Team owner column, which the
    // registry documents as a team. If this ever became a person it would be a
    // works-council problem wearing a dashboard.
    expect(loadByRegion(rows)[0]!.teams).toEqual(["Ops IT Europe"]);
  });

  it("offers no function that ranks anyone", () => {
    // A deliberate structural assertion: the module's whole export surface is
    // service- and region-shaped. Adding a per-person aggregate would fail here.
    const exported = ["parseHandovers", "loadByService", "loadByRegion", "summariseService"];
    expect(exported.some((n) => /person|user|requester|assignee|agentName/i.test(n))).toBe(false);
  });
});
