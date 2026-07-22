import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listDemands, readDemand, saveDemand, saveArtifact, readArtifact, listArtifacts } from "./demands-store.js";
import { buildDemand, EMPTY_ANSWERS } from "./demand.js";

let dir: string;

const demand = (id: string, lane: "data_ai" | "transform" | "unassigned", extra?: Partial<typeof EMPTY_ANSWERS>) =>
  buildDemand({ id, createdOn: "2026-06-30", lane }, { ...EMPTY_ANSWERS, title: "T", plant: "DE-ALD", problem: "x", currentPain: "y", desiredOutcome: "z", ...extra });

async function seedCase(id: string, md: string) {
  await mkdir(join(dir, "demands", id), { recursive: true });
  await writeFile(join(dir, "demands", id, "README.md"), md);
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "demands-"));
  await mkdir(join(dir, "demands"), { recursive: true });
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("demands-store (case folders)", () => {
  it("lists cases from folders with a README.md", async () => {
    await seedCase("UC-2026-0071", demand("UC-2026-0071", "data_ai", { domain: "quality" }));
    const list = await listDemands(dir);
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe("UC-2026-0071");
    expect(list[0]!.stage).toBe("S1");
    expect(list[0]!.lane).toBe("data_ai");
    expect(list[0]!.needsAttention).toBe(false);
    expect(list[0]!.artifacts).toEqual([]);
  });

  it("does not flag an unassigned lane as needs-attention", async () => {
    await seedCase("UC-2026-0072", demand("UC-2026-0072", "unassigned"));
    const list = await listDemands(dir);
    expect(list[0]!.lane).toBe("unassigned");
    expect(list[0]!.needsAttention).toBe(false);
  });

  it("saves a case record to the funnel working tree and reads it back", async () => {
    const md = demand("UC-2026-0080", "transform");
    const res = await saveDemand("UC-2026-0080", md, { baseDir: dir });
    expect(res.host).toBe("local");
    expect(res.path).toBe("demands/UC-2026-0080/README.md");
    expect(await readDemand("UC-2026-0080", dir)).toBe(md);
  });

  it("stores standardized artifacts in the case folder and lists them", async () => {
    await seedCase("UC-2026-0071", demand("UC-2026-0071", "data_ai"));
    await saveArtifact("UC-2026-0071", "requirements", "# Requirements", { baseDir: dir });
    await saveArtifact("UC-2026-0071", "analysis", "# Analysis", { baseDir: dir });

    expect(await listArtifacts("UC-2026-0071", dir)).toEqual(["analysis", "requirements"]);
    expect(await readArtifact("UC-2026-0071", "requirements", dir)).toBe("# Requirements");
    const onDisk = await readFile(join(dir, "demands", "UC-2026-0071", "requirements.md"), "utf8");
    expect(onDisk).toBe("# Requirements");

    const list = await listDemands(dir);
    expect(list[0]!.artifacts).toEqual(["analysis", "requirements"]);
  });
});
