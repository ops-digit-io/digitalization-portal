import { describe, it, expect } from "vitest";
import { applyScope, applyFilter, paginate } from "./query.js";
import { getProjectionStore } from "../projection/store.js";
import { verifyGithubSignature } from "../projection/webhook.js";
import { createHmac } from "node:crypto";
import type { RegistryRow } from "../registry.js";

const rows: RegistryRow[] = [
  { id: "UC-2026-0001", title: "Scrap alerts", stage: "S1", lane: "data_ai", plant: "DE-ALD", requester: "a@x.com" },
  { id: "UC-2026-0002", title: "Shift handover", stage: "S2", lane: "transform", plant: "SK-PUC", requester: "b@x.com" },
  { id: "UC-2026-0003", title: "Tender copilot", stage: "S4", lane: "data_ai", plant: "DE-ALD", requester: "a@x.com", status: "active" },
  { id: "UC-2026-0004", title: "Old idea", stage: "S2", lane: "run", plant: "DE-ALD", status: "parked" },
];

describe("applyScope", () => {
  it("triage → only S1/S2", () => {
    expect(applyScope(rows, "triage").map((r) => r.id)).toEqual(["UC-2026-0001", "UC-2026-0002", "UC-2026-0004"]);
  });
  it("mine → matches the requester case-insensitively; empty requester → none", () => {
    expect(applyScope(rows, "mine", "A@X.com").map((r) => r.id)).toEqual(["UC-2026-0001", "UC-2026-0003"]);
    expect(applyScope(rows, "mine", "")).toEqual([]);
  });
  it("all → everything", () => {
    expect(applyScope(rows, "all")).toHaveLength(4);
  });
});

describe("applyFilter", () => {
  it("filters by field and free-text search over id+title", () => {
    expect(applyFilter(rows, { lane: "data_ai" }).map((r) => r.id)).toEqual(["UC-2026-0001", "UC-2026-0003"]);
    expect(applyFilter(rows, { plant: "DE-ALD", stage: "S2" }).map((r) => r.id)).toEqual(["UC-2026-0004"]);
    expect(applyFilter(rows, { search: "copilot" }).map((r) => r.id)).toEqual(["UC-2026-0003"]);
    expect(applyFilter(rows, { search: "0002" }).map((r) => r.id)).toEqual(["UC-2026-0002"]);
  });
});

describe("paginate", () => {
  it("slices pages and clamps out-of-range", () => {
    expect(paginate(rows, 1, 2).rows.map((r) => r.id)).toEqual(["UC-2026-0001", "UC-2026-0002"]);
    expect(paginate(rows, 2, 2).rows.map((r) => r.id)).toEqual(["UC-2026-0003", "UC-2026-0004"]);
    const over = paginate(rows, 99, 2);
    expect(over.page).toBe(2);
    expect(over.pageCount).toBe(2);
  });
});

describe("getProjectionStore", () => {
  it("returns null without KV config (→ direct read)", () => {
    expect(getProjectionStore({})).toBeNull();
  });
  it("returns a KV store when configured", () => {
    expect(getProjectionStore({ KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "t" })?.kind).toBe("kv");
  });
});

describe("verifyGithubSignature", () => {
  const secret = "s3cret";
  const body = '{"repository":{"name":"du-demands"}}';
  const good = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  it("accepts a correct signature and rejects tampering", () => {
    expect(verifyGithubSignature(body, good, secret)).toBe(true);
    expect(verifyGithubSignature(body + " ", good, secret)).toBe(false);
    expect(verifyGithubSignature(body, "sha256=deadbeef", secret)).toBe(false);
    expect(verifyGithubSignature(body, null, secret)).toBe(false);
  });
});
