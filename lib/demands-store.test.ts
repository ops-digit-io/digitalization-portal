import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listDemands, readDemand, saveDemand } from "./demands-store.js";
import { buildDemand, EMPTY_ANSWERS } from "./demand.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "demands-"));
  await mkdir(join(dir, "demands"), { recursive: true });
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("demands-store", () => {
  it("lists demand summaries and ignores README", async () => {
    await writeFile(join(dir, "demands", "README.md"), "# not a demand");
    await writeFile(
      join(dir, "demands", "UC-2026-0071.md"),
      buildDemand({ id: "UC-2026-0071", createdOn: "2026-06-30", lane: "data_ai" }, { ...EMPTY_ANSWERS, title: "Scrap alerts", plant: "DE-ALD", problem: "x", currentPain: "y", desiredOutcome: "z" }),
    );
    const list = await listDemands(dir);
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe("UC-2026-0071");
    expect(list[0]!.stage).toBe("S1");
    expect(list[0]!.lane).toBe("data_ai");
    expect(list[0]!.needsAttention).toBe(false);
  });

  it("does not flag an unassigned lane as needs-attention", async () => {
    await writeFile(
      join(dir, "demands", "UC-2026-0072.md"),
      buildDemand({ id: "UC-2026-0072", createdOn: "2026-07-01", lane: "unassigned" }, { ...EMPTY_ANSWERS, title: "Idea", plant: "DE-ALD", problem: "x", currentPain: "y", desiredOutcome: "z" }),
    );
    const list = await listDemands(dir);
    expect(list[0]!.lane).toBe("unassigned");
    expect(list[0]!.needsAttention).toBe(false);
  });

  it("saves to the local working tree and reads back", async () => {
    const md = buildDemand({ id: "UC-2026-0080", createdOn: "2026-07-22", lane: "transform" }, { ...EMPTY_ANSWERS, title: "New", plant: "SK-PUC", problem: "a", currentPain: "b", desiredOutcome: "c" });
    const res = await saveDemand("UC-2026-0080", md, { baseDir: dir });
    expect(res.host).toBe("local");
    expect(res.path).toBe("demands/UC-2026-0080.md");
    expect(await readDemand("UC-2026-0080", dir)).toBe(md);
  });
});
