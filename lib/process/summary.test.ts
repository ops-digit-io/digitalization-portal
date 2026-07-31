/**
 * The landscape summary: the light follows §6.2 (a failed knock-out dominates),
 * and phase progress is read off meta (artefacts + gate verdicts) with no I/O.
 */

import { describe, it, expect } from "vitest";
import { summarize } from "./summary";
import { sectionsOf } from "./sections";
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

  it("reports one progress entry per stage, counting only filled sections", () => {
    const recon = sectionsOf("recon");
    const s = summarize(meta({ filledSections: [recon[0]!.key] }), { criteria: {}, components: {} });
    expect(s.stages).toHaveLength(5);
    expect(s.stages.map((x) => x.id)).toEqual(["discovery", "recon", "measurement", "capacity", "decision"]);
    const one = s.stages.find((x) => x.id === "recon")!;
    expect(one.done).toBe(1);
    expect(one.total).toBe(recon.length);
  });

  it("carries the gate verdicts per stage — a failure in the stage dominates", () => {
    const s = summarize(
      meta({ gates: {
        profile: { passed: true, reason: "", at: "" },        // discovery
        purpose: { passed: false, reason: "no goal", at: "" }, // discovery too
        diagnostics: { passed: true, reason: "", at: "" },     // measurement
      } }),
      { criteria: {}, components: {} },
    );
    expect(s.stages.find((x) => x.id === "discovery")?.gate).toBe("fail");
    expect(s.stages.find((x) => x.id === "measurement")?.gate).toBe("pass");
    expect(s.stages.find((x) => x.id === "recon")?.gate).toBeNull();
  });
});
