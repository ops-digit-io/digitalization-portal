/**
 * The landscape summary. The light comes from the source tool's score model, so
 * the two rules that make it honest have to survive the wiring: a failed
 * knock-out dominates, and partial evidence can turn the light red but never
 * green. Stage progress is read off meta with no I/O.
 */

import { describe, it, expect } from "vitest";
import { summarize } from "./summary";
import { sectionsOf } from "./sections";
import type { EngagementMeta } from "./store";

const meta = (over: Partial<EngagementMeta> = {}): EngagementMeta => ({
  slug: "x", title: "X", owner: "", champion: "", unit: "", anflug: "process",
  components: [], phase: "discovery", gates: {}, createdAt: "", updatedAt: "", ...over,
});

/** Every section scored at `n`. */
const allScored = (n: number): Record<string, number> =>
  Object.fromEntries(
    ["discovery", "recon", "measurement", "capacity", "decision"]
      .flatMap((g) => sectionsOf(g))
      .map((s) => [s.key, n]),
  );

describe("engagement summary", () => {
  it("an untouched engagement is grey, with nothing assessed", () => {
    const s = summarize(meta());
    expect(s.light).toBe("grey");
    expect(s.sectionsAssessed).toBe(0);
    expect(s.overall).toBeNull();
    expect(s.koFailed).toEqual([]);
  });

  it("a failed gate dominates the light, however well the sections score", () => {
    const s = summarize(meta({
      sectionScores: allScored(95),
      gates: { profile: { passed: false, reason: "no owner", at: "" } },
    }));
    expect(s.light).toBe("red");
    // The spoke knock-out hangs off the `profile` gate, so a failed profile gate
    // reads as a failed knock-out — not as a plain gate failure.
    expect(s.koFailed).toContainEqual({ key: "spoke", label: "Responsible spoke" });
    expect(s.gateFailures).not.toContain("profile");
  });

  it("strong scores alone are not green — the knock-outs must be cleared by a verdict", () => {
    // Good news does not count on partial evidence: without recorded verdicts the
    // three knock-outs stand "unknown", and unknown is not cleared.
    const s = summarize(meta({ sectionScores: allScored(90) }));
    expect(s.light).toBe("amber");
    expect(s.overall).toBeGreaterThan(0);
  });

  it("strong scores WITH the knock-outs cleared do go green", () => {
    const pass = { passed: true, reason: "", at: "" };
    const s = summarize(meta({
      sectionScores: allScored(90),
      gates: { profile: pass, diagnostics: pass, toolchain: pass },
    }));
    expect(s.light).toBe("green");
  });

  it("reports one progress entry per stage, counting only filled sections", () => {
    const recon = sectionsOf("recon");
    const s = summarize(meta({ filledSections: [recon[0]!.key] }));
    expect(s.stages).toHaveLength(5);
    expect(s.stages.map((x) => x.id)).toEqual(["discovery", "recon", "measurement", "capacity", "decision"]);
    const one = s.stages.find((x) => x.id === "recon")!;
    expect(one.done).toBe(1);
    expect(one.total).toBe(recon.length);
  });

  it("carries the gate verdicts per stage — a failure in the stage dominates", () => {
    const s = summarize(meta({ gates: {
      profile: { passed: true, reason: "", at: "" },        // discovery
      purpose: { passed: false, reason: "no goal", at: "" }, // discovery too
      diagnostics: { passed: true, reason: "", at: "" },     // measurement
    } }));
    expect(s.stages.find((x) => x.id === "discovery")?.gate).toBe("fail");
    expect(s.stages.find((x) => x.id === "measurement")?.gate).toBe("pass");
    expect(s.stages.find((x) => x.id === "recon")?.gate).toBeNull();
  });
});
