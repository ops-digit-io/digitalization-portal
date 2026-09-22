/**
 * The trace store, against both backends.
 *
 * The properties that matter are not "it round-trips": they are that recording
 * can never break the run it describes, that a stored trace still says what was
 * WITHHELD and why (the reason the record exists at all), and that a cut is
 * visible — truncated evidence that looks complete is worse than none.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LocalTraceStore,
  KvTraceStore,
  recordTrace,
  listTraces,
  getTrace,
  trimTrace,
  newRecordId,
  isRecordId,
  getTraceStore,
  tracesDurable,
  MAX_DETAIL_CHARS,
  MAX_STEPS,
  type TraceRecord,
} from "./trace-store.js";
import type { Trace } from "./trace.js";

const KV = { KV_REST_API_URL: "https://kv.example.com", KV_REST_API_TOKEN: "t" };

const trace = (over: Partial<Trace> = {}): Trace => ({
  id: "trace-chat-UC-2026-0001",
  session: "jane@example.com",
  provider: "anthropic",
  live: true,
  toolsOffered: ["portfolio-query"],
  toolsWithheld: [{ name: "start-poc", reason: "session lacks the required capability" }],
  steps: [{ index: 0, kind: "model", label: "model turn", detail: "the answer", usage: { input: 10, output: 5 } }],
  totalUsage: { input: 10, output: 5 },
  startedAt: "2026-09-22T13:45:01.000Z",
  finishedAt: "2026-09-22T13:45:04.000Z",
  ...over,
});

const record = (id: string, over: Partial<TraceRecord> = {}): TraceRecord => ({
  recordId: id,
  feature: "agent.chat",
  date: id.slice(0, 10),
  trace: trace(),
  ...over,
});

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "traces-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

describe("record ids", () => {
  it("sort chronologically as plain strings, so newest-first is a reverse sort", () => {
    const early = newRecordId(new Date("2026-09-22T08:00:00Z"), () => "aaaaaa");
    const late = newRecordId(new Date("2026-09-22T19:30:00Z"), () => "aaaaaa");
    const nextDay = newRecordId(new Date("2026-09-23T01:00:00Z"), () => "aaaaaa");
    expect([late, nextDay, early].sort()).toEqual([early, late, nextDay]);
  });

  it("carry their own day, so a record can be fetched without scanning", () => {
    expect(newRecordId(new Date("2026-09-22T08:00:00Z"), () => "abc123")).toBe("2026-09-22-080000-abc123");
  });

  it("accepts only the shape it mints — ids reach the filesystem and KV", () => {
    expect(isRecordId("2026-09-22-080000-abc123")).toBe(true);
    expect(isRecordId("../../etc/passwd")).toBe(false);
    expect(isRecordId("2026-09-22-080000-abc123/../x")).toBe(false);
    expect(isRecordId("")).toBe(false);
  });
});

describe("trimming", () => {
  it("cuts a runaway detail and says that it cut it", () => {
    const long = "x".repeat(MAX_DETAIL_CHARS + 500);
    const [step] = trimTrace(trace({ steps: [{ index: 0, kind: "tool_result", label: "portfolio-query", detail: long }] })).steps;
    expect(step!.detail!.length).toBeLessThan(long.length);
    expect(step!.detail).toContain("[cut: 500 more characters]");
  });

  it("caps runaway steps and leaves a note where the rest were", () => {
    const many = Array.from({ length: MAX_STEPS + 12 }, (_, i) => ({ index: i, kind: "note" as const, label: `step ${i}` }));
    const trimmed = trimTrace(trace({ steps: many }));
    expect(trimmed.steps).toHaveLength(MAX_STEPS + 1);
    expect(trimmed.steps.at(-1)!.label).toContain("[cut: 12 more steps]");
  });

  it("leaves a short trace exactly as it was", () => {
    const t = trace();
    expect(trimTrace(t)).toEqual(t);
  });
});

describe("the local store", () => {
  it("round-trips a run, withheld tools and all", async () => {
    const store = new LocalTraceStore(dir);
    await store.save(record("2026-09-22-080000-abc123"));
    const back = await store.get("2026-09-22-080000-abc123");
    expect(back!.trace.toolsWithheld).toEqual([{ name: "start-poc", reason: "session lacks the required capability" }]);
    expect(back!.trace.session).toBe("jane@example.com");
  });

  it("lists newest first and honours the limit", async () => {
    const store = new LocalTraceStore(dir);
    for (const id of ["2026-09-21-090000-aaaaaa", "2026-09-22-080000-bbbbbb", "2026-09-22-190000-cccccc"]) {
      await store.save(record(id));
    }
    expect((await store.list()).map((r) => r.recordId)).toEqual([
      "2026-09-22-190000-cccccc",
      "2026-09-22-080000-bbbbbb",
      "2026-09-21-090000-aaaaaa",
    ]);
    expect(await store.list(1)).toHaveLength(1);
  });

  it("returns nothing rather than throwing for an unknown or malformed id", async () => {
    const store = new LocalTraceStore(dir);
    expect(await store.get("2026-09-22-080000-nothere")).toBeNull();
    expect(await store.get("../secrets")).toBeNull();
    expect(await store.list()).toEqual([]); // no directory yet
  });
});

describe("the KV store", () => {
  /** A tiny in-memory stand-in for the REST endpoint: hashes and one set. */
  function stubKv() {
    const hashes = new Map<string, Map<string, string>>();
    const days = new Set<string>();
    const run = (cmd: string[]): unknown => {
      const [op, key, ...rest] = cmd;
      if (op === "HSET") {
        const h = hashes.get(key!) ?? new Map();
        h.set(rest[0]!, rest[1]!);
        hashes.set(key!, h);
        return 1;
      }
      if (op === "SADD") return days.add(rest[0]!), 1;
      if (op === "SREM") return days.delete(rest[0]!), 1;
      if (op === "SMEMBERS") return [...days];
      if (op === "HGETALL") return [...(hashes.get(key!) ?? new Map())].flat();
      if (op === "HGET") return hashes.get(key!)?.get(rest[0]!) ?? null;
      return 1; // EXPIRE and friends
    };
    vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as string[] | string[][];
      const isPipeline = url.endsWith("/pipeline");
      const result = isPipeline ? (body as string[][]).map((c) => ({ result: run(c) })) : { result: run(body as string[]) };
      return { ok: true, status: 200, json: async () => result } as unknown as Response;
    });
    return { hashes, days };
  }

  it("round-trips through day buckets", async () => {
    stubKv();
    const store = new KvTraceStore(KV);
    await store.save(record("2026-09-22-080000-abc123"));
    expect((await store.get("2026-09-22-080000-abc123"))!.feature).toBe("agent.chat");
    expect((await store.list()).map((r) => r.recordId)).toEqual(["2026-09-22-080000-abc123"]);
  });

  it("orders across and within days, newest first", async () => {
    stubKv();
    const store = new KvTraceStore(KV);
    for (const id of ["2026-09-21-090000-aaaaaa", "2026-09-22-080000-bbbbbb", "2026-09-22-190000-cccccc"]) {
      await store.save(record(id));
    }
    expect((await store.list()).map((r) => r.recordId)).toEqual([
      "2026-09-22-190000-cccccc",
      "2026-09-22-080000-bbbbbb",
      "2026-09-21-090000-aaaaaa",
    ]);
  });

  it("drops a day whose bucket has expired, so the day set stays bounded", async () => {
    const kv = stubKv();
    const store = new KvTraceStore(KV);
    await store.save(record("2026-09-22-080000-abc123"));
    kv.hashes.clear(); // the retention window passed; the hash is gone, the day isn't
    expect(await store.list()).toEqual([]);
    expect([...kv.days]).toEqual([]);
  });
});

describe("recording", () => {
  it("persists a finished run and hands back its id", async () => {
    const id = await recordTrace(trace(), { feature: "agent.chat", at: new Date("2026-09-22T13:45:04Z"), env: {}, baseDir: dir });
    expect(id).toMatch(/^2026-09-22-134504-/);
    expect((await listTraces(10, {}, dir))[0]!.feature).toBe("agent.chat");
    expect((await getTrace(id!, {}, dir))!.trace.id).toBe("trace-chat-UC-2026-0001");
  });

  it("swallows a failing store — a trace write never breaks the traced run", async () => {
    // A regular file where the store wants a directory: the write cannot succeed.
    const blocked = join(dir, "blocked");
    await writeFile(blocked, "not a directory", "utf8");
    const id = await recordTrace(trace(), { feature: "agent.chat", env: {}, baseDir: blocked });
    expect(id).toBeNull();
  });

  it("reads back nothing rather than throwing when the store is unreachable", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("KV unreachable");
    });
    expect(await listTraces(10, KV)).toEqual([]);
    expect(await getTrace("2026-09-22-080000-abc123", KV)).toBeNull();
  });
});

describe("backend selection", () => {
  it("uses KV when configured and the local mirror otherwise", () => {
    expect(getTraceStore(KV).kind).toBe("kv");
    expect(getTraceStore({}, dir).kind).toBe("local");
  });

  it("reports durability honestly, because a local store is ephemeral in production", () => {
    expect(tracesDurable(KV)).toBe(true);
    expect(tracesDurable({})).toBe(false);
  });
});
