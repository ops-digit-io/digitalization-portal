import { describe, it, expect } from "vitest";
import { buildGraph, type MeshDocument } from "./mesh-graph.js";
import { meshGaps, blastRadius, meshDigest } from "./mesh-insights.js";

// UC-1 has a champion and a persona; UC-2 has neither; UC-3 has only a champion.
const corpus: MeshDocument[] = [
  { kind: "demand", id: "UC-2026-0001", title: "Full", markdown: "## Related\n\n- champion:C-01 — carries this\n- persona:P-01 — the user\n" },
  { kind: "demand", id: "UC-2026-0002", title: "Bare" },
  { kind: "demand", id: "UC-2026-0003", title: "Half", markdown: "## Related\n\n- champion:C-01 — carries this\n" },
  { kind: "champion", id: "C-01", title: "Lead" },
  { kind: "persona", id: "P-01", title: "Operator" },
];
const graph = buildGraph(corpus);

describe("meshGaps", () => {
  it("flags demands missing a champion and/or persona, worst first", () => {
    const gaps = meshGaps(graph);
    const byId = new Map(gaps.map((g) => [g.node.id, g.missing]));
    expect(byId.get("UC-2026-0001")).toBeUndefined(); // fully linked
    expect(byId.get("UC-2026-0002")).toEqual(["champion", "persona"]); // missing both
    expect(byId.get("UC-2026-0003")).toEqual(["persona"]); // has champion, missing persona
    expect(gaps[0]!.node.id).toBe("UC-2026-0002"); // worst gap first
  });

  it("only judges demands, and respects the expected-kinds list", () => {
    const gaps = meshGaps(graph, ["champion"]);
    expect(gaps.every((g) => g.node.kind === "demand")).toBe(true);
    expect(gaps.map((g) => g.node.id)).toEqual(["UC-2026-0002"]); // only the one with no champion
  });
});

describe("blastRadius", () => {
  // UC-0011 depends-on UC-0010; UC-0012 depends-on UC-0011. Killing 0010 affects both.
  const dep: MeshDocument[] = [
    { kind: "demand", id: "UC-2026-0010", title: "A" },
    { kind: "demand", id: "UC-2026-0011", title: "B", markdown: "## Related\n\n- UC-2026-0010 — depends on, needs it\n" },
    { kind: "demand", id: "UC-2026-0012", title: "C", markdown: "## Related\n\n- UC-2026-0011 — depends on, needs it\n" },
  ];
  const g = buildGraph(dep);

  it("reaches everything transitively downstream of the focus", () => {
    const affected = blastRadius(g, "demand:UC-2026-0010").map((n) => n.id).sort();
    expect(affected).toEqual(["UC-2026-0011", "UC-2026-0012"]);
  });

  it("a leaf that nothing depends on has an empty blast radius", () => {
    expect(blastRadius(g, "demand:UC-2026-0012")).toEqual([]);
  });
});

describe("meshDigest", () => {
  it("summarises the portfolio shape — counts, orphans, and unlinked demands", () => {
    const d = meshDigest(graph);
    expect(d).toContain("PORTFOLIO MESH");
    expect(d).toMatch(/Nodes: \d+/);
    // UC-2 has no champion/persona → surfaced as a gap.
    expect(d).toContain("UC-2026-0002");
    expect(d).toContain("derivative of the record, never a source of truth");
  });

  it("returns an empty string for an empty corpus (analyst degrades to no-mesh)", () => {
    expect(meshDigest(buildGraph([]))).toBe("");
  });

  it("reports duplicate clusters when present", () => {
    const dupes = buildGraph([
      { kind: "demand", id: "UC-2026-0001", title: "A", markdown: "## Related\n\n- UC-2026-0002 — duplicate of\n" },
      { kind: "demand", id: "UC-2026-0002", title: "B" },
    ]);
    expect(meshDigest(dupes)).toContain("Duplicate clusters:");
  });
});
