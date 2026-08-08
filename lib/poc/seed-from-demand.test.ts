import { describe, it, expect } from "vitest";
import { seedFromDemandMarkdown } from "./seed-from-demand.js";

const md = `# UC-2026-0041 · Scrap attribution at shift granularity

## State

- **Stage:** S4
- **Lane:** transform
- **Status:** active
- **Plant:** DE-ALD
- **Domain:** quality
- **Created:** 2026-04-02

## Problem

> Original (DE): Wir wissen erst am Monatsende, welche Schicht.

Scrap is booked at month-end aggregate, so the shift can't be identified.

## People

| Role | Person |
|---|---|
| Requester | line.lead@example.com |
| Sponsor | plant.quality@example.com |

## Gates

| Gate | Status | Date | By | Note |
|---|---|---|---|---|
| G1 Intake accepted | passed | 2026-04-18 | x | |
`;

describe("seedFromDemandMarkdown", () => {
  it("derives a UseCaseSeed from real demand markdown", () => {
    const seed = seedFromDemandMarkdown("UC-2026-0041", md)!;
    expect(seed.id).toBe("UC-2026-0041");
    expect(seed.title).toBe("Scrap attribution at shift granularity");
    expect(seed.slug).toBe("scrap-attribution-at-shift");
    expect(seed.plant).toBe("DE-ALD");
    expect(seed.lane).toBe("transform");
    expect(seed.domain).toBe("quality");
    expect(seed.createdOn).toBe("2026-04-02");
    expect(seed.requester).toBe("line.lead@example.com");
    // Problem comes from the section, without the "> Original …" quote line.
    expect(seed.problem).toContain("month-end aggregate");
    expect(seed.problem).not.toContain("Original (DE)");
  });

  it("falls back gracefully on a thin/unreadable demand", () => {
    const seed = seedFromDemandMarkdown("UC-2026-9999", "# UC-2026-9999 · Bare\n\nno state")!;
    expect(seed.id).toBe("UC-2026-9999");
    expect(seed.title).toBe("Bare");
    expect(seed.plant).toBe("ALL");
    expect(seed.lane).toBe("transform");
    expect(seed.problem).toBe("Captured at intake — see the use case.");
    expect(seed.requester).toBe("requester@example.com");
  });

  it("returns undefined for empty markdown", () => {
    expect(seedFromDemandMarkdown("UC-2026-0001", "   ")).toBeUndefined();
  });
});
