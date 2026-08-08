import { describe, it, expect } from "vitest";
import { safeDocSlug, docTitle } from "./docs.js";

describe("safeDocSlug", () => {
  it("accepts mixed-case, hyphenated, numeric doc names", () => {
    expect(safeDocSlug("01-portal-spec")).toBe("01-portal-spec");
    expect(safeDocSlug("ARCHITECTURE-intake")).toBe("ARCHITECTURE-intake");
  });
  it("rejects path traversal and separators", () => {
    for (const bad of ["../secret", "a/b", "a.b", "..", "foo.md", "a b", ""]) {
      expect(safeDocSlug(bad)).toBeNull();
    }
  });
});

describe("docTitle", () => {
  it("uses the first H1", () => {
    expect(docTitle("# Portal spec\n\nbody", "01-portal-spec")).toBe("Portal spec");
  });
  it("falls back to the slug when there is no H1", () => {
    expect(docTitle("no heading here", "13-security")).toBe("13-security");
  });
});
