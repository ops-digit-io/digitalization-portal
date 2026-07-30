/**
 * The Kurzform intake pre-filter (Katalog §7.3): the spoke gate blocks, an
 * optimisation knock-out routes to the enabler, a strong-and-clear picture goes to
 * self-help, everything else is admitted. Triage is language-neutral (codes only).
 */

import { describe, it, expect } from "vitest";
import { triage } from "./self-assessment";
import { SELF_ASSESSMENT, type Level } from "./criteria";

const all = (lvl: Level, over: Record<string, Level> = {}) =>
  Object.fromEntries(SELF_ASSESSMENT.map((id) => [id, over[id] ?? lvl])) as Record<string, Level>;

describe("self-assessment triage", () => {
  it("no spoke (K8.1=S1) → zurückstellen", () => {
    expect(triage(all(4, { "K8.1": 1 })).recommendation).toBe("zurueckstellen");
  });

  it("timestamp knock-out (K5.1=S1) with a spoke → enabler, flags K5.1", () => {
    const t = triage(all(4, { "K5.1": 1 }));
    expect(t.recommendation).toBe("enabler");
    expect(t.enablerWhich).toContain("K5.1");
  });

  it("interface knock-out (K2.2=S1) → enabler, flags K2.2", () => {
    const t = triage(all(4, { "K2.2": 1 }));
    expect(t.recommendation).toBe("enabler");
    expect(t.enablerWhich).toContain("K2.2");
  });

  it("strong, measurable, documented, clear goal → selbsthilfe", () => {
    expect(triage(all(4)).recommendation).toBe("selbsthilfe");
  });

  it("plausible spoke, no S1 knock-out, but not uniformly strong → aufnehmen", () => {
    expect(triage(all(3)).recommendation).toBe("aufnehmen");
  });

  it("surfaces a non-blocking warning code when the goal statement is missing", () => {
    const t = triage(all(3, { "K4.1": 1 }));
    expect(t.warnings).toContain("no-goal");
  });
});
