import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { enqueueDemand, flushPending, pendingRows, pendingStats, backoffSec, isDue, MAX_FLUSH_ATTEMPTS } from "./service.js";
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

describe("interim buffer — smart flush", () => {
  it("dedups an identical double-submit to the same id", async () => {
    const a = await enqueueDemand(2026, build, { baseDir: dir, dedupKey: "abc123" });
    const b = await enqueueDemand(2026, build, { baseDir: dir, dedupKey: "abc123" });
    expect(b.id).toBe(a.id);
    expect(b.deduped).toBe(true);
    expect((await pendingRows({ baseDir: dir })).length).toBe(1);
  });

  it("backs a failing entry off instead of retrying immediately, then dead-letters it", async () => {
    await enqueueDemand(2026, build, { baseDir: dir });
    const failCommit = async () => { throw new Error("git down"); };
    const t0 = new Date("2026-07-01T00:00:00.000Z");

    // First failure → backed off (retried), still counts as remaining, not failed.
    const r1 = await flushPending({ baseDir: dir, now: t0, commit: failCommit });
    expect(r1.committed).toBe(0);
    expect(r1.retried).toBe(1);
    expect(r1.remaining).toBe(1);
    expect(r1.failed).toBe(0);

    // Immediately re-flushing does nothing — the entry isn't due yet (backoff).
    const r2 = await flushPending({ baseDir: dir, now: t0, commit: failCommit });
    expect(r2.retried).toBe(0);

    // Drive it past MAX_FLUSH_ATTEMPTS with far-future clocks → dead-lettered.
    for (let i = 2; i <= MAX_FLUSH_ATTEMPTS; i++) {
      await flushPending({ baseDir: dir, now: new Date(t0.getTime() + i * 3_600_000), commit: failCommit });
    }
    const stats = await pendingStats({ baseDir: dir, now: new Date(t0.getTime() + 100 * 3_600_000) });
    expect(stats.failed).toBe(1);
    expect(stats.due).toBe(0); // dead-lettered entries aren't due

    // A dead-lettered entry is never committed by a later successful flush.
    const r3 = await flushPending({ baseDir: dir, now: new Date(t0.getTime() + 200 * 3_600_000) });
    expect(r3.committed).toBe(0);
    expect(await listDemandIds(dir)).toEqual([]);
  });

  it("pendingStats reports total/due/oldest", async () => {
    await enqueueDemand(2026, build, { baseDir: dir });
    const s = await pendingStats({ baseDir: dir });
    expect(s.total).toBe(1);
    expect(s.due).toBe(1);
    expect(s.failed).toBe(0);
    expect(s.oldestAgeSec).toBeGreaterThanOrEqual(0);
  });
});

describe("backoff helpers", () => {
  it("backoffSec grows exponentially and caps at 1h", () => {
    expect(backoffSec(1)).toBe(60);
    expect(backoffSec(2)).toBe(120);
    expect(backoffSec(3)).toBe(240);
    expect(backoffSec(20)).toBe(3600);
  });
  it("isDue respects status and nextAttemptAt", () => {
    const now = "2026-07-01T00:00:00.000Z";
    expect(isDue({ id: "x", markdown: "", createdAt: now, attempts: 0 }, now)).toBe(true);
    expect(isDue({ id: "x", markdown: "", createdAt: now, attempts: 1, nextAttemptAt: "2026-07-01T01:00:00.000Z" }, now)).toBe(false);
    expect(isDue({ id: "x", markdown: "", createdAt: now, attempts: 8, status: "failed" }, now)).toBe(false);
  });
});
