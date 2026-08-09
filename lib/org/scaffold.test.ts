/**
 * A scaffold is the coached blank page — and it must actually match the grammar it is
 * meant to help fill. If a starter skeleton drifts from its section's criteria (a
 * renamed heading, a dropped column), a new department would open onto a page that
 * scores zero for reasons the user can't see. These tests pin the skeletons to the
 * grammar: every scaffold hits its structural criteria, and only the content-bearing
 * frontmatter (owner, dates) is left for the human.
 */

import { describe, it, expect } from "vitest";
import { scaffoldSection, scaffoldDepartment, slugifyDept, composeBriefDraft, sectionUnder, scaffoldLaneFile, authorityLevelOf } from "./scaffold";
import { scoreSection } from "./scoring";
import { laneFileDef, AUTHORITY_LEVELS } from "./lane";
import { setAuthorityInBrief } from "./autonomy";
import { CORE_SECTIONS, MODULE_SECTIONS, sectionDef } from "./model";

describe("slugifyDept", () => {
  it("makes a safe slug from a free-text name", () => {
    expect(slugifyDept("Operations Digitalization")).toBe("operations-digitalization");
    expect(slugifyDept("  Fleet Ops (EU) ")).toBe("fleet-ops-eu");
    expect(slugifyDept("Qualität & Prüfung")).toBe("qualitat-prufung");
  });
});

describe("scaffolds match the grammar they help fill", () => {
  for (const def of CORE_SECTIONS) {
    it(`${def.key}: every structural criterion is already satisfied by the skeleton`, () => {
      const s = scoreSection(def, scaffoldSection(def.key, "Demo Dept"));
      // A scaffold supplies STRUCTURE — headings, table columns, frontmatter keys —
      // not CONTENT. So the criteria it legitimately cannot satisfy are the human's to
      // fill: the owner, and the table ROWS (a real row is data, not a template). The
      // columns of those tables, checked by `column` criteria, must already be present.
      const structuralMissing = s.required
        .filter((r) => !r.met && !/owner|table|rows/i.test(r.label))
        .map((r) => r.label);
      expect(structuralMissing, `${def.key} scaffold is missing: ${structuralMissing.join(", ")}`).toEqual([]);
    });
  }

  it("leaves the owner for the human to fill (so it isn't silently 100%)", () => {
    const s = scoreSection(sectionDef("charter")!, scaffoldSection("charter", "Demo"));
    expect(s.missing.some((m) => /owner/i.test(m))).toBe(true);
    expect(s.score).toBeLessThan(100);
  });

  it("scaffolds all twelve core sections for a new department", () => {
    const files = scaffoldDepartment("Demo");
    expect(Object.keys(files).sort()).toEqual(CORE_SECTIONS.map((s) => s.key).sort());
  });

  it("carries validity frontmatter only on the critical sections", () => {
    expect(scaffoldSection("strategy")).toContain("valid-until:");
    expect(scaffoldSection("intake")).not.toContain("valid-until:");
  });

  for (const def of MODULE_SECTIONS) {
    it(`module ${def.key}: scaffold satisfies its structural criteria`, () => {
      const s = scoreSection(def, scaffoldSection(def.key, "Demo Dept"));
      const structural = s.required.filter((r) => !r.met && !/owner|table|rows/i.test(r.label)).map((r) => r.label);
      expect(structural, `${def.key} module scaffold missing: ${structural.join(", ")}`).toEqual([]);
    });
  }

  it("gives systems-of-record (the critical module) validity frontmatter", () => {
    expect(scaffoldSection("systems-of-record")).toContain("valid-until:");
    expect(scaffoldSection("guardrails")).not.toContain("valid-until:");
  });
});

describe("sectionUnder", () => {
  const md = `# X — Playbook

## Handovers
Work leaves to the shift lead on acceptance of the report.

## Wait states
_Where the lane waits, and what the agent does meanwhile._
`;
  it("returns the body under a matching heading", () => {
    expect(sectionUnder(md, /handover/i)).toContain("shift lead");
  });
  it("returns empty for a placeholder-only section", () => {
    expect(sectionUnder(md, /wait state/i)).toBe("");
  });
  it("returns empty when the heading is absent", () => {
    expect(sectionUnder(md, /escalation/i)).toBe("");
  });
});

describe("composeBriefDraft", () => {
  const playbook = `# Scrap · Playbook

| Step | Human/Agent | Action | Output |
|---|---|---|---|
| 1 | agent | pull the scrap log | table |

## Exceptions / error paths
If the log is missing, the operator files a manual count.

## Handovers
Hands the reconciled figure to the shift lead.

## Control points & rework rule
Never post a correction without a second reviewer.
`;
  const skills = `# Scrap · Skills

## Interfaces / systems
Reads MES scrap table; writes nothing.
`;

  it("fills scope/guardrails/escalation/rights from the pack, quoting real content", () => {
    const brief = composeBriefDraft("Scrap", { playbook, skills }, "2026-07-01");
    expect(brief).toContain("## Scope");
    expect(brief).toContain("second reviewer"); // from control points → guardrails
    expect(brief).toContain("shift lead"); // from handovers → escalation
    expect(brief).toContain("MES scrap table"); // from interfaces → rights
    expect(brief).toContain("2026-07-01");
  });

  it("leaves the owner blank and the authority level unchosen — never grants autonomy", () => {
    const brief = composeBriefDraft("Scrap", { playbook, skills }, "2026-07-01");
    // Frontmatter owner is empty; the five-rung hint is still present (no single level chosen).
    expect(brief).toMatch(/owner:\s*\n/);
    expect(brief).toContain("read-only · draft · recommend");
  });

  it("scores its structural criteria against the agent-brief grammar", () => {
    const def = laneFileDef("agent-brief")!;
    const brief = composeBriefDraft("Scrap", { playbook, skills }, "2026-07-01");
    const s = scoreSection(def, brief);
    const missingStructural = s.required.filter((r) => !r.met && !/owner/i.test(r.label)).map((r) => r.label);
    expect(missingStructural, `missing: ${missingStructural.join(", ")}`).toEqual([]);
  });

  it("falls back to placeholders when the pack is empty", () => {
    const brief = composeBriefDraft("Bare", {}, "2026-07-01");
    expect(brief).toContain("## Guardrails");
    expect(brief).toContain("never cross"); // the scaffold placeholder text
  });
});

describe("authorityLevelOf", () => {
  it("resolves every level a set brief names — including read-only despite 'no drafts'", () => {
    const base = scaffoldLaneFile("agent-brief", "Test Lane");
    for (const level of AUTHORITY_LEVELS) {
      const brief = setAuthorityInBrief(base, level);
      expect(authorityLevelOf(brief), `${level} should resolve`).toBe(level);
    }
  });

  it("returns null for the unset scaffold (all five levels listed as a hint)", () => {
    expect(authorityLevelOf(scaffoldLaneFile("agent-brief", "Test Lane"))).toBeNull();
  });

  it("does not read a level word embedded in a longer word (drafts, recommended)", () => {
    expect(authorityLevelOf("# B\n## Authority level\nRuns at `read-only`. No drafts. Recommended by nobody.")).toBe("read-only");
  });
});
