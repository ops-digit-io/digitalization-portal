/**
 * Health-model tests — pin the catalogue's aggregation and Grün/Gelb/Rot logic
 * (doc A §6): knock-out dominates, two weak dimensions are red, one is only amber,
 * green needs full coverage, and D7 takes the worst Kernkomponente.
 */

import { describe, it, expect } from "vitest";
import { healthProfile, type ProfileInput, type Rating } from "./health-model";
import { CRITERIA, DIMENSIONS, criteriaOf, type Level } from "./criteria";

/** All criteria at `level`; D7 goes into one component. Overrides by criterion id. */
function allAt(level: Level, overrides: Record<string, Level> = {}, comps?: { label: string; level: Level }[]): ProfileInput {
  const ratings: Record<string, Rating> = {};
  for (const c of CRITERIA) if (!c.perComponent) ratings[c.id] = { level: overrides[c.id] ?? level };
  const d7 = CRITERIA.filter((c) => c.perComponent);
  const components = (comps ?? [{ label: "Kernkomponente", level }]).map((cc, i) => ({
    id: `c${i}`, label: cc.label,
    ratings: Object.fromEntries(d7.map((c) => [c.id, { level: overrides[c.id] ?? cc.level } as Rating])),
  }));
  return { ratings, components };
}

describe("health model", () => {
  it("weights sum to 100 and every dimension has criteria", () => {
    expect(DIMENSIONS.reduce((a, d) => a + d.weight, 0)).toBe(100);
    expect(DIMENSIONS.every((d) => criteriaOf(d.id).length > 0)).toBe(true);
    expect(CRITERIA.length).toBe(29);
  });

  it("an empty assessment is grau", () => {
    const p = healthProfile({ ratings: {} });
    expect(p.status).toBe("grau");
    expect(p.portfolioValue).toBeNull();
  });

  it("fully rated at S4 with all knock-outs cleared is grün", () => {
    const p = healthProfile(allAt(4));
    expect(p.coverage).toBe(1);
    expect(p.status).toBe("gruen");
  });

  it("K8.1 = S1 is rot (Aufnahme knock-out), whatever the rest scores", () => {
    const p = healthProfile(allAt(5, { "K8.1": 1 }));
    expect(p.status).toBe("rot");
    expect(p.knockOuts.find((k) => k.id === "K8.1")?.state).toBe("fail");
    expect(/K\.o/.test(p.reason)).toBe(true);
  });

  it("K5.1 = S1 is rot (Optimierungs knock-out)", () => {
    const p = healthProfile(allAt(5, { "K5.1": 1 }));
    expect(p.status).toBe("rot");
  });

  it("one dimension below 2.0 is only gelb — an outlier is a finding, not a pattern", () => {
    const d1 = Object.fromEntries(criteriaOf("D1").map((c) => [c.id, 1 as Level]));
    const p = healthProfile(allAt(4, d1));
    expect(p.dimensions.find((d) => d.id === "D1")?.score).toBe(1);
    expect(p.status).toBe("gelb");
  });

  it("two dimensions below 2.0 are rot without any knock-out failing", () => {
    const weak = {
      ...Object.fromEntries(criteriaOf("D1").map((c) => [c.id, 1 as Level])),
      ...Object.fromEntries(criteriaOf("D3").map((c) => [c.id, 1 as Level])),
    };
    const p = healthProfile(allAt(4, weak));
    expect(p.status).toBe("rot");
    expect(p.knockOuts.every((k) => k.state !== "fail")).toBe(true);
  });

  it("a perfect file with an unrated knock-out is not grün (coverage < 1)", () => {
    const input = allAt(4);
    delete input.ratings["K2.2"]; // leave a knock-out open
    const p = healthProfile(input);
    expect(p.coverage).toBeLessThan(1);
    expect(p.status).toBe("gelb");
    expect(p.knockOuts.find((k) => k.id === "K2.2")?.state).toBe("open");
  });

  it("D7 takes the worst Kernkomponente", () => {
    const p = healthProfile(allAt(4, {}, [{ label: "ERP", level: 4 }, { label: "Excel-Liste", level: 2 }]));
    const d7 = p.dimensions.find((d) => d.id === "D7");
    expect(d7?.score).toBe(2);
    expect(d7?.worstComponent).toBe("Excel-Liste");
  });

  it("surfaces a Zweig-1 Richtungsvektor when the timestamp knock-out is weak", () => {
    const p = healthProfile(allAt(4, { "K5.1": 2 }));
    expect(p.directions.some((d) => /Zweig 1/.test(d))).toBe(true);
  });
});
