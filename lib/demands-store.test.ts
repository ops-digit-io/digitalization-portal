import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listDemands, listDemandRows, readDemand, saveDemand, saveArtifact, readArtifact, listArtifacts, saveNewDemand } from "./demands-store.js";
import { buildDemand, EMPTY_ANSWERS } from "./demand.js";
import { FileExistsError } from "./git/index.js";

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

  it("maps cases into board-ready registry rows, with since falling back to Created", async () => {
    await seedCase("UC-2026-0071", demand("UC-2026-0071", "data_ai", { domain: "quality" }));
    const rows = await listDemandRows(dir);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.id).toBe("UC-2026-0071");
    expect(row.stage).toBe("S1");
    expect(row.lane).toBe("data_ai");
    expect(row.status).toBe("active");
    expect(row.plant).toBe("DE-ALD");
    expect(row.domain).toBe("quality");
    // A freshly captured demand carries Created, not yet a stage-entry Since.
    expect(row.since).toBe("2026-06-30");
    expect(row.needsAttention).toBeUndefined();
  });

  it("flags an unreadable case as needs-attention rather than dropping it", async () => {
    await seedCase("UC-2026-0099", "# UC-2026-0099 · Broken\n\nNo State section here.\n");
    const rows = await listDemandRows(dir);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("UC-2026-0099");
    expect(rows[0]!.needsAttention).toBe(true);
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

  describe("collision-free id allocation", () => {
    it("createOnly refuses to overwrite an existing demand", async () => {
      await saveDemand("UC-2026-0001", demand("UC-2026-0001", "transform"), { baseDir: dir, createOnly: true });
      await expect(
        saveDemand("UC-2026-0001", demand("UC-2026-0001", "data_ai"), { baseDir: dir, createOnly: true }),
      ).rejects.toBeInstanceOf(FileExistsError);
      // The original is intact — not clobbered.
      expect(await readDemand("UC-2026-0001", dir)).toContain("Lane:** transform");
    });

    it("saveNewDemand allocates sequential unique ids", async () => {
      const a = await saveNewDemand(2026, (id) => demand(id, "transform"), { baseDir: dir });
      const b = await saveNewDemand(2026, (id) => demand(id, "transform"), { baseDir: dir });
      expect(a.id).toBe("UC-2026-0001");
      expect(b.id).toBe("UC-2026-0002");
      expect((await listDemands(dir)).map((d) => d.id)).toEqual(["UC-2026-0001", "UC-2026-0002"]);
    });

    it("saveNewDemand retries past an id taken concurrently, never overwriting it", async () => {
      // Simulate a racing writer that already grabbed the id this call would compute.
      await seedCase("UC-2026-0001", demand("UC-2026-0001", "data_ai"));
      const res = await saveNewDemand(2026, (id) => demand(id, "transform"), { baseDir: dir });
      expect(res.id).toBe("UC-2026-0002"); // skipped the taken id
      expect(await readDemand("UC-2026-0001", dir)).toContain("Lane:** data_ai"); // untouched
    });

    it("concurrent saveNewDemand calls never collide", async () => {
      const results = await Promise.all(
        Array.from({ length: 8 }, () => saveNewDemand(2026, (id) => demand(id, "transform"), { baseDir: dir })),
      );
      const ids = results.map((r) => r.id);
      expect(new Set(ids).size).toBe(8); // all unique
    });
  });
});
