import { describe, it, expect } from "vitest";
import { advanceDemand } from "./demand-advance.js";
import { buildDemand, EMPTY_ANSWERS } from "./demand.js";
import { parseUseCase } from "./parse.js";

const s1 = (over?: Partial<typeof EMPTY_ANSWERS>) =>
  buildDemand(
    { id: "UC-2026-0071", createdOn: "2026-06-30", lane: "data_ai" },
    { ...EMPTY_ANSWERS, title: "T", plant: "DE-ALD", problem: "x", currentPain: "y", desiredOutcome: "z", requester: "req@example.com", ...over },
  );

describe("advanceDemand", () => {
  it("passes G1 and moves S1 → S2, recording gate + since + history", () => {
    const res = advanceDemand(s1(), { actor: "ops@example.com", date: "2026-07-01" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.from).toBe("S1");
    expect(res.to).toBe("S2");
    expect(res.gate).toBe("G1");

    const p = parseUseCase(res.markdown);
    expect(p.state.stage).toBe("S2");
    expect(p.state.raw["since"]).toBe("2026-07-01");
    const g1 = p.gates.find((g) => g.id === "G1");
    expect(g1?.status).toBe("passed");
    expect(g1?.date).toBe("2026-07-01");
    expect(g1?.by).toBe("ops@example.com");
    expect(p.gates.find((g) => g.id === "G2")?.status).toBe("open");
    expect(res.markdown).toMatch(/G1 passed \(S1→S2\) by ops@example\.com/);
  });

  it("can be chained: advancing twice reaches S3 with G2 open", () => {
    const first = advanceDemand(s1(), { actor: "ops@example.com", date: "2026-07-01" });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = advanceDemand(first.markdown, { actor: "ops@example.com", date: "2026-07-05" });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.gate).toBe("G2");
    expect(second.to).toBe("S3");
    const p = parseUseCase(second.markdown);
    expect(p.state.stage).toBe("S3");
    expect(p.gates.find((g) => g.id === "G2")?.status).toBe("passed");
    expect(p.gates.find((g) => g.id === "G3")?.status).toBe("open");
  });

  it("refuses self-approval (requester advancing their own demand)", () => {
    const res = advanceDemand(s1(), { actor: "req@example.com", date: "2026-07-01" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/requester may not approve/i);
  });

  it("refuses G3 without a named sponsor / value owner", () => {
    const s3 = `# UC-2026-0090 · T

## State

- **Stage:** S3
- **Lane:** transform
- **Status:** active

## People

| Role | Person |
|---|---|
| Requester | req@example.com |

## Gates

| Gate | Status | Date | By | Note |
|---|---|---|---|---|
| G1 Intake accepted | passed | | | |
| G2 Prioritized | passed | | | |
| G3 Business case | open | | | |
| G4 POC proven/stop | pending | | | |
| G5 Pilot proven | pending | | | |
| G6 Scale readiness | pending | | | |
| G7 Rollout complete | pending | | | |
`;
    const res = advanceDemand(s3, { actor: "ops@example.com", date: "2026-07-01" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/sponsor/i);
  });

  it("refuses when the stage cannot be read", () => {
    const res = advanceDemand("# Broken\n\nNo state here.\n", { actor: "ops@example.com", date: "2026-07-01" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/stage/i);
  });

  it("refuses to advance past the final stage", () => {
    const s8 = `# UC-2026-0099 · Done

## State

- **Stage:** S8
- **Status:** active

## Gates

| Gate | Status | Date | By | Note |
|---|---|---|---|---|
| G7 Rollout complete | passed | | | |
`;
    const res = advanceDemand(s8, { actor: "ops@example.com", date: "2026-07-01" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/final stage/i);
  });
});
