/**
 * The landscape summary: the light follows §6.2 (a failed knock-out dominates),
 * and phase progress is read off meta (artefacts + gate verdicts) with no I/O.
 */

import { describe, it, expect } from "vitest";
import { summarize } from "./summary";
import { artefactsOf } from "./artefacts";
import type { EngagementMeta, Ratings } from "./store";
import { CRITERIA, type Level } from "./criteria";

const meta = (over: Partial<EngagementMeta> = {}): EngagementMeta => ({
  slug: "x", title: "X", owner: "", champion: "", unit: "", anflug: "process",
  components: [], phase: "P0", gates: {}, createdAt: "", updatedAt: "", ...over,
});

/** Every non-per-component criterion at `level`, with overrides by id. */
const ratingsAt = (level: Level, over: Record<string, Level> = {}): Ratings => ({
  criteria: Object.fromEntries(
    CRITERIA.filter((c) => !c.perComponent).map((c) => [c.id, { level: over[c.id] ?? level }]),
  ),
  components: {},
});

describe("engagement summary", () => {
  it("an untouched engagement is grau, and names no knock-out as failed", () => {
    const s = summarize(meta(), { criteria: {}, components: {} });
    expect(s.status).toBe("grau");
    expect(s.ratedCount).toBe(0);
    expect(s.coverage).toBe(0);
    // Unrated knock-outs stand at level 1 (§1.3) but are not evidenced failures.
    expect(s.koFailed).toEqual([]);
  });

  it("a failed knock-out dominates the light and is named", () => {
    const s = summarize(meta(), ratingsAt(5, { "K8.1": 1 }));
    expect(s.status).toBe("rot");
    expect(s.koFailed).toContain("K8.1");
  });

  it("reports one progress entry per phase, counting only filled artefacts", () => {
    const p1 = artefactsOf("P1");
    const s = summarize(meta({ filledArtefacts: [p1[0]!.id] }), { criteria: {}, components: {} });
    expect(s.phases).toHaveLength(6);
    expect(s.phases.map((p) => p.n)).toEqual([0, 1, 2, 3, 4, 5]);
    const one = s.phases.find((p) => p.id === "P1")!;
    expect(one.done).toBe(1);
    expect(one.total).toBe(p1.length);
  });

  it("carries the recorded gate verdict per phase", () => {
    const s = summarize(
      meta({ gates: { T0: { passed: true, reason: "", at: "" }, T2: { passed: false, reason: "thin", at: "" } } }),
      { criteria: {}, components: {} },
    );
    expect(s.phases.find((p) => p.id === "P0")?.gate).toBe("pass");
    expect(s.phases.find((p) => p.id === "P2")?.gate).toBe("fail");
    expect(s.phases.find((p) => p.id === "P1")?.gate).toBeNull();
  });
});
