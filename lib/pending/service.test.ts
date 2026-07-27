import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { enqueueDemand, flushPending, pendingRows } from "./service.js";
import { listDemandIds, readDemand } from "../demands-store.js";
import { buildDemand, EMPTY_ANSWERS } from "../demand.js";

let dir: string;

const build = (id: string) =>
  buildDemand({ id, createdOn: "2026-06-30", lane: "transform" }, { ...EMPTY_ANSWERS, title: "T", plant: "DE-ALD", problem: "x", currentPain: "y", desiredOutcome: "z" });

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "pending-"));
  await mkdir(join(dir, "demands"), { recursive: true });
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("interim buffer (outbox)", () => {
  it("enqueue persists to the buffer WITHOUT writing git; reads merge it as pending", async () => {
    const { id } = await enqueueDemand(2026, build, { baseDir: dir });
    expect(id).toBe("UC-2026-0001");
    expect(await listDemandIds(dir)).toEqual([]); // nothing in git yet

    const rows = await pendingRows({ baseDir: dir });
    expect(rows.map((r) => r.id)).toEqual(["UC-2026-0001"]);
    expect(rows[0]!.pending).toBe(true);
  });

  it("concurrent enqueues allocate unique ids", async () => {
    const res = await Promise.all(Array.from({ length: 8 }, () => enqueueDemand(2026, build, { baseDir: dir })));
    expect(new Set(res.map((r) => r.id)).size).toBe(8);
  });

  it("skips ids already committed to git", async () => {
    await mkdir(join(dir, "demands", "UC-2026-0001"), { recursive: true });
    await writeFile(join(dir, "demands", "UC-2026-0001", "README.md"), build("UC-2026-0001"));
    const { id } = await enqueueDemand(2026, build, { baseDir: dir });
    expect(id).toBe("UC-2026-0002");
  });

  it("flush commits the buffer to git and clears it; a second flush is a no-op", async () => {
    await enqueueDemand(2026, build, { baseDir: dir });
    const r1 = await flushPending({ baseDir: dir });
    expect(r1.committed).toBe(1);
    expect(r1.remaining).toBe(0);
    expect(await listDemandIds(dir)).toEqual(["UC-2026-0001"]);
    expect(await readDemand("UC-2026-0001", dir)).toContain("UC-2026-0001");
    expect(await pendingRows({ baseDir: dir })).toEqual([]);

    const r2 = await flushPending({ baseDir: dir });
    expect(r2.committed).toBe(0);
    expect(r2.remaining).toBe(0);
  });
});
