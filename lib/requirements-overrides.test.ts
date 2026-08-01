/**
 * The human-in-the-loop overlay over the AI requirements: add / edit / remove of
 * epics and stories, round-tripped through the demand README, and applied over a
 * regenerated baseline so the human's changes survive re-analysis.
 */

import { describe, it, expect } from "vitest";
import type { RequirementsDoc } from "./requirements.js";
import {
  emptyOverlay, parseOverrides, writeOverrides, applyOverrides,
  addEpic, updateEpic, removeEpic, addStory, updateStory, removeStory, restore,
  type OverlayResult, type RequirementsOverlay,
} from "./requirements-overrides.js";

const baseDoc = (): RequirementsDoc => ({
  epics: [
    { id: "E1", title: "Outcome", description: "The core outcome." },
    { id: "E2", title: "Reliability", description: "Make it dependable." },
  ],
  stories: [
    { id: "US-1", epic: "E1", persona: "planner", capability: "see the risk early", benefit: "act in time", acceptance: ["Given X, then Y."], priority: "must" },
    { id: "US-2", epic: "E2", persona: "operator", capability: "trust the number", benefit: "it fits the workflow", acceptance: [], priority: "should" },
  ],
  nfrs: [], assumptions: [], risks: [], openQuestions: [], outOfScope: [],
});

/** Assert an OverlayResult succeeded and narrow to the success branch. */
function ok(r: OverlayResult): { ok: true; overlay: RequirementsOverlay } {
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error(r.reason);
  return r;
}

describe("apply is a no-op with an empty overlay", () => {
  it("returns the document unchanged and marks everything AI", () => {
    const { doc, provenance } = applyOverrides(baseDoc(), emptyOverlay());
    expect(doc.epics).toHaveLength(2);
    expect(doc.stories).toHaveLength(2);
    expect(provenance["E1"]).toBe("ai");
    expect(provenance["US-1"]).toBe("ai");
  });
});

describe("add", () => {
  it("adds a human epic with a non-colliding id and marks it added", () => {
    const r = ok(addEpic(emptyOverlay(), { title: "Compliance", description: "Meet the standard." }));
    if (!r.ok) return;
    expect(r.overlay.epics.add[0]!.id).toBe("E-H1");
    const { doc, provenance } = applyOverrides(baseDoc(), r.overlay);
    expect(doc.epics.map((e) => e.id)).toEqual(["E1", "E2", "E-H1"]);
    expect(provenance["E-H1"]).toBe("added");
  });

  it("adds a human story under an epic", () => {
    const r = ok(addStory(emptyOverlay(), { epic: "E1", capability: "export the report", benefit: "share it", priority: "could", acceptance: ["a", "b"] }));
    if (!r.ok) return;
    const story = r.overlay.stories.add[0]!;
    expect(story.id).toBe("US-H1");
    const { doc } = applyOverrides(baseDoc(), r.overlay);
    expect(doc.stories.find((s) => s.id === "US-H1")?.epic).toBe("E1");
    expect(doc.stories.find((s) => s.id === "US-H1")?.acceptance).toEqual(["a", "b"]);
  });

  it("refuses an epic with no title and a story with no capability", () => {
    expect(addEpic(emptyOverlay(), { title: "  ", description: "x" }).ok).toBe(false);
    expect(addStory(emptyOverlay(), { epic: "E1", capability: "" }).ok).toBe(false);
    expect(addStory(emptyOverlay(), { epic: "", capability: "do a thing" }).ok).toBe(false);
  });

  it("never reuses an id after several adds", () => {
    let o = ok(addEpic(emptyOverlay(), { title: "A", description: "" })).overlay;
    o = ok(addEpic(o, { title: "B", description: "" })).overlay;
    expect(o.epics.add.map((e) => e.id)).toEqual(["E-H1", "E-H2"]);
  });
});

describe("edit", () => {
  it("patches a generated epic by id and marks it edited", () => {
    const r = ok(updateEpic(emptyOverlay(), "E1", { title: "Sharper outcome" }));
    if (!r.ok) return;
    const { doc, provenance } = applyOverrides(baseDoc(), r.overlay);
    expect(doc.epics.find((e) => e.id === "E1")?.title).toBe("Sharper outcome");
    expect(doc.epics.find((e) => e.id === "E1")?.description).toBe("The core outcome."); // untouched
    expect(provenance["E1"]).toBe("edited");
  });

  it("patches a story's priority and acceptance", () => {
    const r = ok(updateStory(emptyOverlay(), "US-2", { priority: "must", acceptance: ["new one"] }));
    if (!r.ok) return;
    const { doc } = applyOverrides(baseDoc(), r.overlay);
    const s = doc.stories.find((x) => x.id === "US-2")!;
    expect(s.priority).toBe("must");
    expect(s.acceptance).toEqual(["new one"]);
  });

  it("edits a human-added item in place rather than accumulating an edit entry", () => {
    let o = ok(addEpic(emptyOverlay(), { title: "Draft", description: "" })).overlay;
    o = ok(updateEpic(o, "E-H1", { title: "Final" })).overlay;
    expect(o.epics.add[0]!.title).toBe("Final");
    expect(Object.keys(o.epics.edit)).toHaveLength(0);
  });

  it("rejects an invalid priority and a blank capability", () => {
    expect(updateStory(emptyOverlay(), "US-1", { priority: "urgent" as never }).ok).toBe(false);
    expect(updateStory(emptyOverlay(), "US-1", { capability: "" }).ok).toBe(false);
  });
});

describe("remove & restore", () => {
  it("tombstones a generated epic and lists it as removed", () => {
    const r = ok(removeEpic(emptyOverlay(), "E2"));
    if (!r.ok) return;
    const { doc, removed } = applyOverrides(baseDoc(), r.overlay);
    expect(doc.epics.map((e) => e.id)).toEqual(["E1"]);
    expect(removed).toContainEqual({ id: "E2", kind: "epic", title: "Reliability" });
  });

  it("restore brings a tombstoned epic back", () => {
    let o = ok(removeEpic(emptyOverlay(), "E2")).overlay;
    o = ok(restore(o, "epic", "E2")).overlay;
    const { doc } = applyOverrides(baseDoc(), o);
    expect(doc.epics.map((e) => e.id)).toEqual(["E1", "E2"]);
  });

  it("removing a human-added story just drops it (no tombstone)", () => {
    let o = ok(addStory(emptyOverlay(), { epic: "E1", capability: "temp" })).overlay;
    o = ok(removeStory(o, "US-H1")).overlay;
    expect(o.stories.add).toHaveLength(0);
    expect(o.stories.remove).toHaveLength(0);
  });
});

describe("round-trip through the demand README", () => {
  it("survives write → parse unchanged", () => {
    let o = ok(addEpic(emptyOverlay(), { title: "Compliance", description: "Meet ISO." })).overlay;
    o = ok(updateStory(o, "US-1", { priority: "could" })).overlay;
    o = ok(removeEpic(o, "E2")).overlay;

    const readme = "# UC-2026-0007 · Something\n\n## State\n\nfoo\n\n## History\n\n- created\n";
    const written = writeOverrides(readme, o);
    // The section is present and the History section is preserved.
    expect(written).toContain("## Requirements Edits");
    expect(written).toContain("## History");
    expect(parseOverrides(written)).toEqual(o);
  });

  it("writing an empty overlay removes the section entirely", () => {
    const readme = "# UC\n\n## State\n\nx\n";
    const withSection = writeOverrides(readme, ok(addEpic(emptyOverlay(), { title: "T", description: "" })).overlay);
    expect(withSection).toContain("## Requirements Edits");
    const cleared = writeOverrides(withSection, emptyOverlay());
    expect(cleared).not.toContain("## Requirements Edits");
  });

  it("re-application survives regeneration: the same baseline ids re-bind the edits", () => {
    // Simulate re-analysis: a fresh baseDoc() parsed again, overlay re-applied.
    let o = ok(updateEpic(emptyOverlay(), "E1", { title: "Kept" })).overlay;
    o = ok(addStory(o, { epic: "E1", capability: "kept feature" })).overlay;
    const readme = writeOverrides("# UC\n\n## State\n\nx\n", o);
    const reparsed = parseOverrides(readme);
    const { doc, provenance } = applyOverrides(baseDoc(), reparsed);
    expect(doc.epics.find((e) => e.id === "E1")?.title).toBe("Kept");
    expect(provenance["E1"]).toBe("edited");
    expect(doc.stories.some((s) => s.capability === "kept feature")).toBe(true);
  });

  it("ignores a malformed overlay block rather than throwing", () => {
    const readme = "# UC\n\n## Requirements Edits\n\n```json\n{ not valid json\n```\n";
    expect(parseOverrides(readme)).toEqual(emptyOverlay());
  });
});
