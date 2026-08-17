/**
 * The control-surface axis.
 *
 * Two properties are load-bearing:
 *
 *  1. The LADDER IS UNTOUCHED. Every assertion in `autonomy.test.ts` must still
 *     hold; this file adds a narrowing and never a widening. The first block
 *     re-asserts that here too, because a regression there would silently change
 *     what every existing lane is allowed to do.
 *  2. A complete agent brief earns AUTONOMY. It does not by itself earn a
 *     MACHINE. That is the whole point of the second axis.
 */

import { describe, it, expect } from "vitest";
import {
  CONTROL_SURFACES,
  SURFACE_POLICY,
  surfacePolicy,
  isControlSurface,
  canActOn,
  canRaiseTo,
  loopKind,
  missingSafetyCase,
  setControlSurfaceInBrief,
  controlSurfaceOf,
  authorityLadder,
  AUTHORITY_LEVELS,
  EXECUTE_READINESS,
} from "./autonomy.js";

const complete = { agentBriefPresent: true, agentBriefScore: EXECUTE_READINESS };
const safe = { envelope: true, fallback: true, abortCondition: true };

describe("the existing ladder is untouched", () => {
  it("still has exactly five rungs in order", () => {
    expect(AUTHORITY_LEVELS).toEqual([
      "read-only",
      "draft",
      "recommend",
      "execute-with-approval",
      "execute-autonomously",
    ]);
    expect(authorityLadder().map((p) => p.rank)).toEqual([0, 1, 2, 3, 4]);
  });

  it("canRaiseTo behaves exactly as before", () => {
    expect(canRaiseTo("draft", { agentBriefPresent: false, agentBriefScore: 0 }).ok).toBe(true);
    expect(canRaiseTo("recommend", { agentBriefPresent: false, agentBriefScore: 0 }).ok).toBe(false);
    expect(canRaiseTo("execute-with-approval", { agentBriefPresent: true, agentBriefScore: 99 }).ok).toBe(false);
    expect(canRaiseTo("execute-with-approval", complete).ok).toBe(true);
  });
});

describe("SURFACE_POLICY", () => {
  it("is ordinal by how far the consequence travels", () => {
    expect(CONTROL_SURFACES.map((s) => surfacePolicy(s).reach)).toEqual([0, 1, 2, 3]);
  });

  it("marks only setpoint as physical", () => {
    expect(CONTROL_SURFACES.filter((s) => SURFACE_POLICY[s].physical)).toEqual(["setpoint"]);
  });

  it("recognises its own members and rejects anything else", () => {
    expect(isControlSurface("setpoint")).toBe(true);
    expect(isControlSurface("machine")).toBe(false);
    expect(isControlSurface(undefined)).toBe(false);
  });
});

describe("loopKind — the plant's vocabulary, derived", () => {
  it("names the three control-loop kinds", () => {
    expect(loopKind("recommend", "setpoint")).toBe("operator assistance system");
    expect(loopKind("execute-with-approval", "setpoint")).toBe("semi-autonomous control loop");
    expect(loopKind("execute-autonomously", "setpoint")).toBe("autonomous control loop");
  });

  it("names nothing for a surface that is not physical", () => {
    expect(loopKind("execute-autonomously", "ticket")).toBeUndefined();
    expect(loopKind("execute-autonomously", "advice")).toBeUndefined();
  });

  it("names nothing for a rung that cannot act or recommend", () => {
    expect(loopKind("draft", "setpoint")).toBeUndefined();
    expect(loopKind("read-only", "setpoint")).toBeUndefined();
  });
});

describe("canActOn — a complete brief earns autonomy, not a machine", () => {
  it("REFUSES an acting rung on a setpoint when the safety case is missing", () => {
    const r = canActOn("execute-with-approval", "setpoint", complete);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("semi-autonomous control loop");
    expect(r.reason).toContain("bounded envelope");
    expect(r.reason).toContain("named fallback");
    expect(r.reason).toContain("abort condition");
  });

  it("PERMITS the very same lane on a non-physical surface", () => {
    for (const s of ["advice", "record", "ticket"] as const) {
      expect(canActOn("execute-with-approval", s, complete).ok).toBe(true);
    }
  });

  it("permits the setpoint once all three parts are written", () => {
    expect(canActOn("execute-autonomously", "setpoint", { ...complete, safety: safe }).ok).toBe(true);
  });

  it("refuses on a partial safety case and names only what is missing", () => {
    const r = canActOn("execute-autonomously", "setpoint", {
      ...complete,
      safety: { envelope: true, fallback: true },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("abort condition");
    expect(r.reason).not.toContain("bounded envelope");
  });

  it("passes non-acting rungs trivially — a drafting agent cannot move anything", () => {
    expect(canActOn("read-only", "setpoint", { agentBriefPresent: false, agentBriefScore: 0 }).ok).toBe(true);
    expect(canActOn("draft", "setpoint", { agentBriefPresent: false, agentBriefScore: 0 }).ok).toBe(true);
  });

  it("defers to the ladder first — an unfinished brief is refused for the ladder's reason", () => {
    const r = canActOn("execute-with-approval", "setpoint", {
      agentBriefPresent: true,
      agentBriefScore: 40,
      safety: safe,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("agent brief must be complete");
  });

  it("only ever narrows — it never permits what the ladder refused", () => {
    for (const level of AUTHORITY_LEVELS) {
      for (const surface of CONTROL_SURFACES) {
        const ctx = { agentBriefPresent: false, agentBriefScore: 0, safety: safe };
        if (!canRaiseTo(level, ctx).ok) expect(canActOn(level, surface, ctx).ok).toBe(false);
      }
    }
  });
});

describe("missingSafetyCase", () => {
  it("reports all three when nothing is written", () => {
    expect(missingSafetyCase(undefined)).toEqual(["envelope", "fallback", "abortCondition"]);
  });

  it("reports none when all three are true", () => {
    expect(missingSafetyCase(safe)).toEqual([]);
  });

  it("treats anything but an explicit true as missing", () => {
    expect(missingSafetyCase({ envelope: false, fallback: true, abortCondition: true })).toEqual(["envelope"]);
  });
});

describe("setControlSurfaceInBrief / controlSurfaceOf round-trip", () => {
  it("appends the section when the brief has none, and reads it back", () => {
    const out = setControlSurfaceInBrief("# Brief\n\nSome scope.\n", "setpoint");
    expect(out).toContain("## Control surface");
    expect(controlSurfaceOf(out)).toBe("setpoint");
  });

  it("replaces an existing section rather than adding a second", () => {
    const once = setControlSurfaceInBrief("# Brief\n", "ticket");
    const twice = setControlSurfaceInBrief(once, "setpoint");
    expect(twice.match(/## Control surface/g)).toHaveLength(1);
    expect(controlSurfaceOf(twice)).toBe("setpoint");
  });

  it("refuses to guess when the brief names two surfaces — the scaffold.ts ambiguity rule", () => {
    expect(controlSurfaceOf("The agent writes a record and then a ticket.")).toBeNull();
  });

  it("resolves nothing from a brief that names none", () => {
    expect(controlSurfaceOf("# Brief\n\nNo surface named here.")).toBeNull();
    expect(controlSurfaceOf(undefined)).toBeNull();
  });
});
