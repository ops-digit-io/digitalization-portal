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
});
