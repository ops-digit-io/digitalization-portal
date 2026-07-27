import { describe, it, expect } from "vitest";
import { killDemand, reactivateDemand } from "./demand-state.js";
import { buildDemand, EMPTY_ANSWERS } from "./demand.js";
import { parseUseCase } from "./parse.js";

const demand = () =>
  buildDemand(
    { id: "UC-2026-0100", createdOn: "2026-06-01", lane: "run" },
    { ...EMPTY_ANSWERS, title: "T", plant: "DE-ALD", problem: "x", currentPain: "y", desiredOutcome: "z" },
  );

const opts = { actor: "forum@example.com", date: "2026-07-11" };

describe("killDemand", () => {
  it("sets Status to killed and records the reason in history", () => {
    const res = killDemand(demand(), "Superseded by UC-2026-0101", opts);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(parseUseCase(res.markdown).state.status).toBe("killed");
    expect(res.markdown).toContain("2026-07-11 — killed by forum@example.com: Superseded by UC-2026-0101");
  });

  it("refuses a kill with no reason", () => {
    const res = killDemand(demand(), "   ", opts);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/reason/i);
  });

  it("refuses when the stage can't be read", () => {
    const res = killDemand("# broken\n\nno state", "reason", opts);
    expect(res.ok).toBe(false);
  });

  it("leaves the gate table intact", () => {
    const res = killDemand(demand(), "stop", opts);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(parseUseCase(res.markdown).gates.find((g) => g.id === "G1")?.status).toBe("open");
  });
});

describe("reactivateDemand", () => {
  it("returns a killed demand to active", () => {
    const killed = killDemand(demand(), "stop", opts);
    expect(killed.ok).toBe(true);
    if (!killed.ok) return;
    const res = reactivateDemand(killed.markdown, { actor: "forum@example.com", date: "2026-07-12" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(parseUseCase(res.markdown).state.status).toBe("active");
    expect(res.markdown).toContain("2026-07-12 — reactivated by forum@example.com");
  });
});
