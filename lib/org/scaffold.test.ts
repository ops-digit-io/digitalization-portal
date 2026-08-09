/**
 * A scaffold is the coached blank page — and it must actually match the grammar it is
 * meant to help fill. If a starter skeleton drifts from its section's criteria (a
 * renamed heading, a dropped column), a new department would open onto a page that
 * scores zero for reasons the user can't see. These tests pin the skeletons to the
 * grammar: every scaffold hits its structural criteria, and only the content-bearing
 * frontmatter (owner, dates) is left for the human.
 */

import { describe, it, expect } from "vitest";
import { scaffoldSection, scaffoldDepartment, slugifyDept } from "./scaffold";
import { scoreSection } from "./scoring";
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
