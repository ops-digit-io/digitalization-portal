/**
 * Store round-trip in LOCAL mode (no GitHub credentials). Proves engagements
 * persist to a writable base dir — never process.cwd() (the /var/task ENOENT) —
 * and that create / rate (incl. per-component D7) / gate / soft-delete behave.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let dir: string;
let prevData: string | undefined;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pf-store-"));
  prevData = process.env.PROCESS_DATA_DIR;
  process.env.PROCESS_DATA_DIR = dir;
  delete process.env.GITHUB_APP_ID;
  delete process.env.GITHUB_APP_PRIVATE_KEY;
  delete process.env.GITHUB_ORG;
});
afterEach(() => {
  if (prevData === undefined) delete process.env.PROCESS_DATA_DIR;
  else process.env.PROCESS_DATA_DIR = prevData;
  rmSync(dir, { recursive: true, force: true });
});

async function store() {
  return import("./store");
}

describe("process store (git-backed, local fallback)", () => {
  const now = "2026-07-30T00:00:00.000Z";

  it("uses the configured writable base, not process.cwd()", async () => {
    const s = await store();
    await s.create({ title: "NPM Purchasing Hannover", owner: "Jane", champion: "Ben", unit: "CC-4711", anflug: "process" }, now);
    expect((await s.list()).map((m) => m.slug)).toContain("npm-purchasing-hannover");
    expect(process.env.PROCESS_DATA_DIR).toBe(dir);
  });

  it("stores the Spoke, Anflug and Kernkomponenten on create", async () => {
    const s = await store();
    const m = await s.create({ title: "Tender Copilot", owner: "Ada", champion: "Lin", anflug: "technology", components: ["ERP", "Excel-Liste"] }, now);
    expect(m.anflug).toBe("technology");
    expect(m.components.map((c) => c.label)).toEqual(["ERP", "Excel-Liste"]);
    expect(m.phase).toBe("discovery"); // the first stage of the anamnesis
  });

  it("round-trips a criterion rating and a per-component D7 rating", async () => {
    const s = await store();
    await s.create({ title: "Vision QC", components: ["Kamera-App"] }, now);
    await s.rate("vision-qc", "K5.1", { level: 3, confidence: "P", evidence: "Ticket-Timestamps gezogen" }, now);
    let r = await s.ratings("vision-qc");
    expect(r.criteria["K5.1"]?.level).toBe(3);
    expect(r.criteria["K5.1"]?.confidence).toBe("P");

    const m = await s.meta("vision-qc");
    const compId = m!.components[0]!.id;
    await s.rate("vision-qc", "K7.2", { level: 2 }, now, compId);
    r = await s.ratings("vision-qc");
    expect(r.components[compId]?.["K7.2"]?.level).toBe(2);

    // Clearing a rating removes it.
    await s.rate("vision-qc", "K5.1", null, now);
    r = await s.ratings("vision-qc");
    expect(r.criteria["K5.1"]).toBeUndefined();
  });

  it("records a gate verdict and soft-deletes", async () => {
    const s = await store();
    await s.create({ title: "Intake Flow" }, now);
    await s.setGate("intake-flow", "T0", true, "", now);
    expect((await s.meta("intake-flow"))!.gates["T0"]?.passed).toBe(true);

    await s.remove("intake-flow", now);
    expect(await s.exists("intake-flow")).toBe(false);
    expect((await s.list()).map((x) => x.slug)).not.toContain("intake-flow");
  });
});
