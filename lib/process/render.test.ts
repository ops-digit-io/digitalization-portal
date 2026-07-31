/**
 * The prompt-library renderer. The interesting rule is what happens to a line
 * whose values are missing — since prompts are now copied out and read by humans,
 * a dangling label is a visible defect, not a cosmetic one.
 */

import { describe, it, expect } from "vitest";
import { render } from "./render";

describe("render", () => {
  it("substitutes by name", () => {
    expect(render("Engagement: {{title}}", { title: "Order intake" })).toBe("Engagement: Order intake");
  });

  it("never leaks a placeholder for an unknown key", () => {
    expect(render("Owner: {{nobody}}", {})).not.toContain("{{");
  });

  it("drops the whole line — label included — when every placeholder on it is empty", () => {
    const out = render("Owner: {{owner}}\nChampion: {{champion}}\nUnit: {{unit}}", {
      owner: "J. Gabriel",
      champion: "",
      unit: "Ops",
    });
    expect(out).toBe("Owner: J. Gabriel\nUnit: Ops");
    // The point of the rule: no orphaned label.
    expect(out).not.toContain("Champion:");
  });

  it("treats whitespace as empty", () => {
    expect(render("Champion: {{champion}}", { champion: "   " })).toBe("");
  });

  it("keeps a line where at least one placeholder carried a value", () => {
    expect(render("{{a}} / {{b}}", { a: "x", b: "" })).toBe("x / ");
  });

  it("leaves literal lines alone, blank ones included", () => {
    expect(render("Head\n\nBody", {})).toBe("Head\n\nBody");
  });

  it("renders numbers and zero, which are values and not absence", () => {
    expect(render("Step {{n}} of 14", { n: 0 })).toBe("Step 0 of 14");
    expect(render("Weight {{w}} %", { w: 30 })).toBe("Weight 30 %");
  });

  it("drops a whole optional block line, e.g. the gate question of a non-gate section", () => {
    const tpl = "Purpose: {{description}}\nGate question (this section is a gate): {{gateQuestion}}";
    expect(render(tpl, { description: "…", gateQuestion: undefined })).toBe("Purpose: …");
  });
});
