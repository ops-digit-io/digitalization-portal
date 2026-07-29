import { describe, it, expect } from "vitest";
import { computeEconomics, DEFAULT_HORIZON_YEARS } from "./business-economics.js";

describe("computeEconomics", () => {
  it("computes net value, payback, ROI and NPV for a viable case", () => {
    const e = computeEconomics({
      grossP10: 150_000,
      grossP50: 250_000,
      grossP90: 250_000,
      buildCost: 80_000,
      annualRunCost: 20_000,
      horizonYears: 5,
      discountRate: 0.08,
    });
    expect(e.p50.netAnnual).toBe(230_000); // 250k gross − 20k run
    expect(e.p10.netAnnual).toBe(130_000);
    expect(e.hasCostModel).toBe(true);
    expect(e.hasValue).toBe(true);
    // payback = 80k / 230k ≈ 0.35 yr
    expect(e.paybackYears).toBeCloseTo(0.35, 2);
    // undiscounted cumulative net over 5 yr = 5·230k − 80k
    expect(e.cumulativeNet).toBe(5 * 230_000 - 80_000);
    // ROI over horizon on the build cost
    expect(e.roiPercent).toBe(Math.round(((230_000 * 5 - 80_000) / 80_000) * 100));
    // NPV positive and below the undiscounted cumulative
    expect(e.npv).toBeGreaterThan(0);
    expect(e.npv).toBeLessThan(e.cumulativeNet);
    expect(e.viable).toBe(true);
    // cumulative curve: starts at −build, ends at cumulativeNet, length H+1
    expect(e.cumulativeByYear[0]).toBe(-80_000);
    expect(e.cumulativeByYear).toHaveLength(6);
    expect(e.cumulativeByYear[5]).toBe(e.cumulativeNet);
  });

  it("stays honest with no value — every figure zero, nothing viable", () => {
    const e = computeEconomics({ grossP10: 0, grossP50: 0, grossP90: 0, buildCost: 80_000 });
    expect(e.hasValue).toBe(false);
    expect(e.p50.netAnnual).toBe(-80_000 + 80_000 - 80_000 + 80_000); // net = 0 gross − 0 run = 0
    expect(e.p50.netAnnual).toBe(0);
    expect(e.paybackYears).toBeUndefined(); // never pays back
    expect(e.viable).toBe(false);
    expect(e.horizonYears).toBe(5);
  });

  it("tracks 'no cost model' rather than assuming zero cost", () => {
    const e = computeEconomics({ grossP10: 100_000, grossP50: 180_000, grossP90: 200_000 });
    expect(e.hasCostModel).toBe(false);
    expect(e.buildCost).toBe(0);
    expect(e.annualRunCost).toBe(0);
    expect(e.paybackYears).toBeUndefined(); // no build cost to recover
    expect(e.roiPercent).toBeUndefined();
    expect(e.p50.netAnnual).toBe(180_000); // net == gross when no run cost
    expect(e.cumulativeNet).toBe(5 * 180_000); // no build to subtract
    expect(e.viable).toBe(true);
  });

  it("defaults the horizon and never divides by an unknown build", () => {
    const e = computeEconomics({ grossP10: 1, grossP50: 1, grossP90: 1, annualRunCost: 5 });
    expect(e.horizonYears).toBe(DEFAULT_HORIZON_YEARS);
    expect(e.p50.netAnnual).toBe(-4); // 1 − 5, a net loss
    expect(e.viable).toBe(false);
  });
});
