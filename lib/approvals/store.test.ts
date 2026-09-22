/**
 * The two shelves. A pending decision must never expire — a queue that loses
 * items is worse than none, because people stop looking at it. A decided one
 * moves to a dated shelf that does expire, so the store stays bounded.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { KvApprovalStore, getApprovalStore, approvalsDurable, DECIDED_RETENTION_DAYS } from "./store.js";
import type { Proposal } from "./model.js";

const KV = { KV_REST_API_URL: "https://kv.example.com", KV_REST_API_TOKEN: "t" };

const proposal = (id: string, over: Partial<Proposal> = {}): Proposal => ({
  id,
  createdAt: `${id.slice(0, 10)}T08:00:00.000Z`,
  dept: "operations",
  lane: "poc-intake",
  authority: "execute-with-approval",
  tool: "start-poc",
  capability: "create_uc",
  input: { useCaseId: "UC-2026-0041" },
  preview: "Scaffold the PoC repo",
  basis: "The demand reached S4",
  proposedBy: "agent@example.com",
  status: "pending",
  ...over,
});

afterEach(() => vi.unstubAllGlobals());

/** In-memory stand-in for the REST endpoint, recording the commands it saw. */
function stubKv() {
  const hashes = new Map<string, Map<string, string>>();
  const sets = new Map<string, Set<string>>();
  const seen: string[][] = [];
  const run = (cmd: string[]): unknown => {
    seen.push(cmd);
    const [op, key, ...rest] = cmd;
    const hash = (k: string) => hashes.get(k) ?? hashes.set(k, new Map()).get(k)!;
    const set = (k: string) => sets.get(k) ?? sets.set(k, new Set()).get(k)!;
    if (op === "HSET") return hash(key!).set(rest[0]!, rest[1]!), 1;
    if (op === "HDEL") return hash(key!).delete(rest[0]!), 1;
    if (op === "HGET") return hash(key!).get(rest[0]!) ?? null;
    if (op === "HGETALL") return [...hash(key!)].flat();
    if (op === "SADD") return set(key!).add(rest[0]!), 1;
    if (op === "SREM") return set(key!).delete(rest[0]!), 1;
    if (op === "SMEMBERS") return [...set(key!)];
    return 1; // EXPIRE
  };
  vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
    const body = JSON.parse(init.body) as string[] | string[][];
    const isPipeline = url.endsWith("/pipeline");
    const result = isPipeline ? (body as string[][]).map((c) => ({ result: run(c) })) : { result: run(body as string[]) };
    return { ok: true, status: 200, json: async () => result } as unknown as Response;
  });
  return { hashes, sets, seen };
}

describe("the pending shelf", () => {
  it("never expires — nothing sets a TTL on it", async () => {
    const kv = stubKv();
    await new KvApprovalStore(KV).save(proposal("2026-09-22-080000-aaaaaa"));
    const expiries = kv.seen.filter((c) => c[0] === "EXPIRE").map((c) => c[1]);
    expect(expiries).not.toContain("approvals:pending");
  });

  it("is read oldest first", async () => {
    stubKv();
    const store = new KvApprovalStore(KV);
    for (const id of ["2026-09-22-190000-cccccc", "2026-09-21-090000-aaaaaa", "2026-09-22-080000-bbbbbb"]) {
      await store.save(proposal(id));
    }
    expect((await store.listPending()).map((p) => p.id)).toEqual([
      "2026-09-21-090000-aaaaaa",
      "2026-09-22-080000-bbbbbb",
      "2026-09-22-190000-cccccc",
    ]);
  });
});

describe("the decided shelf", () => {
  it("takes the item off the queue in the same write that files it", async () => {
    stubKv();
    const store = new KvApprovalStore(KV);
    const p = proposal("2026-09-22-080000-aaaaaa");
    await store.save(p);
    await store.save({ ...p, status: "approved", decidedBy: "forum@example.com", decidedAt: "2026-09-23T10:00:00.000Z" });

    expect(await store.listPending()).toEqual([]);
    expect((await store.listDecided()).map((d) => d.status)).toEqual(["approved"]);
    // Still findable by id, wherever it now lives.
    expect((await store.get("2026-09-22-080000-aaaaaa"))!.status).toBe("approved");
  });

  it("files by the day it was DECIDED, and expires that bucket", async () => {
    const kv = stubKv();
    const p = proposal("2026-09-22-080000-aaaaaa");
    await new KvApprovalStore(KV).save({ ...p, status: "rejected", reason: "no", decidedAt: "2026-09-25T10:00:00.000Z" });
    expect([...kv.hashes.keys()]).toContain("approvals:d:2026-09-25");
    const expiry = kv.seen.find((c) => c[0] === "EXPIRE" && c[1] === "approvals:d:2026-09-25");
    expect(Number(expiry![2])).toBe(DECIDED_RETENTION_DAYS * 24 * 60 * 60);
  });

  it("drops a day whose bucket has expired, so the index stays bounded", async () => {
    const kv = stubKv();
    const store = new KvApprovalStore(KV);
    await store.save({ ...proposal("2026-09-22-080000-aaaaaa"), status: "approved", decidedAt: "2026-09-22T10:00:00.000Z" });
    kv.hashes.clear(); // retention passed: the bucket is gone, the day index is not
    expect(await store.listDecided()).toEqual([]);
    expect([...(kv.sets.get("approvals:days") ?? [])]).toEqual([]);
  });
});

describe("backend selection", () => {
  it("uses KV when configured and the local mirror otherwise", () => {
    expect(getApprovalStore(KV).kind).toBe("kv");
    expect(getApprovalStore({}, "/tmp").kind).toBe("local");
  });

  it("reports durability honestly — a pending decision on an ephemeral disk is lost work", () => {
    expect(approvalsDurable(KV)).toBe(true);
    expect(approvalsDurable({})).toBe(false);
  });
});
