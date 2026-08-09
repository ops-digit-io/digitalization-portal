/**
 * The autonomy ladder — the policy per rung, the readiness guardrail, and the brief
 * rewrite that the reader parses back. This is the framework's rule made testable:
 * autonomy is earned per lane, one rung at a time, and a lane may not ACT until its
 * agent brief is written down.
 */

import { describe, it, expect } from "vitest";
import {
  authorityPolicy,
  authorityLadder,
  authorityRank,
  nextLevel,
  prevLevel,
  canRaiseTo,
  setAuthorityInBrief,
  isAuthorityLevel,
  EXECUTE_READINESS,
  toneFor,
  RUNG_TONE,
} from "./autonomy";
import { authorityLevelOf } from "./scaffold";

describe("policy per rung", () => {
  it("orders the five rungs and marks the ones that act", () => {
    expect(authorityLadder().map((p) => p.level)).toEqual([
      "read-only",
      "draft",
      "recommend",
      "execute-with-approval",
      "execute-autonomously",
    ]);
    expect(authorityPolicy("read-only").acts).toBe(false);
    expect(authorityPolicy("recommend").acts).toBe(false);
    expect(authorityPolicy("execute-with-approval").acts).toBe(true);
    expect(authorityPolicy("execute-with-approval").requiresApproval).toBe(true);
    expect(authorityPolicy("execute-autonomously").requiresApproval).toBe(false);
  });

  it("carries the plain-language fields every rung needs to be understood", () => {
    for (const p of authorityLadder()) {
      expect(p.label, `${p.level} label`).toBeTruthy();
      expect(p.summary, `${p.level} summary`).toBeTruthy();
      expect(p.human, `${p.level} human`).toBeTruthy();
      expect(p.tone, `${p.level} tone`).toBeTruthy();
    }
  });

  it("maps a level to a tone, defaulting to muted when none is set", () => {
    expect(toneFor("recommend")).toBe(authorityPolicy("recommend").tone);
    expect(toneFor(null)).toBe("muted");
    expect(toneFor("nonsense")).toBe("muted");
    expect(RUNG_TONE[toneFor("execute-autonomously")].dot).toBeTruthy();
  });

  it("steps up and down, stopping at the ends", () => {
    expect(nextLevel("read-only")).toBe("draft");
    expect(prevLevel("read-only")).toBeNull();
    expect(nextLevel("execute-autonomously")).toBeNull();
    expect(authorityRank("recommend")).toBe(2);
  });
});

describe("canRaiseTo — the guardrail", () => {
  it("always allows the non-acting rungs", () => {
    expect(canRaiseTo("read-only", { agentBriefPresent: false, agentBriefScore: 0 }).ok).toBe(true);
    expect(canRaiseTo("draft", { agentBriefPresent: false, agentBriefScore: 0 }).ok).toBe(true);
  });

  it("requires a brief to reach recommend", () => {
    expect(canRaiseTo("recommend", { agentBriefPresent: false, agentBriefScore: 0 }).ok).toBe(false);
    expect(canRaiseTo("recommend", { agentBriefPresent: true, agentBriefScore: 10 }).ok).toBe(true);
  });

  it("requires a COMPLETE brief to reach an execute rung", () => {
    expect(canRaiseTo("execute-with-approval", { agentBriefPresent: true, agentBriefScore: EXECUTE_READINESS - 1 }).ok).toBe(false);
    expect(canRaiseTo("execute-with-approval", { agentBriefPresent: true, agentBriefScore: EXECUTE_READINESS }).ok).toBe(true);
    expect(canRaiseTo("execute-autonomously", { agentBriefPresent: true, agentBriefScore: 100 }).ok).toBe(true);
  });
});

describe("setAuthorityInBrief — writes what the reader reads back", () => {
  it("replaces the authority section so authorityLevelOf reports the new level", () => {
    const brief = "---\nowner: x\n---\n# Brief\n## Scope\ns\n## Authority level\nRuns at `recommend`.\n## Guardrails\ng\n";
    const raised = setAuthorityInBrief(brief, "execute-with-approval");
    expect(authorityLevelOf(raised)).toBe("execute-with-approval");
    // Other sections survive.
    expect(raised).toContain("## Scope");
    expect(raised).toContain("## Guardrails");
  });

  it("appends an Authority level section when the brief has none", () => {
    const raised = setAuthorityInBrief("# Brief\n## Scope\ns\n", "draft");
    expect(raised).toMatch(/## Authority level/);
    expect(authorityLevelOf(raised)).toBe("draft");
  });

  it("validates a level string", () => {
    expect(isAuthorityLevel("recommend")).toBe(true);
    expect(isAuthorityLevel("boss")).toBe(false);
  });
});
