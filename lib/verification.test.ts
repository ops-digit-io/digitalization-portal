import { describe, it, expect } from "vitest";
import { toggleVerification, parseVerification, isVerified, acceptanceKey } from "./verification.js";
import { buildDemand, EMPTY_ANSWERS } from "./demand.js";
import { parseUseCase } from "./parse.js";

const demand = () =>
  buildDemand(
    { id: "UC-2026-0120", createdOn: "2026-06-01", lane: "data_ai" },
    { ...EMPTY_ANSWERS, title: "T", plant: "DE-ALD", problem: "x", currentPain: "y", desiredOutcome: "z" },
  );

const opts = { actor: "champ@example.com", date: "2026-07-27" };

describe("toggleVerification", () => {
  it("creates the ## Verification section before ## History on first tick", () => {
    const res = toggleVerification(demand(), "US-1", true, opts);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.markdown.indexOf("## Verification")).toBeLessThan(res.markdown.indexOf("## History"));
    expect(isVerified(res.markdown, "US-1")).toBe(true);
  });

  it("records an audit suffix (date + actor)", () => {
    const res = toggleVerification(demand(), "E1", true, opts);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.markdown).toContain("- [x] E1 — 2026-07-27 by champ@example.com");
  });

  it("accumulates multiple ticked keys and reads them back", () => {
    let md = demand();
    md = (toggleVerification(md, "E1", true, opts) as { markdown: string }).markdown;
    md = (toggleVerification(md, "US-1", true, opts) as { markdown: string }).markdown;
    md = (toggleVerification(md, acceptanceKey("US-1", 0), true, opts) as { markdown: string }).markdown;
    expect(parseVerification(md)).toEqual(new Set(["E1", "US-1", "US-1#1"]));
  });

  it("unticking removes the key", () => {
    let md = demand();
    md = (toggleVerification(md, "US-1", true, opts) as { markdown: string }).markdown;
    md = (toggleVerification(md, "US-1", false, opts) as { markdown: string }).markdown;
    expect(isVerified(md, "US-1")).toBe(false);
    expect(md).toContain("_Nothing verified yet._");
  });

  it("is idempotent (ticking an already-ticked key is a no-op)", () => {
    const first = toggleVerification(demand(), "US-1", true, opts);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const again = toggleVerification(first.markdown, "US-1", true, opts);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.markdown).toBe(first.markdown);
  });

  it("does not disturb the State or Gates sections", () => {
    const res = toggleVerification(demand(), "US-1", true, opts);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const p = parseUseCase(res.markdown);
    expect(p.state.stage).toBe("S1");
    expect(p.gates.find((g) => g.id === "G1")?.status).toBe("open");
  });

  it("rejects an invalid key", () => {
    const res = toggleVerification(demand(), "US 1 bad", true, opts);
    expect(res.ok).toBe(false);
  });

  it("survives a requirements re-analysis (state lives in the README, not requirements.md)", () => {
    // Ticks are stored in the demand README — regenerating requirements.md can't touch them.
    const res = toggleVerification(demand(), "US-1", true, opts);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(isVerified(res.markdown, "US-1")).toBe(true);
  });
});
