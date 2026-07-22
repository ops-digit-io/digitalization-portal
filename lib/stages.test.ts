import { describe, expect, it } from "vitest";
import {
  entryGate,
  exitGate,
  nextStage,
  predecessorGate,
  transitionForGate,
  TRANSITIONS,
} from "./stages.js";
import { confidencePermittedAtStage, valueCategory } from "./value.js";

describe("stage machine transition table", () => {
  it("has seven transitions, S1→S8", () => {
    expect(TRANSITIONS).toHaveLength(7);
    expect(TRANSITIONS[0]?.from).toBe("S1");
    expect(TRANSITIONS[TRANSITIONS.length - 1]?.to).toBe("S8");
  });

  it("materialises business-case.md at G2 and value-tracking.md at G7", () => {
    expect(transitionForGate("G2")?.materializes).toContain("business-case.md");
    expect(transitionForGate("G7")?.materializes).toContain("ops/value-tracking.md");
  });

  it("computes gate/stage neighbours", () => {
    expect(predecessorGate("G4")).toBe("G3");
    expect(predecessorGate("G1")).toBeUndefined();
    expect(entryGate("S4")).toBe("G3");
    expect(exitGate("S4")).toBe("G4");
    expect(nextStage("S1")).toBe("S2");
    expect(nextStage("S8")).toBeUndefined();
  });
});

describe("value model seam", () => {
  it("forbids committed before S5, permits it from S5", () => {
    expect(confidencePermittedAtStage("committed", "S4")).toBe(false);
    expect(confidencePermittedAtStage("committed", "S5")).toBe(true);
  });

  it("risk_compliance carries no euro figure and is not aggregable", () => {
    const rc = valueCategory("risk_compliance");
    expect(rc?.eurAllowed).toBe(false);
    expect(rc?.aggregable).toBe(false);
  });

  it("quality_cost is a normal aggregable euro category", () => {
    const q = valueCategory("Quality cost");
    expect(q?.eurAllowed).toBe(true);
    expect(q?.aggregable).toBe(true);
  });
});
