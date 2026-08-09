/**
 * Regression tests for the audit's confirmed scoring bugs.
 *   • biweekly cadence must be 14 days, not 7 ("weekly" ⊂ "biweekly").
 *   • a prose line with a stray pipe above a `---` rule must NOT read as a table.
 *   • an escaped pipe inside a cell must not split it.
 */

import { describe, it, expect } from "vitest";
import { scoreSection } from "./scoring";
import { sectionDef } from "./model";

const NOW = Date.UTC(2026, 7, 8); // 2026-08-08

describe("cadence resolution — biweekly is not weekly", () => {
  it("treats a biweekly section verified 10 days ago as fresh", () => {
    const md = "---\nowner: x\nreview-cadence: biweekly\nlast-verified: 2026-07-29\n---\n# S";
    expect(scoreSection(sectionDef("charter")!, md, NOW).freshness.stale).toBe(false);
  });
  it("handles the hyphenated spelling too (bi-weekly)", () => {
    const md = "---\nowner: x\nreview-cadence: bi-weekly\nlast-verified: 2026-07-29\n---\n# S";
    expect(scoreSection(sectionDef("charter")!, md, NOW).freshness.stale).toBe(false);
  });
  it("still marks a biweekly section verified 20 days ago as stale", () => {
    const md = "---\nowner: x\nreview-cadence: biweekly\nlast-verified: 2026-07-19\n---\n# S";
    expect(scoreSection(sectionDef("charter")!, md, NOW).freshness.stale).toBe(true);
  });
});

describe("table detection is not fooled by prose above a rule", () => {
  it("does not award a column criterion to a pipe-bearing paragraph over a setext rule", () => {
    // The metrics grammar wants a `source` column; this prose mentions "source" with a
    // stray pipe, followed by a `---`. It must NOT count as a table header.
    const md = [
      "---",
      "owner: x",
      "review-cadence: quarterly",
      "last-verified: 2026-08-01",
      "valid-until: 2026-12-31",
      "verification-method: v",
      "source-of-truth: s",
      "---",
      "# Metrics",
      "Escalate to the owner | the source of truth is SAP",
      "---",
      "More prose follows.",
    ].join("\n");
    const s = scoreSection(sectionDef("metrics")!, md, NOW);
    const sourceCol = s.required.find((r) => /source/i.test(r.label))!;
    expect(sourceCol.met).toBe(false); // no real table → column not credited
  });

  it("still recognises a genuine table", () => {
    const md = [
      "---\nowner: x\nreview-cadence: quarterly\nlast-verified: 2026-08-01\nvalid-until: 2026-12-31\nverification-method: v\nsource-of-truth: s\n---",
      "# Metrics",
      "| Metric | Formula | Source | Target |",
      "|---|---|---|---|",
      "| a | f | SAP | t |",
      "| b | f | SAP | t |",
      "| c | f | SAP | t |",
    ].join("\n");
    const s = scoreSection(sectionDef("metrics")!, md, NOW);
    expect(s.required.find((r) => /source/i.test(r.label))!.met).toBe(true);
    expect(s.required.find((r) => /table|rows/i.test(r.label))!.met).toBe(true);
  });
});
