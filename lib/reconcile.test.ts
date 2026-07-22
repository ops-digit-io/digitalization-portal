import { describe, expect, it } from "vitest";
import { rowChanged, serializeRegistryIndex } from "./reconcile.js";
import { parseRegistryIndex, type RegistryRow } from "./registry.js";

const rows: RegistryRow[] = [
  {
    id: "UC-2026-0041",
    title: "Scrap attribution",
    stage: "S4",
    lane: "transform",
    status: "active",
    plant: "DE-ALD",
    domain: "quality",
    level: "L2",
    heat: "medium",
    sponsor: "s@example.com",
    valueProjected: 180000,
    since: "2026-04-02",
  },
  {
    id: "UC-2026-0033",
    title: "Cause code harmonization",
    stage: "S8",
    lane: "transform",
    status: "active",
    plant: "DE-ALD",
    domain: "quality",
    level: "L2",
    heat: "low",
    sponsor: "s3@example.com",
    valueProjected: 60000,
    valueRealized: 71000,
    since: "2026-01-30",
  },
];

describe("serialize → parse round-trip", () => {
  it("survives a round-trip with all typed fields intact", () => {
    const md = serializeRegistryIndex(rows, "2026-07-22T09:14:00Z");
    const back = parseRegistryIndex(md);
    expect(back).toHaveLength(2);
    const uc = back.find((r) => r.id === "UC-2026-0041")!;
    expect(uc.stage).toBe("S4");
    expect(uc.valueProjected).toBe(180000);
    expect(uc.valueRealized).toBeUndefined();
    const uc2 = back.find((r) => r.id === "UC-2026-0033")!;
    expect(uc2.valueRealized).toBe(71000);
  });

  it("renders the empty-state note for zero rows", () => {
    const md = serializeRegistryIndex([], "2026-07-22T09:14:00Z");
    expect(md).toContain("No use cases yet");
    expect(parseRegistryIndex(md)).toHaveLength(0);
  });
});

describe("rowChanged", () => {
  it("detects new and changed rows, ignores identical ones", () => {
    expect(rowChanged(undefined, rows[0]!)).toBe(true);
    expect(rowChanged(rows[0], rows[0]!)).toBe(false);
    expect(rowChanged(rows[0], { ...rows[0]!, stage: "S5" })).toBe(true);
  });
});
