import { describe, expect, it } from "vitest";
import { analyzeFunnel } from "./funnel.js";
import type { RegistryRow } from "../registry.js";

const rows: RegistryRow[] = [
  { id: "A", title: "", stage: "S1", status: "active", lane: "transform", since: "2026-05-01" },
  { id: "B", title: "", stage: "S3", status: "active", lane: "data_ai", since: "2026-04-01" },
  { id: "C", title: "", stage: "S4", status: "active", lane: "transform", since: "2026-03-01" },
  { id: "D", title: "", stage: "S3", status: "killed", lane: "data_ai", since: "2026-04-10" },
  { id: "E", title: "", stage: "S2", status: "parked", lane: "innovation", since: "2026-05-05" },
  { id: "F", title: "", stage: "S8", status: "active", lane: "transform", since: "2026-01-01" },
  { id: "G", title: "", status: "active", lane: "transform", since: "2026-05-01" }, // no stage → needs attention
];

describe("analyzeFunnel", () => {
  const f = analyzeFunnel(rows);

  it("narrows monotonically (entered never increases down the funnel)", () => {
    for (let i = 1; i < f.stages.length; i++) {
      expect(f.stages[i]!.entered).toBeLessThanOrEqual(f.stages[i - 1]!.entered);
    }
  });

  it("counts reaching each stage (S1 = all staged rows)", () => {
    expect(f.stages[0]!.entered).toBe(6); // 6 have a stage; G has none
    expect(f.stages.find((s) => s.stage === "S4")!.entered).toBe(2); // C (S4) + F (S8)
    expect(f.stages.find((s) => s.stage === "S8")!.entered).toBe(1); // F
  });

  it("buckets killed and parked at the stage they stopped", () => {
    expect(f.stages.find((s) => s.stage === "S3")!.killed).toBe(1); // D
    expect(f.stages.find((s) => s.stage === "S2")!.parked).toBe(1); // E
    expect(f.killedTotal).toBe(1);
    expect(f.parkedTotal).toBe(1);
  });

  it("computes kill rate by gate and flags a zero G4 kill rate", () => {
    const g4 = f.gateKills.find((g) => g.gate === "G4")!;
    expect(g4.killed).toBe(0);
    expect(g4.rate).toBe(0);
    expect(f.g4KillRate).toBe(0);
    expect(f.flags.some((x) => /G4/.test(x))).toBe(true);
  });

  it("flags unreadable use cases and excludes them", () => {
    expect(f.needsAttention).toBe(1); // G
    expect(f.flags.some((x) => /could not be read/.test(x))).toBe(true);
  });

  it("summarises lane balance", () => {
    expect(f.laneBalance[0]!.lane).toBe("transform"); // most common
  });
});
