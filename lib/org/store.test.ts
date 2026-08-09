/**
 * The org store reads and scores departments, and degrades to the bundled seed.
 *
 * With no GitHub App and no mirror, the store must still return the worked example so
 * `/org` is never blank on a fresh deploy — that fallback is the property under test
 * here (the content seam itself is exercised by the docs/registry suites). It also
 * must never throw and must reject unsafe slugs.
 */

import { describe, it, expect } from "vitest";
import { listDepartmentSlugs, listDepartments, readDepartment, readFramework } from "./store";
import { CORE_SECTIONS } from "./model";

describe("org store — seeded fallback, defensive reads", () => {
  it("lists the bundled department when nothing external is reachable", async () => {
    const slugs = await listDepartmentSlugs();
    expect(slugs).toContain("operations-digitalization");
  });

  it("returns a scored summary per department, sorted by completeness", async () => {
    const depts = await listDepartments();
    expect(depts.length).toBeGreaterThan(0);
    const ops = depts.find((d) => d.slug === "operations-digitalization")!;
    expect(ops.name).toBe("Operations Digitalization");
    expect(ops.purpose).not.toBe("");
    expect(ops.score.corePresent).toBe(CORE_SECTIONS.length);
    // Sorted descending — the first is at least as complete as the last.
    expect(depts[0]!.score.score).toBeGreaterThanOrEqual(depts[depts.length - 1]!.score.score);
  });

  it("reads a department in full: every core section, each with its score", async () => {
    const dept = await readDepartment("operations-digitalization");
    expect(dept).not.toBeNull();
    expect(dept!.sections.map((s) => s.key)).toEqual(CORE_SECTIONS.map((s) => s.key));
    expect(dept!.sections.every((s) => s.score.present)).toBe(true);
    // The charter's non-scope is written, so the load-bearing criterion is met.
    const charter = dept!.sections.find((s) => s.key === "charter")!;
    expect(charter.score.missing).toEqual([]);
    expect(charter.body).toContain("Non-Scope");
  });

  it("rejects an unknown or unsafe slug with null, never a throw", async () => {
    expect(await readDepartment("../etc/passwd")).toBeNull();
    expect(await readDepartment("does-not-exist")).toBeNull();
    expect(await readDepartment("Bad Slug!")).toBeNull();
  });

  it("surfaces the framework document", async () => {
    const fw = await readFramework();
    expect(fw).toBeDefined();
    expect(fw).toContain("Department OS");
  });
});
