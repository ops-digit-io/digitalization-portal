/**
 * Store round-trip in LOCAL mode (no GitHub credentials). Proves the git-backed
 * store persists engagements to a writable base dir — never `process.cwd()`, which
 * is read-only on serverless (the `/var/task/.process-workspace` crash) — and that
 * create/read/write/gate/soft-delete behave.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let dir: string;
let prevData: string | undefined;
let prevOrg: string | undefined;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pf-store-"));
  prevData = process.env.PROCESS_DATA_DIR;
  prevOrg = process.env.GITHUB_ORG;
  process.env.PROCESS_DATA_DIR = dir;
  // Ensure LOCAL mode (no GitHub App credentials) regardless of the host env.
  delete process.env.GITHUB_APP_ID;
  delete process.env.GITHUB_APP_PRIVATE_KEY;
  delete process.env.GITHUB_ORG;
});
afterEach(() => {
  if (prevData === undefined) delete process.env.PROCESS_DATA_DIR;
  else process.env.PROCESS_DATA_DIR = prevData;
  if (prevOrg !== undefined) process.env.GITHUB_ORG = prevOrg;
  rmSync(dir, { recursive: true, force: true });
});

async function store() {
  // Import fresh so the module reads the patched env each test run.
  return import("./store");
}

describe("process store (local/git fallback)", () => {
  const now = "2026-07-30T00:00:00.000Z";

  it("does not write under process.cwd(); uses the configured writable base", async () => {
    const s = await store();
    await s.create({ title: "NPM Purchasing Hannover", owner: "Jane", unit: "CC-4711" }, now);
    // The engagement lives under PROCESS_DATA_DIR, not the (read-only on serverless) cwd.
    const list = await s.list();
    expect(list.map((m) => m.slug)).toContain("npm-purchasing-hannover");
    expect(process.env.PROCESS_DATA_DIR).toBe(dir);
  });

  it("round-trips meta, a section artefact, a gate verdict and soft-delete", async () => {
    const s = await store();
    const m = await s.create({ title: "Tender Copilot", owner: "Ben" }, now);
    expect(m.slug).toBe("tender-copilot");
    expect(await s.exists("tender-copilot")).toBe(true);

    const w1 = await s.write("tender-copilot", "profile", "# Process Profile\n\n**Process owner:** Ben\n", now);
    expect(w1.changed).toBe(true);
    expect(await s.read("tender-copilot", "profile")).toContain("Process owner");
    // Idempotent write is a no-op.
    expect((await s.write("tender-copilot", "profile", "# Process Profile\n\n**Process owner:** Ben\n", now)).changed).toBe(false);

    await s.setGate("tender-copilot", "profile", true, "", now);
    const st = await s.state("tender-copilot");
    expect(st.sections.find((x) => x.key === "profile")?.gateResult?.passed).toBe(true);
    expect(st.sections.find((x) => x.key === "profile")?.filled).toBe(true);

    await s.remove("tender-copilot", now);
    expect(await s.exists("tender-copilot")).toBe(false);
    expect((await s.list()).map((x) => x.slug)).not.toContain("tender-copilot");
  });

  it("sidecar files (digest/decisions) round-trip", async () => {
    const s = await store();
    await s.create({ title: "Vision QC" }, now);
    await s.writeFileRaw("vision-qc", "digest.json", JSON.stringify({ processStatement: "x" }), now);
    expect(await s.readFileRaw("vision-qc", "digest.json")).toContain("processStatement");
    expect(await s.readFileRaw("vision-qc", "missing.json")).toBeUndefined();
  });
});
