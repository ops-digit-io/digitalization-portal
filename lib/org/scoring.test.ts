/**
 * The Department OS scorer reads markdown as a graded answer, not just "present".
 *
 * The point under test is that the grammar in `model.ts` is machine-checkable on real
 * markdown: an owner in frontmatter, the load-bearing headings, a table with the
 * columns an agent needs — each contributes its weight, and a gap names itself. The
 * two axes beyond presence (freshness, validity) are checked with an injected `now` so
 * they are deterministic.
 */

import { describe, it, expect } from "vitest";
import { scoreSection, scoreByKey, scoreDepartment } from "./scoring";
import { sectionDef, CORE_SECTIONS } from "./model";
import { bundledDepartment } from "./seed";

const NOW = Date.UTC(2026, 7, 8); // 2026-08-08, the seed's reference "today"

describe("scoreSection — weighted criteria on markdown", () => {
  it("scores an empty section 0 and lists every required criterion as missing", () => {
    const def = sectionDef("charter")!;
    const s = scoreSection(def, undefined, NOW);
    expect(s.present).toBe(false);
    expect(s.score).toBe(0);
    expect(s.missing.length).toBe(def.required.length);
    expect(s.coaching).toBe(def.coaching); // gaps → coaching shown
  });

  it("credits frontmatter, headings, tables and columns", () => {
    const md = [
      "---",
      "owner: Jane",
      "---",
      "# Charter",
      "## Purpose",
      "To do the thing.",
      "## Mission",
      "## Scope",
      "## Non-Scope",
      "## Stakeholders",
      "| Stakeholder | Expectation | Mode |",
      "|---|---|---|",
      "| OPEX | artifacts | receiver |",
      "| IT | tooling | tandem |",
    ].join("\n");
    const s = scoreSection(sectionDef("charter")!, md, NOW);
    expect(s.present).toBe(true);
    expect(s.score).toBe(100); // every required criterion met
    expect(s.missing).toEqual([]);
    expect(s.coaching).toBeUndefined();
    expect(s.excellence).toBeGreaterThan(0); // stakeholder table + expectation/mode
  });

  it("orders the missing list by weight, heaviest gap first", () => {
    const md = "---\nowner: x\n---\n# Charter\n## Purpose\np\n"; // only owner + purpose
    const s = scoreSection(sectionDef("charter")!, md, NOW);
    // Non-Scope (weight 14) is the heaviest missing required criterion → listed first.
    expect(s.missing[0]).toMatch(/Non-Scope/i);
  });

  it("detects a required column by header, not by prose", () => {
    const withCol = "---\nowner: x\n---\n## Objectives\n| Ziel | Unternehmensziel | Metric |\n|---|---|---|\n| A | Growth | rate |\n| B | Growth | rate |";
    const noCol = "---\nowner: x\n---\n## Objectives\n| Ziel | Note |\n|---|---|\n| A | pays into growth |\n| B | pays into growth |";
    expect(scoreSection(sectionDef("objectives")!, withCol, NOW).required.find((r) => /company goal/i.test(r.label))?.met).toBe(true);
    expect(scoreSection(sectionDef("objectives")!, noCol, NOW).required.find((r) => /company goal/i.test(r.label))?.met).toBe(false);
  });
});

describe("freshness and validity", () => {
  it("flags a section past its cadence as stale", () => {
    const md = "---\nowner: x\nreview-cadence: monthly\nlast-verified: 2026-01-01\n---\n# S";
    const s = scoreSection(sectionDef("charter")!, md, NOW);
    expect(s.freshness.stale).toBe(true);
  });

  it("treats a recently-verified section within cadence as fresh", () => {
    const md = "---\nowner: x\nreview-cadence: quarterly\nlast-verified: 2026-08-01\n---\n# S";
    const s = scoreSection(sectionDef("charter")!, md, NOW);
    expect(s.freshness.stale).toBe(false);
  });

  it("marks a critical section with no valid-until as expired", () => {
    const md = "---\nowner: x\nreview-cadence: quarterly\nlast-verified: 2026-08-01\n---\n# Strategy";
    const s = scoreSection(sectionDef("strategy")!, md, NOW);
    expect(s.critical).toBe(true);
    expect(s.validity?.expired).toBe(true);
  });

  it("accepts a critical section still within valid-until", () => {
    const md = "---\nowner: x\nreview-cadence: quarterly\nlast-verified: 2026-08-01\nvalid-until: 2026-12-31\nverification-method: review\nsource-of-truth: strat doc\n---\n# Strategy";
    const s = scoreSection(sectionDef("strategy")!, md, NOW);
    expect(s.validity?.expired).toBe(false);
  });

  it("does not attach validity to a non-critical section", () => {
    expect(scoreSection(sectionDef("intake")!, "# I", NOW).validity).toBeUndefined();
  });
});

describe("scoreDepartment — aggregate over the core", () => {
  it("counts absent sections as gaps, never throwing on a sparse map", () => {
    const d = scoreDepartment(CORE_SECTIONS, { charter: "---\nowner: x\n---\n## Purpose\np" }, NOW);
    expect(d.coreTotal).toBe(CORE_SECTIONS.length);
    expect(d.corePresent).toBe(1);
    expect(d.score).toBeGreaterThanOrEqual(0);
    expect(d.score).toBeLessThan(100);
  });
});

describe("the bundled Operations Digitalization example scores well against its own grammar", () => {
  const files = bundledDepartment("operations-digitalization")!;

  it("has all twelve core sections present", () => {
    const d = scoreByKey(files, NOW);
    expect(d.corePresent).toBe(CORE_SECTIONS.length);
  });

  it("scores every core section at full required completeness", () => {
    const d = scoreByKey(files, NOW);
    const weak = d.sections.filter((s) => s.score < 100).map((s) => `${s.key}: ${s.missing.join(", ")}`);
    expect(weak).toEqual([]);
  });

  it("keeps its critical sections valid at the reference date (nothing stale)", () => {
    const d = scoreByKey(files, NOW);
    expect(d.criticalStale).toEqual([]);
  });
});
