import { describe, it, expect } from "vitest";
import { orderBacklog } from "./backlog.js";
import type { RegistryRow } from "../registry.js";

const NOW = "2026-06-01T00:00:00Z";

const rows: RegistryRow[] = [
  { id: "UC-1", title: "hot new", stage: "S2", heat: "high", since: "2026-05-20" },      // high, ~12d
  { id: "UC-2", title: "hot old", stage: "S2", heat: "high", since: "2026-04-01" },      // high, ~61d
  { id: "UC-3", title: "warm", stage: "S2", heat: "medium", since: "2026-03-01" },       // medium
  { id: "UC-4", title: "cold", stage: "S2", heat: "low", since: "2026-01-01" },          // low
  { id: "UC-5", title: "no heat", stage: "S2", since: "2026-01-01" },                    // none → bottom
  { id: "UC-6", title: "parked", stage: "S2", heat: "high", since: "2026-01-01", status: "parked" }, // excluded
  { id: "UC-7", title: "not shaping", stage: "S4", heat: "high", since: "2026-01-01" },  // excluded (not S2)
];

describe("orderBacklog", () => {
  it("keeps only active S2 rows", () => {
    const ids = orderBacklog(rows, NOW).map((i) => i.row.id);
    expect(ids).not.toContain("UC-6"); // parked
    expect(ids).not.toContain("UC-7"); // S4
    expect(ids).toHaveLength(5);
  });

  it("ranks by heat (high→low→none) then oldest-first within a band", () => {
    const ids = orderBacklog(rows, NOW).map((i) => i.row.id);
    // Both high cases first, older (UC-2) ahead of newer (UC-1); then medium, low, none.
    expect(ids).toEqual(["UC-2", "UC-1", "UC-3", "UC-4", "UC-5"]);
  });

  it("assigns 1-based ranks and computes days-in-stage", () => {
    const top = orderBacklog(rows, NOW)[0]!;
    expect(top.rank).toBe(1);
    expect(top.row.id).toBe("UC-2");
    expect(top.daysInStage).toBeGreaterThan(50);
  });

  it("is empty when nothing is in shaping", () => {
    expect(orderBacklog([{ id: "x", title: "t", stage: "S1" }], NOW)).toEqual([]);
  });
});
