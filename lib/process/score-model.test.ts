import { describe, it, expect } from "vitest";
import {
  scoreProfile,
  trafficLight,
  priority,
  classFromFactors,
  DIMENSIONS,
  KNOCK_OUTS,
  THRESHOLDS,
  COST_FACTOR,
  CONFIDENCE_DISCOUNT,
  type Light,
  type ScoreProfileResult,
  type SectionScoreInput,
  type GateVerdictInput,
  type PriorityInputs,
  type RankedPriorityResult,
  type BlockedPriorityResult,
} from "./score-model";

/** Every section key the model reads, in dimension order — 14 of them. */
const ALL_SECTIONS: string[] = (() => {
  const out: string[] = [];
  for (const d of DIMENSIONS) for (const k of Object.keys(d.sections)) if (!out.includes(k)) out.push(k);
  return out;
})();

const flat = (v: number): Record<string, SectionScoreInput> =>
  Object.fromEntries(ALL_SECTIONS.map((k) => [k, v]));

/** All three knock-outs cleared by a recorded verdict. */
const GOOD_GATES: Record<string, GateVerdictInput> = {
  profile: true,
  diagnostics: true,
  "interface-access": true,
};

/** The only colours the model is allowed to produce. */
const COLOURS: readonly Light[] = ["red", "amber", "green", "grey"];

describe("constants", () => {
  it("keeps the source's weights: five dimensions summing to 100, each summing to 100 internally", () => {
    expect(DIMENSIONS.map((d) => d.key)).toEqual(["visibility", "shippability", "carry", "health", "value"]);
    expect(DIMENSIONS.reduce((a, d) => a + d.weight, 0)).toBe(100);
    for (const d of DIMENSIONS) {
      expect(Object.values(d.sections).reduce((a, b) => a + b, 0)).toBe(100);
    }
    expect(DIMENSIONS.map((d) => d.weight)).toEqual([30, 25, 20, 15, 10]);
    expect(ALL_SECTIONS).toHaveLength(14);
  });

  it("keeps the source's thresholds and factors verbatim", () => {
    expect(THRESHOLDS).toEqual({
      dimensionAssessed: 0.5,
      greenDimensionFloor: 60,
      redDimensionFloor: 40,
      redVisibilityFloor: 30,
      greenCoverage: 0.8,
      greyCoverage: 0.25,
      koEvidenceFloor: 40,
    });
    expect(COST_FACTOR).toEqual({ "CC-A": 1, "CC-B": 2, "CC-C": 4, "CC-D": 8 });
    expect(CONFIDENCE_DISCOUNT).toEqual({ I: 1.0, P: 0.8, S: 0.5 });
    expect(KNOCK_OUTS.map((k) => k.key)).toEqual(["spoke", "timestamps", "interface-access"]);
  });
});

describe("scoreProfile — nothing assessed", () => {
  it("returns a well-formed profile in which everything is not assessed, and does not throw", () => {
    const p = scoreProfile();

    expect(p.overall).toBeNull();
    expect(p.coverage).toBe(0);
    expect(p.sectionsTotal).toBe(14);
    expect(p.sectionsAssessed).toBe(0);
    expect(p.notAssessed).toHaveLength(14);
    expect(p.unknownSections).toEqual([]);
    expect(p.gateFailures).toEqual([]);

    // "not assessed" is not zero: no dimension carries a score at all.
    for (const d of Object.values(p.dimensions)) {
      expect(d.score).toBeNull();
      expect(d.assessed).toBe(false);
      expect(d.coverage).toBe(0);
      expect(d.missing.sort()).toEqual(Object.keys(d.sections).sort());
      for (const v of Object.values(d.sections)) expect(v).toBeNull();
    }

    // No verdict on record is "unknown" — never a fail.
    expect(p.knockOuts.map((k) => k.state)).toEqual(["unknown", "unknown", "unknown"]);
    for (const key of Object.keys(p.gateVerdicts)) expect(p.gateVerdicts[key]).toBeNull();

    expect(trafficLight(p).light).toBe("grey");
  });
});

describe("junk input never throws and is read as not-assessed", () => {
  it("survives strings, numbers, null, arrays and NaN in every position", () => {
    expect(() => {
      scoreProfile(null, null);
      scoreProfile("nonsense" as unknown as Record<string, SectionScoreInput>, 42 as unknown as Record<string, GateVerdictInput>);
      scoreProfile([1, 2, 3] as unknown as Record<string, SectionScoreInput>, [] as unknown as Record<string, GateVerdictInput>);
      trafficLight(null);
      trafficLight(undefined);
      trafficLight({} as unknown as ScoreProfileResult);
      trafficLight({ dimensions: { junk: null }, knockOuts: "nope" } as unknown as ScoreProfileResult);
      priority(null);
      priority({ addressableValuePerYear: "lots", daysToShip: null, confidence: "X" } as unknown as PriorityInputs);
      classFromFactors(null);
      classFromFactors("nope" as unknown as null);
    }).not.toThrow();
  });

  it("treats unreadable section values as not assessed rather than as zero", () => {
    const p = scoreProfile({
      profile: "abc" as unknown as number,
      kpi: NaN,
      literacy: [] as unknown as number,
      knowledge: {} as unknown as { score: number },
    });
    expect(p.dimensions.carry.sections.profile).toBeNull();
    expect(p.dimensions.carry.sections.literacy).toBeNull();
    expect(p.dimensions.carry.sections.knowledge).toBeNull();
    expect(p.dimensions.visibility.sections.kpi).toBeNull();
    expect(p.dimensions.carry.score).toBeNull();
    expect(p.notAssessed).toContain("profile");
    expect(p.notAssessed).toContain("kpi");
    expect(trafficLight(p).light).toBe("grey");
  });

  it("clamps out-of-range values and reads a grader result object", () => {
    const p = scoreProfile({ mapping: -50, flow: 9999, diagnostics: { score: 77 } });
    expect(p.dimensions.health.sections.mapping).toBe(0);
    expect(p.dimensions.health.sections.flow).toBe(100);
    expect(p.dimensions.visibility.sections.diagnostics).toBe(77);
  });

  it("returns a well-formed grey light for a profile that could not be computed", () => {
    const t = trafficLight(null);
    expect(t.light).toBe("grey");
    expect(typeof t.reason).toBe("string");
    expect(t.detail).toEqual({});
    expect(t.drivers).toEqual([]);
  });
});

describe("rule 1 — a knock-out dominates the colour instead of being averaged in", () => {
  it("turns the light red on a file where every single section scores 95", () => {
    const p = scoreProfile(flat(95), { ...GOOD_GATES, profile: false });
    const t = trafficLight(p);

    // The profile itself is excellent — the colour still is not.
    expect(p.overall).toBe(95);
    for (const d of Object.values(p.dimensions)) expect(d.score).toBe(95);

    expect(t.light).toBe("red");
    expect(t.knockOutDriven).toBe(true);
    expect(t.reason.toLowerCase()).toContain("spoke");
  });

  it("does the same for each of the three knock-outs", () => {
    for (const key of ["profile", "diagnostics", "interface-access"] as const) {
      const t = trafficLight(scoreProfile(flat(95), { ...GOOD_GATES, [key]: false }));
      expect(t.light).toBe("red");
      expect(t.knockOutDriven).toBe(true);
    }
  });

  it("is red at intake, before coverage has anything to say", () => {
    // A spoke gate failed on an almost empty file: red, not grey. We know the
    // decisive thing and we know it is a no.
    const p = scoreProfile({ profile: 30 }, { profile: false });
    expect(p.coverage).toBeLessThan(THRESHOLDS.greyCoverage);
    expect(trafficLight(p).light).toBe("red");
  });

  it("does not fire on an unknown verdict — an open knock-out blocks green but is never red", () => {
    const t = trafficLight(scoreProfile(flat(90), {}));
    expect(t.light).toBe("amber");
    expect(t.reason.toLowerCase()).toContain("knock-out");
  });
});

describe("rule 2 — bad news counts on partial evidence, good news does not", () => {
  // Both directions use the SAME shape of file: everything assessed except kpi and
  // mapping, so visibility rests on diagnostics alone — 45 of its 100 internal
  // weight, below the half-evidence threshold. Only the diagnostics score differs.
  const partialVisibility = (diagnostics: number): Record<string, SectionScoreInput> => {
    const s = flat(95);
    delete s["kpi"];
    delete s["mapping"];
    s["diagnostics"] = diagnostics;
    return s;
  };

  it("lets a partially evidenced dimension turn the light red", () => {
    const p = scoreProfile(partialVisibility(20), GOOD_GATES);
    const vis = p.dimensions.visibility;

    expect(vis.assessed).toBe(false); // partial: 45 % of the evidence
    expect(vis.coverage).toBeLessThan(THRESHOLDS.dimensionAssessed);
    expect(vis.score).toBe(20);

    const t = trafficLight(p);
    expect(t.light).toBe("red");
    expect(t.knockOutDriven).toBe(false);
    expect(t.reason.toLowerCase()).toContain("visibility");
  });

  it("does not let the same partial evidence make the light green", () => {
    const p = scoreProfile(partialVisibility(95), GOOD_GATES);
    const vis = p.dimensions.visibility;

    expect(vis.assessed).toBe(false); // the same thin evidence as above
    expect(vis.score).toBe(95); // ... now reading as well as it possibly could
    // Coverage is not what stops it: the model is 80 %+ backed by artefacts.
    expect(p.coverage).toBeGreaterThanOrEqual(THRESHOLDS.greenCoverage);

    const t = trafficLight(p);
    expect(t.light).not.toBe("green");
    expect(t.light).toBe("amber");
    expect(t.reason.toLowerCase()).toContain("not sufficiently assessed");
  });

  it("goes green only once the same file is fully evidenced", () => {
    const t = trafficLight(scoreProfile(flat(95), GOOD_GATES));
    expect(t.light).toBe("green");
  });

  it("keeps one weak dimension amber and two red — one is a finding, two are a pattern", () => {
    const one = trafficLight(scoreProfile({ ...flat(85), "business-case": 10, purpose: 20 }, GOOD_GATES));
    expect(one.light).toBe("amber");

    const two = trafficLight(
      scoreProfile(
        {
          ...flat(85),
          diagnostics: 35,
          kpi: 35,
          mapping: 35,
          increment: 20,
          diagnosis: 20,
          iteration: 20,
          "cost-of-change": 20,
          toolchain: 20,
        },
        GOOD_GATES,
      ),
    );
    expect(two.light).toBe("red");
    expect(two.knockOutDriven).toBe(false);
  });

  it("blocks green on a non-fatal gate failure without turning the light red", () => {
    const p = scoreProfile(flat(90), { ...GOOD_GATES, increment: false });
    expect(p.gateFailures).toContain("increment");
    const t = trafficLight(p);
    expect(t.light).toBe("amber");
    expect(t.reason).toContain("increment");
  });
});

describe("trafficLight — the colour vocabulary", () => {
  it("only ever returns red, amber, green or grey, and can produce each of them", () => {
    const cases = [
      trafficLight(scoreProfile()), // grey
      trafficLight(null), // grey
      trafficLight(scoreProfile({ profile: 30 }, { profile: false })), // red, knock-out
      trafficLight(scoreProfile({ ...flat(85), diagnostics: 10, kpi: 10, mapping: 10 }, GOOD_GATES)), // red, visibility
      trafficLight(scoreProfile(flat(90), {})), // amber
      trafficLight(scoreProfile(flat(95), GOOD_GATES)), // green
      trafficLight(scoreProfile(flat(0), GOOD_GATES)), // red, dimensions
      trafficLight(scoreProfile({ profile: 55, purpose: 55 }, {})), // grey, thin
    ];

    for (const c of cases) expect(COLOURS).toContain(c.light);
    expect(new Set(cases.map((c) => c.light))).toEqual(new Set(["red", "amber", "green", "grey"]));
  });

  it("always answers with a reason, a detail block and a driver list", () => {
    for (const t of [trafficLight(scoreProfile()), trafficLight(scoreProfile(flat(95), GOOD_GATES))]) {
      expect(typeof t.reason).toBe("string");
      expect(t.reason.length).toBeGreaterThan(0);
      expect(Array.isArray(t.drivers)).toBe(true);
      expect(typeof t.detail).toBe("object");
    }
  });
});

describe("classFromFactors", () => {
  it("applies the ordered class rule and refuses to guess an incomplete factor set", () => {
    expect(classFromFactors({ risk: 4, effort: 4, friction: 1, durability: 1 }).class).toBe("CC-D");
    expect(classFromFactors({ risk: 1, effort: 3, friction: 3, durability: 1 }).class).toBe("CC-C");
    expect(classFromFactors({ risk: 1, effort: 3, friction: 1, durability: 1 }).class).toBe("CC-B");
    expect(classFromFactors({ risk: 1, effort: 1, friction: 1, durability: 2 }).class).toBe("CC-A");

    const incomplete = classFromFactors({ risk: 2 });
    expect(incomplete.class).toBeNull();
    expect(incomplete.missing).toBe(3);
  });
});

describe("priority", () => {
  // The counterexample the model exists to produce (docs/score-model.md §10):
  // a mediocre process you can cut every two weeks against a healthy one you cannot touch.
  const healthyFrozen = priority({
    addressableValuePerYear: 120000,
    reachShare: 1,
    confidence: "P",
    compoundingProcesses: 0,
    daysToShip: 180,
    daysToReadResult: 90,
    effortCycles: 6,
    costOfChangeClass: "CC-C",
  });
  const mediocreShippable = priority({
    addressableValuePerYear: 40000,
    reachShare: 0.6,
    confidence: "P",
    compoundingProcesses: 2,
    daysToShip: 14,
    daysToReadResult: 14,
    effortCycles: 1,
    costOfChangeClass: "CC-A",
  });

  it("ranks the fast, cheap, smaller process above the slow, expensive, larger one", () => {
    expect(healthyFrozen.blocked).toBe(false);
    expect(mediocreShippable.blocked).toBe(false);
    const a = healthyFrozen.score;
    const b = mediocreShippable.score;
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    // The ordering is the assertion; the gap is an order of magnitude, not a rounding.
    expect(b as number).toBeGreaterThan(a as number);
    expect((b as number) / (a as number)).toBeGreaterThan(50);
  });

  it("returns the terms the number was built from, so it can be argued with", () => {
    const t = (healthyFrozen as RankedPriorityResult).terms;
    expect(t.valueRate).toBe(96000); // 120000 × 1.0 × 0.8 × 1.0
    expect(t.cycleDays).toBe(270);
    expect(t.costFactor).toBe(4);
    expect(t.effortCycles).toBe(6);
    expect(t.cost).toBe(24);
    expect(healthyFrozen.track).toBe("optimisation");
  });

  it("refuses a score on the enabler track when a knock-out has failed", () => {
    const blocked = priority({
      addressableValuePerYear: 500000,
      daysToShip: 5,
      knockOutFailed: true,
      compoundingProcesses: 3,
      costOfChangeClass: "CC-A",
    });
    expect(blocked.score).toBeNull();
    expect(blocked.blocked).toBe(true);
    expect(blocked.track).toBe("enabler");
    expect((blocked as BlockedPriorityResult).enablerPriority).toBeGreaterThan(0);
  });

  it("reads a failed knock-out straight off a profile", () => {
    const p = scoreProfile(flat(95), { ...GOOD_GATES, "interface-access": false });
    const blocked = priority({ addressableValuePerYear: 100000, daysToShip: 10, profile: p });
    expect(blocked.track).toBe("enabler");
    expect(blocked.score).toBeNull();
  });

  it("refuses a score on the re-cut track for CC-D", () => {
    const blocked = priority({ addressableValuePerYear: 500000, daysToShip: 5, costOfChangeClass: "CC-D" });
    expect(blocked.score).toBeNull();
    expect(blocked.track).toBe("re-cut");
  });

  it("prices what removing the named main barrier would be worth", () => {
    const withBarrier = priority({
      addressableValuePerYear: 90000,
      confidence: "P",
      daysToShip: 30,
      daysToReadResult: 30,
      effortCycles: 2,
      costOfChangeClass: "CC-C",
      barrierRemovedClass: "CC-B",
      barrierRemovalCycles: 1,
    }) as RankedPriorityResult;
    expect(withBarrier.barrierRemoval).toBeDefined();
    expect(withBarrier.barrierRemoval?.classAfter).toBe("CC-B");
    expect(withBarrier.barrierRemoval?.gain).toBeGreaterThan(0);
    expect(withBarrier.barrierRemoval?.score).toBeGreaterThan(withBarrier.score);
  });

  it("warns instead of silently absorbing a missing class, a missing ship date and a self-reported value", () => {
    const p = priority({});
    expect(p.warnings.join(" ")).toContain("CC-B");
    expect(p.warnings.join(" ")).toContain("Addressable value is zero");
    expect((p as RankedPriorityResult).classSource).toBe("defaulted");
  });
});
