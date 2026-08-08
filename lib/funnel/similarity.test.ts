import { describe, it, expect } from "vitest";
import { normalizeTokens, jaccard, findDuplicatePairs } from "./similarity.js";
import type { RegistryRow } from "../registry.js";

describe("normalizeTokens", () => {
  it("lowercases, drops stopwords and short tokens", () => {
    expect([...normalizeTokens("The scrap attribution at a line")]).toEqual(["scrap", "attribution", "line"]);
  });
});

describe("jaccard", () => {
  it("is 1 for identical sets and 0 for disjoint", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
    expect(jaccard(new Set(["a"]), new Set(["b"]))).toBe(0);
    expect(jaccard(new Set(), new Set(["a"]))).toBe(0);
  });
});

describe("findDuplicatePairs", () => {
  const rows: RegistryRow[] = [
    { id: "UC-1", title: "Scrap attribution at shift granularity" },
    { id: "UC-2", title: "Shift-level scrap attribution reporting" },
    { id: "UC-3", title: "Tender preparation copilot" },
    { id: "UC-4", title: "Energy baseline per line" },
  ];

  it("flags the near-duplicate pair above threshold, most similar first", () => {
    const pairs = findDuplicatePairs(rows, 0.3);
    expect(pairs.length).toBeGreaterThanOrEqual(1);
    const top = pairs[0]!;
    expect(new Set([top.a.id, top.b.id])).toEqual(new Set(["UC-1", "UC-2"]));
    expect(top.score).toBeGreaterThan(0.3);
  });

  it("returns nothing when all demands are distinct", () => {
    expect(findDuplicatePairs([rows[2]!, rows[3]!], 0.4)).toEqual([]);
  });

  it("respects the limit", () => {
    expect(findDuplicatePairs(rows, 0, 2)).toHaveLength(2);
  });
});
