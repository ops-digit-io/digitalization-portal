import { describe, it, expect } from "vitest";
import { mapPool } from "./pool.js";

describe("mapPool", () => {
  it("preserves input order regardless of completion order", async () => {
    const out = await mapPool([1, 2, 3, 4, 5], 2, async (n) => {
      await new Promise((r) => setTimeout(r, (5 - n) * 2)); // later items finish first
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50]);
  });

  it("never exceeds the concurrency cap", async () => {
    let active = 0;
    let max = 0;
    await mapPool(Array.from({ length: 20 }, (_, i) => i), 4, async () => {
      active++;
      max = Math.max(max, active);
      await new Promise((r) => setTimeout(r, 3));
      active--;
    });
    expect(max).toBeLessThanOrEqual(4);
    expect(max).toBeGreaterThan(1);
  });

  it("handles empty input", async () => {
    expect(await mapPool([], 4, async () => 1)).toEqual([]);
  });
});
