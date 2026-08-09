/**
 * Reading the corpus as a graph, and proving it is a sound one.
 *
 * The cases worth writing are the ones a per-subject view cannot see: the edge that
 * points at a deleted document, the two documents that disagree, and above all the
 * reference that was silently dropped — because a dropped edge and an edge nobody
 * wrote look identical from inside the mesh.
 */

import { describe, it, expect } from "vitest";
import {
  buildGraph,
  orphans,
  duplicateClusters,
  toGraphJson,
  toMermaid,
  type MeshDocument,
} from "./mesh-graph";

const related = (...lines: string[]) => `# Title\n\n## State\n\n- **Stage:** S1\n\n## Related\n\n${lines.join("\n")}\n\n## History\n`;

const demand = (id: string, ...lines: string[]): MeshDocument => ({
  kind: "demand",
  id,
  title: `Demand ${id}`,
  markdown: lines.length ? related(...lines) : "# Title\n\n## State\n\n- **Stage:** S1\n",
});

describe("buildGraph", () => {
  it("reads a corpus of markdown into nodes and edges", () => {
    const g = buildGraph([demand("UC-2026-0001", "- UC-2026-0002 — related, shares the taxonomy"), demand("UC-2026-0002")]);
    expect(g.sound).toBe(true);
    expect(g.nodes.map((n) => n.id).sort()).toEqual(["UC-2026-0001", "UC-2026-0002"]);
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0]).toMatchObject({ relation: "related", note: "shares the taxonomy", source: "authored" });
  });

  it("joins a demand to a Department OS lane it declares (org↔funnel edge, not dangling)", () => {
    // A demand that names a lane in its `## Related` links straight to the lane node.
    // No fabricated mapping — the edge exists only because the demand declared it.
    const g = buildGraph([
      demand("UC-2026-0001", "- lane:operations/connectivity-assessment — part-of, this lane owns the flow"),
      { kind: "lane", id: "operations/connectivity-assessment", title: "Connectivity assessment" },
    ]);
    expect(g.sound).toBe(true); // the lane node exists → the edge is not dangling
    const edge = g.edges.find((e) => e.to.kind === "lane");
    expect(edge).toMatchObject({ from: { kind: "demand", id: "UC-2026-0001" }, to: { kind: "lane", id: "operations/connectivity-assessment" } });
    expect(g.nodes.find((n) => n.id === "operations/connectivity-assessment")).toMatchObject({ in: 1 });
  });

  it("counts degree in both directions", () => {
    const g = buildGraph([demand("UC-2026-0001", "- UC-2026-0002 — related"), demand("UC-2026-0002", "- UC-2026-0003 — related"), demand("UC-2026-0003")]);
    expect(g.nodes.find((n) => n.id === "UC-2026-0002")).toMatchObject({ in: 1, out: 1 });
    expect(g.nodes.find((n) => n.id === "UC-2026-0003")).toMatchObject({ in: 1, out: 0 });
  });

  it("reports a typo that silently ate an edge", () => {
    // The failure the mesh cannot see from the inside: this line looks like a
    // reference, records nothing, and the page renders as if it were never written.
    const g = buildGraph([demand("UC-2026-0001", "- UC2026-0002 — malformed id"), demand("UC-2026-0002")]);
    expect(g.sound).toBe(false);
    const issue = g.issues.find((i) => i.code === "unresolved");
    expect(issue?.severity).toBe("error");
    expect(issue?.message).toContain("UC2026-0002");
  });

  it("reports an edge pointing at a document that is not there", () => {
    const g = buildGraph([demand("UC-2026-0001", "- UC-2026-0999 — related, long gone")]);
    expect(g.sound).toBe(false);
    const issue = g.issues.find((i) => i.code === "dangling");
    expect(issue).toMatchObject({ severity: "error", target: { kind: "demand", id: "UC-2026-0999" } });
  });

  it("reports two documents that contradict each other", () => {
    // One says these are the same demand; the other says one replaced the other.
    // Triage does opposite things with each, so this cannot be left to a reader.
    const g = buildGraph([
      demand("UC-2026-0001", "- UC-2026-0002 — duplicate of, same reason list"),
      demand("UC-2026-0002", "- UC-2026-0001 — supersedes, replaced by the new flow"),
    ]);
    expect(g.sound).toBe(false);
    expect(g.issues.some((i) => i.code === "contradiction")).toBe(true);
  });

  it("does not call an ordinary mutual pair a contradiction", () => {
    // Both ends saying "duplicate" is agreement, not disagreement — and reading the
    // second edge from the first's end is what makes the difference.
    const g = buildGraph([
      demand("UC-2026-0001", "- UC-2026-0002 — duplicate of"),
      demand("UC-2026-0002", "- UC-2026-0001 — duplicate of"),
    ]);
    expect(g.issues.filter((i) => i.code === "contradiction")).toHaveLength(0);
    expect(g.sound).toBe(true);
  });

  it("reads an inverse pair written from opposite ends as agreement", () => {
    const g = buildGraph([
      demand("UC-2026-0001", "- UC-2026-0002 — supersedes"),
      demand("UC-2026-0002", "- UC-2026-0001 — superseded by"),
    ]);
    expect(g.issues.filter((i) => i.code === "contradiction")).toHaveLength(0);
  });

  it("warns — not errors — when only one end records a mutual relation", () => {
    const g = buildGraph([demand("UC-2026-0001", "- UC-2026-0002 — duplicate of"), demand("UC-2026-0002")]);
    const issue = g.issues.find((i) => i.code === "asymmetric");
    expect(issue?.severity).toBe("warning");
    // A one-sided duplicate is still a readable graph.
    expect(g.sound).toBe(true);
  });

  it("warns on a repeated target and keeps the first", () => {
    const g = buildGraph([demand("UC-2026-0001", "- UC-2026-0002 — first", "- UC-2026-0002 — second"), demand("UC-2026-0002")]);
    expect(g.issues.find((i) => i.code === "duplicate-line")?.severity).toBe("warning");
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0]?.note).toBe("first");
  });

  it("calls a target dangling only when its kind was actually loaded", () => {
    // Zero personas in the corpus cannot distinguish a deleted persona from an
    // unreachable library, so the edge is left unjudged and the gap is named once.
    const noLibrary = buildGraph([demand("UC-2026-0001", "- persona:P-03 — the shift lead")]);
    expect(noLibrary.issues.find((i) => i.code === "unverifiable")?.severity).toBe("warning");
    expect(noLibrary.issues.some((i) => i.code === "dangling")).toBe(false);
    expect(noLibrary.sound).toBe(true);

    // With the library loaded, a missing persona IS a dangling edge.
    const missing = buildGraph([
      demand("UC-2026-0001", "- persona:P-99 — gone"),
      { kind: "persona", id: "P-03" },
    ]);
    expect(missing.sound).toBe(false);
    expect(missing.issues.find((i) => i.code === "dangling")?.target?.id).toBe("P-99");

    const present = buildGraph([demand("UC-2026-0001", "- persona:P-03 — the shift lead"), { kind: "persona", id: "P-03" }]);
    expect(present.sound).toBe(true);
  });

  it("counts unverifiable edges per kind rather than one issue per edge", () => {
    const g = buildGraph([demand("UC-2026-0001", "- skill:a — x", "- skill:b — y", "- playbook:c — z")]);
    const codes = g.issues.filter((i) => i.code === "unverifiable");
    expect(codes).toHaveLength(2); // one for skill, one for playbook
    expect(codes.find((i) => i.at.kind === "skill")?.message).toContain("2 edge(s)");
  });

  it("includes derived edges and marks them as such", () => {
    const g = buildGraph([
      { kind: "process", id: "downtime", derived: [{ from: { kind: "process", id: "downtime" }, to: { kind: "demand", id: "UC-2026-0001" }, note: "cut out here", source: "derived" }] },
      demand("UC-2026-0001"),
    ]);
    expect(g.edges[0]).toMatchObject({ source: "derived" });
    expect(g.sound).toBe(true);
  });

  it("handles an empty corpus and documents with no references", () => {
    expect(buildGraph([])).toMatchObject({ nodes: [], edges: [], issues: [], sound: true });
    expect(buildGraph([demand("UC-2026-0001")]).sound).toBe(true);
  });

  it("never throws on malformed documents", () => {
    const hostile: MeshDocument[] = [
      { kind: "demand", id: "UC-2026-0001", markdown: "## Related\n- \n- \n" },
      { kind: "demand", id: "UC-2026-0002", markdown: "#".repeat(400) },
      { kind: "demand", id: "UC-2026-0003", markdown: undefined },
    ];
    expect(() => buildGraph(hostile)).not.toThrow();
  });
});

describe("orphans", () => {
  it("finds nodes nothing references and that reference nothing", () => {
    const g = buildGraph([demand("UC-2026-0001", "- UC-2026-0002 — related"), demand("UC-2026-0002"), demand("UC-2026-0003")]);
    expect(orphans(g).map((n) => n.id)).toEqual(["UC-2026-0003"]);
  });
});

describe("duplicateClusters", () => {
  it("groups a chain of duplicates into ONE cluster, not a set of pairs", () => {
    // This is why relations are typed rather than prose: triage needs to see one
    // cluster of three, not three unrelated statements.
    const g = buildGraph([
      demand("UC-2026-0001", "- UC-2026-0002 — duplicate of"),
      demand("UC-2026-0002", "- UC-2026-0003 — duplicate of"),
      demand("UC-2026-0003"),
      demand("UC-2026-0009"),
    ]);
    const clusters = duplicateClusters(g);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.map((r) => r.id)).toEqual(["UC-2026-0001", "UC-2026-0002", "UC-2026-0003"]);
  });

  it("keeps separate duplicate groups separate", () => {
    const g = buildGraph([
      demand("UC-2026-0001", "- UC-2026-0002 — duplicate of"),
      demand("UC-2026-0002"),
      demand("UC-2026-0003", "- UC-2026-0004 — duplicate of"),
      demand("UC-2026-0004"),
    ]);
    expect(duplicateClusters(g)).toHaveLength(2);
  });

  it("ignores relations that are not duplicates", () => {
    const g = buildGraph([demand("UC-2026-0001", "- UC-2026-0002 — related"), demand("UC-2026-0002")]);
    expect(duplicateClusters(g)).toEqual([]);
  });
});

describe("exports", () => {
  const g = buildGraph([
    demand("UC-2026-0001", "- UC-2026-0002 — duplicate of, same list"),
    demand("UC-2026-0002"),
    { kind: "process", id: "downtime", title: "Downtime capture", derived: [{ from: { kind: "process", id: "downtime" }, to: { kind: "demand", id: "UC-2026-0001" }, note: "cut out here", source: "derived" }] },
  ]);

  it("emits a node/edge document another tool can ingest", () => {
    const json = toGraphJson(g);
    expect(json.nodes).toHaveLength(3);
    expect(json.nodes.find((n) => n.id === "process:downtime")?.label).toBe("Downtime capture");
    const dup = json.edges.find((e) => e.relation === "duplicate");
    expect(dup).toMatchObject({ from: "demand:UC-2026-0001", to: "demand:UC-2026-0002", source: "authored" });
  });

  it("emits Mermaid, distinguishing derived edges with a dotted arrow", () => {
    const m = toMermaid(g);
    expect(m.startsWith("graph LR")).toBe(true);
    expect(m).toContain("|duplicate|");
    expect(m).toContain("-.->"); // the derived edge
    expect(m).toContain("-->"); // the authored one
  });

  it("bounds the drawing and says what it left out", () => {
    const m = toMermaid(g, { maxEdges: 1 });
    expect(m).toContain("further edges omitted");
  });

  it("produces ids Mermaid can parse from awkward artifact ids", () => {
    const awkward = buildGraph([
      { kind: "skill", id: "demand/classification v2", markdown: "## Related\n\n- UC-2026-0001 — related\n" },
      demand("UC-2026-0001"),
    ]);
    const m = toMermaid(awkward);
    expect(m).not.toMatch(/[^\x20-\x7E\n]/); // no stray characters
    expect(m).toContain("skill_demand_classification_v2");
  });
});
