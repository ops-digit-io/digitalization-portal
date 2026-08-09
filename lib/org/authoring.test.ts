/**
 * Authoring writes a department that the reader can then read back and score.
 *
 * With no GitHub App in the test environment, writes take the local path — into the
 * same mirror directory the reader consults — so this exercises the full round trip:
 * create a department, save a section, read it back scored. It also pins the guards:
 * an unknown section key or an unsafe slug is a caller error, never a written file.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDepartment, saveSection, OrgWriteError } from "./authoring";
import { readDepartment } from "./store";

describe("org authoring — local round trip and guards", () => {
  beforeAll(async () => {
    // Point the content seam's mirror at a throwaway dir; writes and reads share it.
    process.env.ORGANIZATION_MIRROR_DIR = await mkdtemp(path.join(os.tmpdir(), "org-authoring-"));
  });

  it("creates a department from a name and reads it back", async () => {
    const { slug } = await createDepartment("Test Fleet Ops");
    expect(slug).toBe("test-fleet-ops");
    const dept = await readDepartment(slug);
    expect(dept).not.toBeNull();
    expect(dept!.name).toBe("Test Fleet Ops");
    // The charter is scaffolded, so its structure scores partially but not fully.
    const charter = dept!.sections.find((s) => s.key === "charter")!;
    expect(charter.score.present).toBe(true);
    expect(charter.score.score).toBeGreaterThan(0);
    expect(charter.score.score).toBeLessThan(100);
  });

  it("saves a section and the reader reflects the new score", async () => {
    const { slug } = await createDepartment("Test Metrics Dept");
    const md = [
      "---",
      "owner: Jane",
      "review-cadence: monthly",
      "last-verified: 2026-08-01",
      "valid-until: 2026-12-31",
      "verification-method: monthly review",
      "source-of-truth: the metrics sheet",
      "---",
      "# Metrics",
      "| Metric | Formula | Source | Target |",
      "|---|---|---|---|",
      "| Throughput | count/period | MES | rising |",
      "| Rework | rework/total | QA | < 2% |",
      "| Lead time | end-start | MES | < 5d |",
    ].join("\n");
    await saveSection(slug, "metrics", md);
    const dept = await readDepartment(slug);
    const metrics = dept!.sections.find((s) => s.key === "metrics")!;
    expect(metrics.score.score).toBe(100);
    expect(metrics.score.missing).toEqual([]);
  });

  it("rejects an unknown section key", async () => {
    await expect(saveSection("test-fleet-ops", "not-a-section", "x")).rejects.toBeInstanceOf(OrgWriteError);
  });

  it("rejects an unsafe slug before it reaches a file path", async () => {
    await expect(saveSection("../escape", "charter", "x")).rejects.toBeInstanceOf(OrgWriteError);
  });

  it("rejects an empty department name", async () => {
    await expect(createDepartment("   ")).rejects.toBeInstanceOf(OrgWriteError);
  });
});
