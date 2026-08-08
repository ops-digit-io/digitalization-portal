import { describe, it, expect } from "vitest";
import { filterGraph, egoGraph, toMermaidView, toGraphData, KIND_STYLE } from "./mesh-view.js";
import { buildGraph, type MeshDocument } from "./mesh-graph.js";

// A small corpus: two duplicate demands, one depending on a third, a persona a demand cites.
const corpus: MeshDocument[] = [
  { kind: "demand", id: "UC-2026-0001", title: "Scrap attribution", markdown: "## Related\n\n- UC-2026-0002 — duplicate of, same thing\n- persona:P-03 — primary persona\n" },
  { kind: "demand", id: "UC-2026-0002", title: "Scrap dup", markdown: "## Related\n\n- UC-2026-0003 — depends on, needs the taxonomy\n" },
  { kind: "demand", id: "UC-2026-0003", title: "Taxonomy" },
  { kind: "persona", id: "P-03", title: "Line operator" },
];
const graph = buildGraph(corpus);

describe("filterGraph", () => {
  it("keeps only edges of a given relation", () => {
    const v = filterGraph(graph, { relations: new Set(["duplicate"]) });
    expect(v.edges).toHaveLength(1);
    expect(v.edges[0]!.relation).toBe("duplicate");
    expect(new Set(v.nodes.map((n) => n.id))).toEqual(new Set(["UC-2026-0001", "UC-2026-0002"]));
  });

  it("keeps edges touching a kind on either endpoint", () => {
    const v = filterGraph(graph, { kinds: new Set(["persona"]) });
    // The demand→persona edge survives; the persona endpoint is included.
    expect(v.edges).toHaveLength(1);
    expect(v.nodes.some((n) => n.kind === "persona")).toBe(true);
    expect(v.nodes.some((n) => n.id === "UC-2026-0001")).toBe(true);
  });

  it("no filter returns the whole graph's connected edges", () => {
    expect(filterGraph(graph).edges.length).toBe(graph.edges.length);
  });
});

describe("egoGraph", () => {
  it("depth 1 reaches immediate neighbours only", () => {
    const v = egoGraph(graph, "demand:UC-2026-0001", 1);
    const ids = new Set(v.nodes.map((n) => n.id));
    expect(ids.has("UC-2026-0001")).toBe(true);
    expect(ids.has("UC-2026-0002")).toBe(true); // duplicate neighbour
    expect(ids.has("P-03")).toBe(true); // persona neighbour
    expect(ids.has("UC-2026-0003")).toBe(false); // two hops away
  });

  it("depth 2 reaches the neighbour's neighbour", () => {
    const v = egoGraph(graph, "demand:UC-2026-0001", 2);
    expect(v.nodes.some((n) => n.id === "UC-2026-0003")).toBe(true);
  });
});

describe("toMermaidView", () => {
  it("emits shaped, kind-classed nodes and a classDef per kind present", () => {
    const mmd = toMermaidView(filterGraph(graph));
    expect(mmd.startsWith("graph LR")).toBe(true);
    expect(mmd).toMatch(/demand_UC_2026_0001\["Scrap attribution"\]:::demand/);
    expect(mmd).toMatch(/persona_P_03\(\("Line operator"\)\):::persona/);
    expect(mmd).toContain(`classDef demand stroke:${KIND_STYLE.demand.color}`);
    expect(mmd).toContain(`classDef persona stroke:${KIND_STYLE.persona.color}`);
  });

  it("marks the focus node and draws derived edges dotted", () => {
    const mmd = toMermaidView(egoGraph(graph, "demand:UC-2026-0001", 1), { focus: "demand:UC-2026-0001" });
    expect(mmd).toMatch(/style demand_UC_2026_0001 stroke-width:4px/);
  });

  it("bounds the edge count and states the omission", () => {
    const mmd = toMermaidView(filterGraph(graph), { maxEdges: 1 });
    expect(mmd).toMatch(/further edges omitted/);
  });
});

describe("toGraphData", () => {
  it("emits D3-shaped nodes/links keyed by kind:id, only for connected nodes", () => {
    const d = toGraphData(filterGraph(graph));
    // Every node key is the lower-cased kind:id the focus links use.
    expect(d.nodes.every((n) => n.id === n.id.toLowerCase())).toBe(true);
    expect(d.nodes.some((n) => n.id === "persona:p-03")).toBe(true);
    // Links use D3's source/target and carry the authored/derived distinction.
    const dup = d.links.find((l) => l.relation === "duplicate");
    expect(dup).toBeTruthy();
    expect(dup!.source).toBe("demand:uc-2026-0001");
    expect(dup!.authored).toBe(true);
    // A node the reader can click through to.
    expect(d.nodes.find((n) => n.id === "demand:uc-2026-0001")!.href).toContain("/uc/");
  });

  it("carries degree so the renderer can size by connectedness", () => {
    const d = toGraphData(filterGraph(graph));
    const first = d.nodes.find((n) => n.id === "demand:uc-2026-0001")!;
    expect(first.degree).toBeGreaterThan(0);
  });
});
