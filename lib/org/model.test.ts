/**
 * Conformance to the framework (the input zip, `01-framework.md`).
 *
 * These are not behavioural tests — they pin the grammar's SHAPE to the framework so a
 * later edit can't quietly drift from it: the twelve-file core, the seven modules, the
 * exact set of critical (validity-bearing) sections, and the `00-core/` / `10-modules/`
 * repository layout.
 */

import { describe, it, expect } from "vitest";
import { CORE_SECTIONS, MODULE_SECTIONS, CORE_KEYS, MODULE_KEYS, AUTHORITY_LEVELS, sectionSubdir, anyDef, moduleDef, sectionDef } from "./model";

describe("core section set — the twelve files (9 v3 + 3 v4)", () => {
  it("is exactly the framework's core, in order", () => {
    expect(CORE_KEYS).toEqual([
      "charter",
      "strategy",
      "objectives",
      "service-catalog",
      "intake",
      "operating-rhythm",
      "metrics",
      "decision-rights",
      "risks",
      "handover-contracts",
      "standards",
      "portfolio",
    ]);
  });

  it("does not carry decision-log — a running artefact, not a setup file", () => {
    expect(CORE_KEYS).not.toContain("decision-log");
  });
});

describe("modules — the seven department-wide packs", () => {
  it("is exactly the framework's module set", () => {
    expect([...MODULE_KEYS].sort()).toEqual(
      ["capabilities", "guardrails", "iteration-loop", "landscape", "operating-context", "shared-controls", "systems-of-record"].sort(),
    );
  });
});

describe("the critical (validity-bearing) sections match the framework exactly", () => {
  // 01-framework.md §Mechanik: strategy, metrics, decision-rights, systems-of-record.
  it("marks strategy, metrics and decision-rights critical among the core — and nothing else", () => {
    const criticalCore = CORE_SECTIONS.filter((s) => s.critical).map((s) => s.key).sort();
    expect(criticalCore).toEqual(["decision-rights", "metrics", "strategy"]);
  });

  it("does NOT mark standards critical (it carries a per-row valid-until, not the section contract)", () => {
    expect(CORE_SECTIONS.find((s) => s.key === "standards")?.critical).not.toBe(true);
  });

  it("marks systems-of-record — the fourth critical section — as the critical module", () => {
    const critModules = MODULE_SECTIONS.filter((m) => m.critical).map((m) => m.key);
    expect(critModules).toEqual(["systems-of-record"]);
  });
});

describe("the five authority levels", () => {
  it("are the framework's five rungs, in order", () => {
    expect(AUTHORITY_LEVELS).toEqual(["read-only", "draft", "recommend", "execute-with-approval", "execute-autonomously"]);
  });
});

describe("modules are first-class scored sections", () => {
  it("every module carries a real grammar (owner + criteria) and a coaching prompt", () => {
    for (const m of MODULE_SECTIONS) {
      expect(m.required.length, `${m.key} has no criteria`).toBeGreaterThan(1);
      expect(m.coaching, `${m.key} has no coaching`).toBeTruthy();
      expect(m.trigger, `${m.key} has no trigger`).toBeTruthy();
    }
  });

  it("anyDef resolves both core and module keys; sectionDef stays core-only", () => {
    expect(anyDef("charter")?.key).toBe("charter");
    expect(anyDef("systems-of-record")?.key).toBe("systems-of-record");
    expect(moduleDef("guardrails")?.key).toBe("guardrails");
    expect(sectionDef("systems-of-record")).toBeUndefined(); // module, not core
    expect(anyDef("nope")).toBeUndefined();
  });
});

describe("repository layout — 00-core / 10-modules", () => {
  it("routes core files under 00-core and modules under 10-modules", () => {
    expect(sectionSubdir("charter")).toBe("00-core");
    expect(sectionSubdir("metrics")).toBe("00-core");
    expect(sectionSubdir("systems-of-record")).toBe("10-modules");
    expect(sectionSubdir("landscape")).toBe("10-modules");
  });
});
