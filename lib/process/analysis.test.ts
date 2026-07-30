/**
 * The deterministic demand proposer (the offline agent path). Pins the ordering
 * rule from the Ablauf: no spoke → only the spoke demand; an optimisation knock-out
 * on S1/S2 → an enabler ("Messbarkeit"/"Zugang") demand before optimisation.
 */

import { describe, it, expect } from "vitest";
import { deterministicDemands } from "./analysis";
import { healthProfile, type ProfileInput, type Rating } from "./health-model";
import { CRITERIA, type Level } from "./criteria";

function profile(overrides: Record<string, Level> = {}): ReturnType<typeof healthProfile> {
  const ratings: Record<string, Rating> = {};
  for (const c of CRITERIA) if (!c.perComponent) ratings[c.id] = { level: overrides[c.id] ?? 4 };
  const comps = [{ id: "c0", label: "K", ratings: Object.fromEntries(CRITERIA.filter((c) => c.perComponent).map((c) => [c.id, { level: overrides[c.id] ?? 4 } as Rating])) }];
  const input: ProfileInput = { ratings, components: comps };
  return healthProfile(input);
}

describe("analysis — deterministic proposer", () => {
  it("no spoke (K8.1 = S1): the only demand is to staff the spoke", () => {
    const demands = deterministicDemands(profile({ "K8.1": 1 }));
    expect(demands.length).toBe(1);
    expect(demands[0]!.title).toMatch(/Spoke/i);
    expect(demands[0]!.lane).toBe("transform");
  });

  it("timestamp knock-out weak (K5.1 = S2): proposes the measurability enabler", () => {
    const demands = deterministicDemands(profile({ "K5.1": 2 }));
    expect(demands.some((d) => /Messbarkeit|Timestamps/i.test(d.title) && d.lane === "data_ai")).toBe(true);
  });

  it("interface knock-out weak (K2.2 = S2): proposes the interface-access enabler", () => {
    const demands = deterministicDemands(profile({ "K2.2": 2 }));
    expect(demands.some((d) => /Interface/i.test(d.title))).toBe(true);
  });

  it("a healthy profile yields no forced enabler demands", () => {
    const demands = deterministicDemands(profile());
    expect(demands.every((d) => !/Spoke|Messbarkeit|Interface/i.test(d.title))).toBe(true);
  });
});
