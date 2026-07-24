import { describe, it, expect } from "vitest";
import { assignLane, rejectDemand, isLane } from "./demand-triage.js";
import { buildDemand, EMPTY_ANSWERS } from "./demand.js";
import { parseUseCase } from "./parse.js";

const demand = (over?: Partial<typeof EMPTY_ANSWERS>) =>
  buildDemand(
    { id: "UC-2026-0071", createdOn: "2026-06-30", lane: "transform" },
    { ...EMPTY_ANSWERS, title: "T", plant: "DE-ALD", problem: "x", currentPain: "y", desiredOutcome: "z", ...over },
  );

describe("assignLane", () => {
  it("sets the State lane and records history", () => {
    const res = assignLane(demand(), "data_ai", { actor: "triage@example.com", date: "2026-07-02" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const p = parseUseCase(res.markdown);
    expect(p.state.lane).toBe("data_ai");
    expect(res.markdown).toMatch(/lane set to data_ai at triage by triage@example\.com/);
  });

  it("refuses when the stage can't be read", () => {
    const res = assignLane("# broken\n\nno state here", "run", { actor: "a", date: "2026-07-02" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/couldn't be read/);
  });
});

describe("rejectDemand", () => {
  it("parks with a reason and reroutes to backlog", () => {
    const res = rejectDemand(demand(), "duplicate of UC-2026-0044", { actor: "triage@example.com", date: "2026-07-02" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const p = parseUseCase(res.markdown);
    expect(p.state.status).toBe("parked");
    expect(res.markdown).toMatch(/rejected at triage by triage@example\.com: duplicate of UC-2026-0044 \(parked · reroute to backlog\)/);
  });

  it("refuses a blank reason — never a silent closure", () => {
    const res = rejectDemand(demand(), "   ", { actor: "a", date: "2026-07-02" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/needs a reason/);
  });
});

describe("isLane", () => {
  it("accepts taxonomy lanes and rejects others", () => {
    expect(isLane("data_ai")).toBe(true);
    expect(isLane("transform")).toBe(true);
    expect(isLane("unassigned")).toBe(false);
    expect(isLane("nonsense")).toBe(false);
  });
});
