import { describe, expect, it } from "vitest";
import { isPortalMember, resolveSession } from "./session.js";

describe("resolveSession", () => {
  it("maps base groups to roles with no scope", () => {
    const s = resolveSession("u@example.com", ["DU-Portal-Triage"]);
    expect(s.roles).toEqual(["triage"]);
    expect(s.scopes).toEqual([]);
  });

  it("maps a suffixed champion group to a plant-scoped role", () => {
    const s = resolveSession("c@example.com", ["DU-Portal-Champions-DE-ALD"]);
    expect(s.roles).toEqual(["champion"]);
    expect(s.scopes).toEqual(["DE-ALD"]);
  });

  it("accumulates multiple roles and multiple plant scopes", () => {
    const s = resolveSession("m@example.com", [
      "DU-Portal-Champions-DE-ALD",
      "DU-Portal-Champions-SK-PUC",
      "DU-Portal-Reviewers",
    ]);
    expect(new Set(s.roles)).toEqual(new Set(["champion", "reviewer"]));
    expect(new Set(s.scopes)).toEqual(new Set(["DE-ALD", "SK-PUC"]));
  });

  it("ignores unknown groups", () => {
    const s = resolveSession("x@example.com", ["Some-Other-Group", "", "  "]);
    expect(s.roles).toEqual([]);
    expect(isPortalMember(s)).toBe(false);
  });

  it("a resolved member is recognised as such", () => {
    expect(isPortalMember(resolveSession("a@example.com", ["DU-Portal-Admins"]))).toBe(true);
  });

  describe("known-plant validation (new plant means new RBAC)", () => {
    it("grants a plant scope only for a known plant", () => {
      const s = resolveSession("c@example.com", ["DU-Portal-Champions-DE-ALD"], ["DE-ALD", "SK-PUC"]);
      expect(s.roles).toEqual(["champion"]);
      expect(s.scopes).toEqual(["DE-ALD"]);
    });

    it("grants the role but NO scope for an unknown plant (until it is added)", () => {
      const s = resolveSession("c@example.com", ["DU-Portal-Champions-XX-NEW"], ["DE-ALD"]);
      expect(s.roles).toEqual(["champion"]); // membership is real
      expect(s.scopes).toEqual([]); // scope goes live only once XX-NEW is a known plant
    });

    it("stores the plant's canonical spelling, not the raw suffix", () => {
      const s = resolveSession("c@example.com", ["DU-Portal-Champions-de-ald"], ["DE-ALD"]);
      expect(s.scopes).toEqual(["DE-ALD"]);
    });

    it("accepts any suffix when knownPlants is omitted (backward-compatible)", () => {
      const s = resolveSession("c@example.com", ["DU-Portal-Champions-ANY"]);
      expect(s.scopes).toEqual(["ANY"]);
    });
  });
});
