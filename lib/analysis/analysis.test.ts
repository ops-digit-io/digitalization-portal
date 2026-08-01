import { describe, expect, it } from "vitest";
import { estimateEffort, horizonValue, remainingEffortWeeks, riskedAnnualValue } from "./estimate.js";
import { analyzePortfolio, planWithinCapacity, type AnalysisItem } from "./portfolio.js";
import { parseBusinessCase, simulateBusinessCase } from "../businesscase.js";
import type { RegistryRow } from "../registry.js";

const rows: RegistryRow[] = [
  { id: "UC-A", title: "Near live", stage: "S7", status: "active", level: "L2", heat: "medium", valueProjected: 200000, since: "2026-01-01" },
  { id: "UC-B", title: "Early", stage: "S2", status: "active", level: "L1", heat: "high", valueProjected: 300000, since: "2026-05-01" },
  { id: "UC-C", title: "Live", stage: "S8", status: "active", level: "L2", heat: "low", valueRealized: 90000, since: "2026-01-01" },
  { id: "UC-D", title: "Parked", stage: "S3", status: "parked", valueProjected: 50000, since: "2026-04-01" },
];

describe("effort + value estimation", () => {
  it("remaining effort decreases as stages advance", () => {
    expect(remainingEffortWeeks("S1")).toBeGreaterThan(remainingEffortWeeks("S5"));
    expect(remainingEffortWeeks("S8")).toBe(0);
  });

  it("L1/high costs more effort than L2/low", () => {
    const l1 = estimateEffort({ id: "x", title: "", stage: "S3", level: "L1", heat: "high" }).effortWeeks;
    const l2 = estimateEffort({ id: "y", title: "", stage: "S3", level: "L2", heat: "low" }).effortWeeks;
    expect(l1).toBeGreaterThan(l2);
  });

  it("value is risk-discounted by stage; S8 uses realized", () => {
    expect(riskedAnnualValue(rows[0]!)).toBe(Math.round(200000 * 0.85)); // S7 committed
    expect(riskedAnnualValue(rows[2]!)).toBe(90000); // S8 realized, discount 1.0
  });

  it("an early-stage use case lands little value within a quarter", () => {
    const q = horizonValue(rows[1]!, 13, 3);
    const y = horizonValue(rows[1]!, 52, 3);
    expect(q).toBeLessThan(y);
  });
});

describe("analyzePortfolio", () => {
  const a = analyzePortfolio(rows, { horizon: "quarter", parallelism: 3, capacityPersonWeeks: 30 });

  it("excludes parked/killed use cases", () => {
    expect(a.items.map((i) => i.id)).not.toContain("UC-D");
    expect(a.totals.count).toBe(3);
  });

  it("ranks by value per effort and totals workload + value", () => {
    expect(a.ranked[0]?.valuePerEffort).toBeGreaterThanOrEqual(a.ranked[a.ranked.length - 1]!.valuePerEffort);
    expect(a.totals.totalEffortWeeks).toBeGreaterThan(0);
  });

  it("builds a timeline with workload and value run-rate", () => {
    expect(a.timeline.length).toBe(3);
    // value run-rate is non-decreasing as more use cases go live
    for (let i = 1; i < a.timeline.length; i++) {
      expect(a.timeline[i]!.valueRunRate).toBeGreaterThanOrEqual(a.timeline[i - 1]!.valueRunRate);
    }
  });

  it("flags capacity feasibility", () => {
    expect(a.capacity).toBeDefined();
    expect(typeof a.capacity!.feasible).toBe("boolean");
  });

  it("year horizon lands at least as much value as a quarter", () => {
    const year = analyzePortfolio(rows, { horizon: "year", parallelism: 3 });
    expect(year.totals.totalHorizonValue).toBeGreaterThanOrEqual(a.totals.totalHorizonValue);
  });

  it("breaks workload down by lane and by stage, covering every active item", () => {
    const laned: RegistryRow[] = [
      { id: "L-1", title: "run a", stage: "S4", status: "active", lane: "run", valueProjected: 100000 },
      { id: "L-2", title: "run b", stage: "S3", status: "active", lane: "run", valueProjected: 50000 },
      { id: "L-3", title: "transform", stage: "S5", status: "active", lane: "transform", valueProjected: 200000 },
    ];
    const r = analyzePortfolio(laned, { horizon: "year", parallelism: 2 });
    expect(r.byLane.reduce((s, g) => s + g.count, 0)).toBe(3);
    expect(r.byLane.find((g) => g.key === "run")?.count).toBe(2);
    expect(r.byStage.map((g) => g.key).sort()).toEqual(["S3", "S4", "S5"]);
    // Sorted by effort, descending.
    for (let i = 1; i < r.byLane.length; i++) expect(r.byLane[i - 1]!.effortWeeks).toBeGreaterThanOrEqual(r.byLane[i]!.effortWeeks);
  });

  it("marks each ranked item keep/defer when a capacity is set", () => {
    const tight = analyzePortfolio(rows, { horizon: "quarter", parallelism: 3, capacityPersonWeeks: 5 });
    expect(tight.plan).toBeDefined();
    // Every item carries the decision, and keep+defer partition the set.
    expect(tight.items.every((i) => typeof i.inPlan === "boolean")).toBe(true);
    expect(tight.plan!.inPlan.length + tight.plan!.deferred.length).toBe(tight.items.length);
  });
});

describe("planWithinCapacity — the keep/defer recommendation", () => {
  const item = (id: string, effortWeeks: number, horizonValue: number): AnalysisItem => ({
    id, title: id, effortWeeks, goLiveWeeks: effortWeeks, annualValue: horizonValue,
    horizonValue, valuePerEffort: effortWeeks > 0 ? Math.round(horizonValue / effortWeeks) : horizonValue,
    landsInHorizon: true,
  });
  // Already ranked by value-per-effort desc: A=1000/pw, B=500/pw, C=100/pw.
  const ranked = [item("A", 4, 4000), item("B", 4, 2000), item("C", 4, 400)];

  it("keeps the best ratios until the budget is spent, defers the rest", () => {
    const plan = planWithinCapacity(ranked, 8); // room for two 4-pw items
    expect(plan.inPlan).toEqual(["A", "B"]);
    expect(plan.deferred).toEqual(["C"]);
    expect(plan.effortUsed).toBe(8);
    expect(plan.valueCaptured).toBe(6000);
    expect(plan.valueDeferred).toBe(400);
    expect(plan.feasible).toBe(false);
  });

  it("is feasible when everything fits", () => {
    const plan = planWithinCapacity(ranked, 100);
    expect(plan.deferred).toEqual([]);
    expect(plan.feasible).toBe(true);
  });

  it("always keeps a zero-effort (already live) item, even at zero capacity", () => {
    const plan = planWithinCapacity([item("LIVE", 0, 90000), item("BIG", 10, 5000)], 0);
    expect(plan.inPlan).toContain("LIVE");
    expect(plan.deferred).toContain("BIG");
  });
});

describe("business case parsing + simulation", () => {
  const bc = `# Business case
## State
- **Confidence:** indicative
## Baseline
**Verified.** No
## Value
**Category.** Quality cost reduction.
**Annual gross.** EUR 180,000.
### Assumptions
| Assumption | Tested | Source |
|---|---|---|
| Proportional rework reduction | No | — |
| Loaded rate EUR 62/h | Yes | Controlling |
`;

  it("parses confidence, baseline, base figure, and assumptions", () => {
    const facts = parseBusinessCase(bc);
    expect(facts.confidence).toBe("indicative");
    expect(facts.baselineVerified).toBe(false);
    expect(facts.annualGross).toBe(180000);
    expect(facts.assumptions).toHaveLength(2);
    expect(facts.assumptions.find((a) => /proportional/i.test(a.name))?.tested).toBe(false);
  });

  it("simulates a band that is never committed and ranks untested first", () => {
    const { simulation } = simulateBusinessCase(bc);
    expect(simulation.confidence).toBe("indicative");
    expect(simulation.p10).toBeLessThan(simulation.p90);
    expect(simulation.drivers[0]?.tested).toBe(false);
  });

  it("never throws on malformed input", () => {
    expect(() => parseBusinessCase("garbage")).not.toThrow();
    expect(parseBusinessCase("garbage").assumptions).toEqual([]);
  });
});
