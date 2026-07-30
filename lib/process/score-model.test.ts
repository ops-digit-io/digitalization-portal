/**
 * The 17 self-tests from PDT's `scoreModel.js`, ported to vitest unchanged in
 * intent. They pin the methodology: knock-outs dominate, partial evidence can turn
 * a light red but never green, malformed input never throws, and a mediocre process
 * you can cut every two weeks outranks a healthy one you cannot touch.
 */

import { describe, it, expect } from "vitest";
import {
  scoreProfile,
  trafficLight,
  priority,
  classFromFactors,
  DIMENSIONS,
  GATE_SECTIONS,
  knownSections,
} from "./score-model";
import { SECTIONS } from "./sections";

const ALL = knownSections();
const flat = (v: number) => Object.fromEntries(ALL.map((k) => [k, v]));

describe("score model", () => {
  it("1  dimension weights sum to 100 and every dimension sums to 100 internally", () => {
    const dimSum = DIMENSIONS.reduce((a, d) => a + d.weight, 0);
    const innerOk = DIMENSIONS.every((d) => Object.values(d.sections).reduce((a, b) => a + b, 0) === 100);
    expect(dimSum).toBe(100);
    expect(innerOk).toBe(true);
  });

  it("2  an empty engagement is grey and reports all 14 sections as not assessed", () => {
    const empty = scoreProfile(undefined, undefined);
    const emptyLight = trafficLight(empty);
    expect(emptyLight.light).toBe("grey");
    expect(empty.notAssessed.length).toBe(14);
    expect(empty.overall).toBeNull();
  });

  it("3  a fully assessed process with all knock-outs cleared is green", () => {
    const goodGates = { profile: true, diagnostics: true, "interface-access": true };
    const green = trafficLight(scoreProfile(flat(85), goodGates));
    expect(green.light).toBe("green");
  });

  it("4  a failed spoke knock-out is red although every section scores 95", () => {
    const noSpoke = scoreProfile(flat(95), { profile: false, diagnostics: true, "interface-access": true });
    const light = trafficLight(noSpoke);
    expect(light.light).toBe("red");
    expect(light.knockOutDriven).toBe(true);
    expect(/spoke/i.test(light.reason)).toBe(true);
    expect(noSpoke.overall).toBe(95);
  });

  it("5  a failed timestamp knock-out is red and names the consequence", () => {
    const noStamps = trafficLight(scoreProfile(flat(95), { profile: true, diagnostics: false, "interface-access": true }));
    expect(noStamps.light).toBe("red");
    expect(/measurable/i.test(noStamps.reason)).toBe(true);
  });

  it("6  an interface-access knock-out set by flag is red even though toolchain is not a gate section", () => {
    const noIface = trafficLight(scoreProfile(flat(95), { profile: true, diagnostics: true, "interface-access": false }));
    expect(noIface.light).toBe("red");
    expect(/interface/i.test(noIface.reason)).toBe(true);
  });

  it("7  a knock-out failed at intake is red on an almost empty file, not grey", () => {
    const earlyKill = trafficLight(scoreProfile({ profile: 30 }, { profile: false }));
    expect(earlyKill.light).toBe("red");
  });

  it("8  a partial assessment is never green, and the missing sections are listed by name", () => {
    const partial = scoreProfile({ profile: 80, purpose: 75, mapping: 70 }, { profile: true });
    const light = trafficLight(partial);
    expect(light.light).not.toBe("green");
    expect(partial.notAssessed).toContain("diagnostics");
    expect(partial.notAssessed).toContain("business-case");
    expect(partial.dimensions.value.score).toBe(75);
  });

  it("9  one dimension below the red floor is amber — one outlier is a finding, not a pattern", () => {
    const goodGates = { profile: true, diagnostics: true, "interface-access": true };
    const oneWeak = trafficLight(scoreProfile({ ...flat(85), "business-case": 10, purpose: 20 }, goodGates));
    expect(oneWeak.light).toBe("amber");
    expect(oneWeak.detail["Addressable value"]).toBe("35");
  });

  it("9b two dimensions below the red floor are red without any gate failing", () => {
    const goodGates = { profile: true, diagnostics: true, "interface-access": true };
    const twoWeak = trafficLight(
      scoreProfile(
        { ...flat(85), diagnostics: 35, kpi: 35, mapping: 35, increment: 20, diagnosis: 20, iteration: 20, "cost-of-change": 20, toolchain: 20 },
        goodGates,
      ),
    );
    expect(twoWeak.light).toBe("red");
    expect(twoWeak.knockOutDriven).toBe(false);
  });

  it("10 a mediocre process you can cut every two weeks outranks a healthy one you cannot touch", () => {
    const healthyFrozen = priority({
      addressableValuePerYear: 120000, reachShare: 1, confidence: "P", compoundingProcesses: 0,
      daysToShip: 180, daysToReadResult: 90, effortCycles: 6, costOfChangeClass: "CC-C",
    });
    const mediocreShippable = priority({
      addressableValuePerYear: 40000, reachShare: 0.6, confidence: "P", compoundingProcesses: 2,
      daysToShip: 14, daysToReadResult: 14, effortCycles: 1, costOfChangeClass: "CC-A",
    });
    expect(mediocreShippable.score).toBeGreaterThan(healthyFrozen.score);
  });

  it("11 a failed knock-out and a CC-D both refuse a score and say which track they belong to", () => {
    const blockedKO = priority({ addressableValuePerYear: 500000, daysToShip: 5, knockOutFailed: true, compoundingProcesses: 3, costOfChangeClass: "CC-A" });
    const blockedD = priority({ addressableValuePerYear: 500000, daysToShip: 5, costOfChangeClass: "CC-D" });
    expect(blockedKO.score).toBeNull();
    expect(blockedKO.track).toBe("enabler");
    expect(blockedKO.enablerPriority).toBeGreaterThan(0);
    expect(blockedD.score).toBeNull();
    expect(blockedD.track).toBe("re-cut");
  });

  it("12 the class rule matches the coaching prompt, and an incomplete factor set is not guessed", () => {
    expect(classFromFactors({ risk: 4, effort: 4, friction: 1, durability: 1 }).class).toBe("CC-D");
    expect(classFromFactors({ risk: 1, effort: 3, friction: 3, durability: 1 }).class).toBe("CC-C");
    expect(classFromFactors({ risk: 1, effort: 1, friction: 1, durability: 2 }).class).toBe("CC-A");
    expect(classFromFactors({ risk: 2 }).class).toBeNull();
  });

  it("13 malformed input never throws; out-of-range values are clamped and grader objects are read", () => {
    let survived = true;
    try {
      scoreProfile(null, null);
      scoreProfile("nonsense", 42);
      scoreProfile({ profile: "abc", kpi: NaN, mapping: -50, flow: 9999, diagnostics: { score: "77" } }, { profile: "maybe" });
      trafficLight(null);
      trafficLight({});
      priority(null);
      priority({ addressableValuePerYear: "lots", daysToShip: null, confidence: "X" });
    } catch {
      survived = false;
    }
    const coerced = scoreProfile({ mapping: -50, flow: 9999, diagnostics: { score: "77" } }, {});
    expect(survived).toBe(true);
    expect(coerced.dimensions.health.sections.mapping).toBe(0);
    expect(coerced.dimensions.health.sections.flow).toBe(100);
    expect(coerced.dimensions.visibility.sections.diagnostics).toBe(77);
  });

  it("14 a perfect file with no recorded gate verdicts is amber, not green", () => {
    const noVerdicts = trafficLight(scoreProfile(flat(90), {}));
    expect(noVerdicts.light).toBe("amber");
    expect(/knock-out/i.test(noVerdicts.reason)).toBe(true);
  });

  it("15 removing the named main barrier is priced as a gain against the unchanged plan", () => {
    const withBarrier = priority({
      addressableValuePerYear: 90000, confidence: "P", daysToShip: 30, daysToReadResult: 30,
      effortCycles: 2, costOfChangeClass: "CC-C", barrierRemovedClass: "CC-B", barrierRemovalCycles: 1,
    });
    expect(withBarrier.barrierRemoval).toBeTruthy();
    expect(withBarrier.barrierRemoval.gain).toBeGreaterThan(0);
  });

  it("16 a failed increment gate blocks green without turning the light red", () => {
    const goodGates = { profile: true, diagnostics: true, "interface-access": true };
    const incrementFailed = scoreProfile(flat(90), { ...goodGates, increment: false });
    const light = trafficLight(incrementFailed);
    expect(light.light).toBe("amber");
    expect(incrementFailed.gateFailures).toContain("increment");
    expect(/increment/.test(light.reason)).toBe(true);
  });

  it("17 the gate list agrees with sections.ts", () => {
    const live = SECTIONS.filter((s) => s.gate).map((s) => s.key);
    expect(live.length).toBe(GATE_SECTIONS.length);
    expect(live.every((k) => GATE_SECTIONS.includes(k))).toBe(true);
  });
});
