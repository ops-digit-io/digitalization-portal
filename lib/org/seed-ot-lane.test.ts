/**
 * The seeded OT control-loop lane actually resolves — and is actually permitted.
 *
 * This guards a trap that fails SILENTLY. `authorityLevelOf` and
 * `controlSurfaceOf` resolve only when exactly ONE distinct level/surface word
 * appears in the whole document. A brief whose prose says "the agent recommends a
 * setpoint" anywhere outside its own headings resolves to NOTHING — the lane
 * quietly has no autonomy set, and nobody finds out until someone asks why the
 * ladder shows blank.
 *
 * Since the seeded brief is also the worked example a real department copies, a
 * silent failure here would propagate.
 */

import { describe, it, expect } from "vitest";
import { bundledLane, bundledLaneSlugs } from "./seed.js";
import { authorityLevelOf } from "./scaffold.js";
import { controlSurfaceOf, canActOn, loopKind, missingSafetyCase, isAuthorityLevel, EXECUTE_READINESS } from "./autonomy.js";

const pack = () => bundledLane("operations-digitalization", "ot-setpoint-advisory");

describe("seeded lane: ot-setpoint-advisory", () => {
  it("is bundled alongside the original lane", () => {
    expect(bundledLaneSlugs("operations-digitalization")).toContain("ot-setpoint-advisory");
    expect(bundledLaneSlugs("operations-digitalization")).toContain("connectivity-assessment");
  });

  it("ships the full lane pack", () => {
    expect(Object.keys(pack() ?? {}).sort()).toEqual(["agent-brief", "metrics", "playbook", "skills", "tasks"]);
  });

  it("resolves to exactly one authority level — the ambiguity rule is not tripped", () => {
    expect(authorityLevelOf(pack()!["agent-brief"]!)).toBe("execute-with-approval");
  });

  it("resolves to exactly one control surface", () => {
    expect(controlSurfaceOf(pack()!["agent-brief"]!)).toBe("setpoint");
  });

  it("is a semi-autonomous control loop, by derivation rather than by assertion", () => {
    const brief = pack()!["agent-brief"]!;
    const level = authorityLevelOf(brief);
    const surface = controlSurfaceOf(brief);
    expect(isAuthorityLevel(level)).toBe(true);
    expect(surface).not.toBeNull();
    if (!isAuthorityLevel(level) || surface === null) return;
    expect(loopKind(level, surface)).toBe("semi-autonomous control loop");
  });

  it("carries all three parts of the safety case, so canActOn PERMITS it", () => {
    const brief = pack()!["agent-brief"]!;
    const safety = {
      envelope: /##\s*Envelope/i.test(brief),
      fallback: /##\s*Fallback/i.test(brief),
      abortCondition: /##\s*Abort condition/i.test(brief),
    };
    expect(missingSafetyCase(safety)).toEqual([]);
    expect(
      canActOn("execute-with-approval", "setpoint", {
        agentBriefPresent: true,
        agentBriefScore: EXECUTE_READINESS,
        safety,
      }).ok,
    ).toBe(true);
  });

  it("would be REFUSED if any one of the three were removed — the example is not decorative", () => {
    for (const drop of ["envelope", "fallback", "abortCondition"] as const) {
      const safety = { envelope: true, fallback: true, abortCondition: true, [drop]: false };
      const r = canActOn("execute-with-approval", "setpoint", {
        agentBriefPresent: true,
        agentBriefScore: EXECUTE_READINESS,
        safety,
      });
      expect(r.ok).toBe(false);
    }
  });

  it("names a responsible human in frontmatter — an agent without one is a masterless tool", () => {
    expect(pack()!["agent-brief"]!).toMatch(/^---[\s\S]*?owner:\s*\S+/);
  });

  it("writes only its own line's setpoint — the guardrail is in the brief, not just in code", () => {
    const brief = pack()!["agent-brief"]!;
    expect(brief).toMatch(/Schreiben:[\s\S]*?nur nach Quittung/);
  });
});
