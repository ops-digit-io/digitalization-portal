/**
 * The deterministic demand proposer (the offline agent path). Pins the ordering
 * rule from the Ablauf: no spoke → only the spoke demand; an optimisation knock-out
 * at level 1/2 → an enabler (measurability / interface access) before optimisation.
 * It also has to stay quiet when nothing has been assessed, and follow the locale.
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
  it("no spoke (K8.1 = level 1): the only demand is to staff the spoke", () => {
    const demands = deterministicDemands(profile({ "K8.1": 1 }));
    expect(demands.length).toBe(1);
    expect(demands[0]!.title).toMatch(/spoke/i);
    expect(demands[0]!.lane).toBe("transform");
    expect(demands[0]!.basis).toBe("Knock-out K8.1");
  });

  it("timestamp knock-out weak (K5.1 = level 2): proposes the measurability enabler", () => {
    const demands = deterministicDemands(profile({ "K5.1": 2 }));
    expect(demands.some((d) => /measurable|timestamp/i.test(d.title) && d.lane === "data_ai")).toBe(true);
  });

  it("interface knock-out weak (K2.2 = level 2): proposes the interface-access enabler", () => {
    const demands = deterministicDemands(profile({ "K2.2": 2 }));
    expect(demands.some((d) => /interface/i.test(d.title))).toBe(true);
  });

  it("a failed optimisation knock-out is the ONLY intervention proposed (§5)", () => {
    // K2.2 at level 1 → measurability/access first; no improvement demands on top,
    // because optimisation statements over a failed knock-out are worthless (§6.2).
    const demands = deterministicDemands(profile({ "K2.2": 1, "K1.1": 1, "K6.1": 1 }));
    expect(demands.some((d) => /interface/i.test(d.title))).toBe(true);
    expect(demands.every((d) => !/^Improve /.test(d.title))).toBe(true);
  });

  it("a merely weak (level 2) knock-out still allows improvement demands alongside", () => {
    // Level 2 is "open", not a failed knock-out — so a genuinely weak dimension
    // (all of D1 at level 1) still earns its own demand.
    const demands = deterministicDemands(profile({ "K5.1": 2, "K1.1": 1, "K1.2": 1, "K1.3": 1 }));
    expect(demands.some((d) => /measurable|timestamp/i.test(d.title))).toBe(true);
    expect(demands.some((d) => /^Improve /.test(d.title))).toBe(true);
  });

  it("a healthy profile yields no forced enabler demands", () => {
    const demands = deterministicDemands(profile());
    expect(demands.every((d) => !/spoke|measurable|interface/i.test(d.title))).toBe(true);
  });

  it("nothing assessed → nothing proposed (§1.3 would otherwise invent findings)", () => {
    const empty = healthProfile({ ratings: {} });
    expect(empty.ratedCount).toBe(0);
    expect(deterministicDemands(empty)).toEqual([]);
  });

  it("follows the locale — German when asked, English by default", () => {
    const de = deterministicDemands(profile({ "K8.1": 1 }), "de");
    expect(de[0]!.title).toMatch(/Spoke-Minimum/);
    const en = deterministicDemands(profile({ "K8.1": 1 }));
    expect(en[0]!.title).toMatch(/Appoint the spoke/);
    // The basis stays language-neutral so it reads the same in either language.
    expect(de[0]!.basis).toBe(en[0]!.basis);
  });
});
