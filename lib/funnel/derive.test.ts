/**
 * Auto-derived funnel artifacts — the drafters run automatically when a demand
 * lands, exactly once, offline, and never over a human's edits. These tests pin
 * that contract: generate when absent, skip when present, honest empty value,
 * deterministic bytes, and a no-op on an unreadable demand.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureDerivedArtifacts, deriveForIds } from "./derive.js";
import { saveDemand, listArtifacts, readArtifact } from "../demands-store.js";
import { buildDemand, EMPTY_ANSWERS } from "../demand.js";

let dir: string;

const ID = "UC-2026-0001";
const build = (id: string) =>
  buildDemand(
    { id, createdOn: "2026-06-30", lane: "transform" },
    { ...EMPTY_ANSWERS, title: "Reduce changeover scrap", plant: "DE-ALD", domain: "quality", problem: "scrap on changeover", currentPain: "3% scrap", desiredOutcome: "cut scrap in half" },
  );

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "derive-"));
  await mkdir(join(dir, "demands"), { recursive: true });
  await saveDemand(ID, build(ID), { baseDir: dir });
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("ensureDerivedArtifacts", () => {
  it("generates requirements, analysis, and a business-case draft when absent", async () => {
    const res = await ensureDerivedArtifacts(ID, { baseDir: dir, generatedOn: "2026-07-01" });
    expect(res.generated.sort()).toEqual(["analysis", "business-case", "requirements"]);
    expect(res.skipped).toEqual([]);
    expect(await listArtifacts(ID, dir)).toEqual(["analysis", "business-case", "requirements"]);
  });

  it("is idempotent — a second run generates nothing and skips all three", async () => {
    await ensureDerivedArtifacts(ID, { baseDir: dir, generatedOn: "2026-07-01" });
    const again = await ensureDerivedArtifacts(ID, { baseDir: dir, generatedOn: "2026-07-01" });
    expect(again.generated).toEqual([]);
    expect(again.skipped.sort()).toEqual(["analysis", "business-case", "requirements"]);
  });

  it("never overwrites a human's existing artifact", async () => {
    const hand = "# Requirements\n\nHand-written — do not touch.\n";
    await writeFile(join(dir, "demands", ID, "requirements.md"), hand);
    const res = await ensureDerivedArtifacts(ID, { baseDir: dir, generatedOn: "2026-07-01" });
    expect(res.skipped).toContain("requirements");
    expect(res.generated).not.toContain("requirements");
    expect(await readArtifact(ID, "requirements", dir)).toBe(hand);
  });

  it("drafts an HONEST business case — no fabricated value when the intake has no baseline", async () => {
    await ensureDerivedArtifacts(ID, { baseDir: dir, generatedOn: "2026-07-01" });
    const bc = (await readArtifact(ID, "business-case", dir))!;
    expect(bc.toLowerCase()).toContain("indicative");
    expect(bc).toMatch(/quantif/i); // value is "to be quantified", never invented
  });

  it("is deterministic — same demand + stamp → identical bytes", async () => {
    await ensureDerivedArtifacts(ID, { baseDir: dir, generatedOn: "2026-07-01" });
    const first = await readArtifact(ID, "requirements", dir);
    const other = await mkdtemp(join(tmpdir(), "derive-"));
    try {
      await mkdir(join(other, "demands"), { recursive: true });
      await saveDemand(ID, build(ID), { baseDir: other });
      await ensureDerivedArtifacts(ID, { baseDir: other, generatedOn: "2026-07-01" });
      expect(await readArtifact(ID, "requirements", other)).toBe(first);
    } finally {
      await rm(other, { recursive: true, force: true });
    }
  });

  it("is a no-op for an unreadable demand (never throws)", async () => {
    const res = await ensureDerivedArtifacts("UC-2026-9999", { baseDir: dir });
    expect(res).toEqual({ id: "UC-2026-9999", generated: [], skipped: [] });
  });
});

describe("deriveForIds", () => {
  it("derives a batch and isolates a failing id", async () => {
    const results = await deriveForIds([ID, "UC-2026-9999"], { baseDir: dir, generatedOn: "2026-07-01" });
    const byId = Object.fromEntries(results.map((r) => [r.id, r]));
    expect(byId[ID]!.generated.length).toBe(3);
    expect(byId["UC-2026-9999"]!.generated).toEqual([]);
  });
});
