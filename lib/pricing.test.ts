import { describe, it, expect } from "vitest";
import { rateFor, estimateCost, isPriced } from "./pricing.js";

describe("rateFor", () => {
  it("matches a known model exactly", () => {
    expect(rateFor("claude-opus-5")).toEqual({ input: 5, output: 25 });
  });

  it("prefix-matches a dated/suffixed variant to its family", () => {
    expect(rateFor("claude-opus-5-20260101")).toEqual({ input: 5, output: 25 });
  });

  it("is undefined for an unknown model and for no model", () => {
    expect(rateFor("some-local-llama")).toBeUndefined();
    expect(rateFor(undefined)).toBeUndefined();
  });
});

describe("estimateCost", () => {
  it("prices input and output per million", () => {
    // 1M input @ $5 + 1M output @ $25 = $30.
    expect(estimateCost("claude-opus-5", { input: 1_000_000, output: 1_000_000 })).toBeCloseTo(30, 6);
  });

  it("prices cache reads at a tenth of input and writes at a 1.25x premium", () => {
    // 1M cache read @ (5 * 0.1) = $0.50; 1M cache write @ (5 * 1.25) = $6.25.
    expect(estimateCost("claude-opus-5", { input: 0, output: 0, cacheRead: 1_000_000 })).toBeCloseTo(0.5, 6);
    expect(estimateCost("claude-opus-5", { input: 0, output: 0, cacheWrite: 1_000_000 })).toBeCloseTo(6.25, 6);
  });

  it("returns null for an unpriced model — never a guess", () => {
    expect(estimateCost("mystery-model", { input: 1_000_000, output: 1_000_000 })).toBeNull();
    expect(isPriced("mystery-model")).toBe(false);
    expect(isPriced("claude-opus-5")).toBe(true);
  });
});
