import { describe, it, expect } from "vitest";
import { toolFromPath, isKnownTool, toolLabel, isUiEventType } from "./portal-tools.js";

describe("toolFromPath", () => {
  it("maps the root to home and a segment to its tool", () => {
    expect(toolFromPath("/")).toBe("home");
    expect(toolFromPath("")).toBe("home");
    expect(toolFromPath("/process")).toBe("process");
    expect(toolFromPath("/champions")).toBe("champions");
  });

  it("attributes a deep path to its first segment — one tool, not one per record", () => {
    expect(toolFromPath("/process/order-intake/assess/D1")).toBe("process");
    expect(toolFromPath("/requirements/UC-2026-0007")).toBe("requirements");
    expect(toolFromPath("/admin/usage?days=90")).toBe("admin");
  });

  it("lower-cases and strips query/hash", () => {
    expect(toolFromPath("/Champions#top")).toBe("champions");
  });
});

describe("the taxonomy is the server-side allow-list", () => {
  it("knows the built-in tools and labels them", () => {
    expect(isKnownTool("process")).toBe(true);
    expect(isKnownTool("champions")).toBe(true);
    expect(toolLabel("process")).toBe("Process Funnel");
  });

  it("returns unknown ids unchanged as their own label", () => {
    expect(isKnownTool("not-a-tool")).toBe(false);
    expect(toolLabel("not-a-tool")).toBe("not-a-tool");
  });
});

describe("isUiEventType", () => {
  it("accepts the three interaction kinds and nothing else", () => {
    expect(isUiEventType("view")).toBe(true);
    expect(isUiEventType("click")).toBe(true);
    expect(isUiEventType("action")).toBe(true);
    expect(isUiEventType("keystroke")).toBe(false);
  });
});
