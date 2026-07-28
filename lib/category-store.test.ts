import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  normalizeCategoryList, seedFor, getCategories, getAllCategories, saveCategories,
  categoriesEditable, isCategoryKind, CATEGORY_SEED,
  blockedPlantRemovals, plantScopeGroup, PROTECTED_PLANTS,
} from "./category-store.js";
import { PLANTS, DOMAINS } from "./demand.js";

describe("normalizeCategoryList", () => {
  it("trims, drops empties, and de-duplicates case-insensitively (first spelling wins)", () => {
    expect(normalizeCategoryList([" DE-ALD ", "de-ald", "", "  ", "SK-PUC"])).toEqual(["DE-ALD", "SK-PUC"]);
  });

  it("rejects values with table/newline characters or that are over-long", () => {
    expect(normalizeCategoryList(["ok", "a|b", "c\nd", "x".repeat(41)])).toEqual(["ok"]);
  });

  it("preserves order", () => {
    expect(normalizeCategoryList(["c", "a", "b"])).toEqual(["c", "a", "b"]);
  });
});

describe("seed", () => {
  it("seeds from the original hardcoded constants (determinism values preserved)", () => {
    expect(seedFor("plant")).toEqual([...PLANTS]);
    expect(seedFor("domain")).toEqual([...DOMAINS]);
    expect(CATEGORY_SEED.plant).toContain("DE-ALD");
  });

  it("isCategoryKind guards the kind", () => {
    expect(isCategoryKind("plant")).toBe(true);
    expect(isCategoryKind("domain")).toBe(true);
    expect(isCategoryKind("lane")).toBe(false);
  });
});

describe("without KV configured (offline / local / test)", () => {
  const saved = { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
  beforeEach(() => { delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN; });
  afterEach(() => {
    if (saved.url !== undefined) process.env.KV_REST_API_URL = saved.url; else delete process.env.KV_REST_API_URL;
    if (saved.token !== undefined) process.env.KV_REST_API_TOKEN = saved.token; else delete process.env.KV_REST_API_TOKEN;
  });

  it("serves the seed for reads", async () => {
    expect(await getCategories("plant")).toEqual([...PLANTS]);
    const all = await getAllCategories();
    expect(all.domain).toEqual([...DOMAINS]);
  });

  it("reports not editable and refuses writes with a clear reason", async () => {
    expect(categoriesEditable()).toBe(false);
    const res = await saveCategories("plant", ["DE-ALD", "NEW-1"]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/KV_REST_API/);
  });

  it("refuses an empty list even before the backend check", async () => {
    const res = await saveCategories("plant", ["   ", ""]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/at least one/i);
  });
});

describe("plant ↔ RBAC coupling & removal guards", () => {
  it("maps a plant to its RBAC scope group", () => {
    expect(plantScopeGroup("DE-ALD")).toBe("DU-Portal-Champions-DE-ALD");
  });

  it("blocks removing a plant still used by a demand", () => {
    const blocked = blockedPlantRemovals(["DE-ALD", "SK-PUC", "US-GRV"], ["DE-ALD"], ["SK-PUC"]);
    expect(blocked).toContain("SK-PUC"); // in use → blocked
    expect(blocked).not.toContain("US-GRV"); // not in use → removable
  });

  it("blocks removing the protected ALL scope even when unused", () => {
    expect(PROTECTED_PLANTS.has("ALL")).toBe(true);
    const blocked = blockedPlantRemovals(["DE-ALD", "ALL"], ["DE-ALD"], []);
    expect(blocked).toContain("ALL");
  });

  it("allows removing an unused, unprotected plant", () => {
    expect(blockedPlantRemovals(["DE-ALD", "OLD-1"], ["DE-ALD"], ["DE-ALD"])).toEqual([]);
  });

  it("adding a plant is never blocked", () => {
    expect(blockedPlantRemovals(["DE-ALD"], ["DE-ALD", "NEW-1"], ["DE-ALD"])).toEqual([]);
  });
});
