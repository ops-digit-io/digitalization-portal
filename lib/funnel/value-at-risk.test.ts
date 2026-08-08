import { describe, it, expect } from "vitest";
import { valueAtRisk } from "./value-at-risk.js";
import type { RegistryRow } from "../registry.js";

const NOW = "2026-06-01T00:00:00Z";

const rows: RegistryRow[] = [
  { id: "UC-1", title: "stalled S3 with value", stage: "S3", valueProjected: 200000, since: "2026-01-01" }, // at risk
  { id: "UC-2", title: "stalled S4 with value", stage: "S4", valueProjected: 80000, since: "2026-02-01" },  // at risk
  { id: "UC-3", title: "fresh S3", stage: "S3", valueProjected: 500000, since: "2026-05-25" },              // not stalled
  { id: "UC-4", title: "stalled but no value", stage: "S3", since: "2026-01-01" },                          // no value
  { id: "UC-5", title: "committed stage", stage: "S6", valueProjected: 300000, since: "2026-01-01" },       // not pipeline
  { id: "UC-6", title: "parked", stage: "S3", valueProjected: 90000, since: "2026-01-01", status: "parked" }, // excluded
];

describe("valueAtRisk", () => {
  it("sums projected value of active, stalled pipeline (S3-S4) cases", () => {
    const r = valueAtRisk(rows, NOW);
    expect(r.total).toBe(280000); // UC-1 (200k) + UC-2 (80k)
    expect(r.cases.map((c) => c.id)).toEqual(["UC-1", "UC-2"]); // sorted by value desc
  });

  it("excludes fresh, valueless, non-pipeline, and parked cases", () => {
    const ids = valueAtRisk(rows, NOW).cases.map((c) => c.id);
    expect(ids).not.toContain("UC-3"); // fresh
    expect(ids).not.toContain("UC-4"); // no value
    expect(ids).not.toContain("UC-5"); // S6
    expect(ids).not.toContain("UC-6"); // parked
  });

  it("is empty when nothing is at risk", () => {
    expect(valueAtRisk([{ id: "x", title: "t", stage: "S3", valueProjected: 100, since: NOW }], NOW)).toEqual({ total: 0, cases: [] });
  });
});
