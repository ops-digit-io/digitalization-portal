/**
 * The corpus really does read as a graph.
 *
 * `mesh-graph.test.ts` proves the builder is correct on documents it was handed.
 * This proves the *actual* markdown in this working tree can be loaded and is
 * sound — the same move `docs-coverage.test.ts` makes for the generated maps:
 * a property is only a fact if something checks it on every run.
 *
 * The one it exists for is `unresolved`. A `## Related` line that names nothing
 * records no edge, and from inside the portal that is indistinguishable from a line
 * nobody wrote — the page renders happily, the relation is simply gone. Nothing but
 * a whole-corpus pass can see it.
 *
 * `demands/` starts empty by design (see its README), so on a clean checkout there
 * is nothing to validate and the assertions below are trivially true. They earn
 * their keep in any tree that has captured demands: local development, a seeded
 * demo, and a deployment reading the real funnel.
 */

import { describe, it, expect } from "vitest";
import { loadCorpus, loadCorpusCached, clearCorpusCache, repoDocForDemand, playbookSkillEdges, stagePlaybooks, demandPlaybookEdges, toolPipelineEdges, ownershipEdges, demandToolEdges, declaredToolRefs, applicationDocs } from "./mesh-corpus";
import { buildGraph, duplicateClusters, orphans, type MeshDocument } from "./mesh-graph";
import { ALL_TILES } from "./launchpad";

describe("the markdown corpus reads as a graph", () => {
  it("loads without throwing, whatever is on disk", async () => {
    await expect(loadCorpus()).resolves.toBeDefined();
  });

  it("has no unresolved references — no line that silently records nothing", async () => {
    const { docs } = await loadCorpus();
    const unresolved = buildGraph(docs).issues.filter((i) => i.code === "unresolved");
    // The failure message is the fix: each entry names the document and the line.
    expect(unresolved.map((i) => `${i.at.kind} ${i.at.id}: ${i.message}`)).toEqual([]);
  });

  it("has no dangling edges among the kinds it actually loaded", async () => {
    const { docs } = await loadCorpus();
    const dangling = buildGraph(docs).issues.filter((i) => i.code === "dangling");
    expect(dangling.map((i) => `${i.at.id} → ${i.target?.kind} ${i.target?.id}`)).toEqual([]);
  });

  it("has no two documents contradicting each other", async () => {
    const { docs } = await loadCorpus();
    const clashes = buildGraph(docs).issues.filter((i) => i.code === "contradiction");
    expect(clashes.map((i) => i.message)).toEqual([]);
  });

  it("is sound overall", async () => {
    const { docs } = await loadCorpus();
    const graph = buildGraph(docs);
    expect(graph.sound, `run \`npm run mesh:check\` for the full report`).toBe(true);
  });

  it("builds duplicate clusters without looping on a cycle", async () => {
    // Duplicate edges routinely form cycles (A↔B, B↔C, C↔A). The union-find must
    // terminate on the real corpus, not just on the fixtures.
    const { docs } = await loadCorpus();
    expect(() => duplicateClusters(buildGraph(docs))).not.toThrow();
  });

  it("counts every asset kind the mesh can hold", async () => {
    const { counts } = await loadCorpus();
    // The keys must exist even at zero, so the graph view can list every kind and a
    // dropped store is a 0, not a silently missing category.
    for (const kind of ["demand", "requirement", "process", "persona", "champion", "skill", "playbook", "repo", "department", "lane", "application", "tool"]) {
      expect(counts, `counts is missing the "${kind}" kind`).toHaveProperty(kind);
    }
  });

  it("puts every app tool into the graph, and the org layer with it", async () => {
    const { counts } = await loadCorpus();
    // Tools are a fixed set (the launchpad tiles), always present.
    expect(counts.tool).toBeGreaterThan(20);
    // The bundled Department OS example ships at least one department and one lane.
    expect(counts.department).toBeGreaterThanOrEqual(1);
    expect(counts.lane).toBeGreaterThanOrEqual(1);
  });
});

describe("repoDocForDemand — scaffolded repos derived from PoC-stage demands", () => {
  it("is null before the PoC stage (no repo has been scaffolded yet)", () => {
    expect(repoDocForDemand({ id: "UC-2026-0041", title: "Scrap attribution", stage: "S3" })).toBeNull();
    expect(repoDocForDemand({ id: "UC-2026-0041", title: "Scrap attribution" })).toBeNull();
  });

  it("derives a repo node and a demand→repo edge from S4 onward", () => {
    const doc = repoDocForDemand({ id: "UC-2026-0041", title: "Scrap attribution", stage: "S4" });
    expect(doc).not.toBeNull();
    expect(doc!.kind).toBe("repo");
    expect(doc!.id).toBe("uc-2026-0041-scrap-attribution");
    const edge = doc!.derived?.[0];
    expect(edge?.from).toEqual({ kind: "demand", id: "UC-2026-0041" });
    expect(edge?.to).toEqual({ kind: "repo", id: "uc-2026-0041-scrap-attribution" });
    expect(edge?.source).toBe("derived");
  });

  it("a demand and its derived repo build as a sound two-node graph", () => {
    const doc = repoDocForDemand({ id: "UC-2026-0041", title: "Scrap attribution", stage: "S5" })!;
    const graph = buildGraph([{ kind: "demand", id: "UC-2026-0041", title: "Scrap attribution" }, doc]);
    expect(graph.sound).toBe(true);
    expect(graph.edges).toHaveLength(1);
    expect(graph.nodes.find((n) => n.kind === "repo")?.in).toBe(1);
  });
});

describe("playbookSkillEdges — the library is connected, not 67 orphans", () => {
  const skillIds = new Map([
    ["demand-classification", "demand-classification"],
    ["persona-analysis", "persona-analysis"],
  ]);

  it("derives one edge per known skill a playbook runs, dropping unknowns", () => {
    const edges = playbookSkillEdges("s1-intake", ["demand-classification", "persona-analysis", "made-up"], skillIds);
    expect(edges.map((e) => e.to.id)).toEqual(["demand-classification", "persona-analysis"]);
    expect(edges[0]!.from).toEqual({ kind: "playbook", id: "s1-intake" });
    expect(edges[0]!.source).toBe("derived");
  });

  it("connects the playbook and skill in the graph — neither is an orphan", () => {
    const docs: MeshDocument[] = [
      { kind: "skill", id: "demand-classification", title: "Classify" },
      { kind: "playbook", id: "s1-intake", title: "Intake", derived: playbookSkillEdges("s1-intake", ["demand-classification"], skillIds) },
    ];
    const g = buildGraph(docs);
    expect(g.sound).toBe(true);
    const looseIds = orphans(g).map((n) => n.id);
    expect(looseIds).not.toContain("s1-intake");
    expect(looseIds).not.toContain("demand-classification");
  });
});

describe("loadCorpusCached", () => {
  it("returns the same build within the TTL and rebuilds after a clear", async () => {
    clearCorpusCache();
    const a = await loadCorpusCached(1_000);
    const b = await loadCorpusCached(1_000 + 30_000); // still inside the 60s window
    expect(b).toBe(a); // same cached object, not re-read
    clearCorpusCache();
    const c = await loadCorpusCached(1_000);
    expect(c).not.toBe(a); // rebuilt after clear
  });
});

describe("bridge library ↔ funnel — demand → stage's playbook → its skills", () => {
  const playbooks = [{ name: "s1-intake" }, { name: "s2-triage" }, { name: "requirements-analysis" }];

  it("maps playbooks to stages by the sN- naming convention", () => {
    const byStage = stagePlaybooks(playbooks);
    expect(byStage.get("S1")).toEqual(["s1-intake"]);
    expect(byStage.get("S2")).toEqual(["s2-triage"]);
    expect(byStage.has("S3")).toBe(false); // requirements-analysis names no stage
  });

  it("links a demand to the playbook that governs its stage", () => {
    const byStage = stagePlaybooks(playbooks);
    const edges = demandPlaybookEdges("UC-2026-0041", "S1", byStage);
    expect(edges).toHaveLength(1);
    expect(edges[0]!.to).toEqual({ kind: "playbook", id: "s1-intake" });
    expect(edges[0]!.source).toBe("derived");
    expect(demandPlaybookEdges("UC-2026-0041", undefined, byStage)).toEqual([]);
  });

  it("joins the two clusters end to end: demand → playbook → skill", () => {
    const skillIds = new Map([["demand-classification", "demand-classification"]]);
    const byStage = stagePlaybooks(playbooks);
    const docs: MeshDocument[] = [
      { kind: "demand", id: "UC-2026-0041", title: "Scrap", derived: demandPlaybookEdges("UC-2026-0041", "S1", byStage) },
      { kind: "playbook", id: "s1-intake", title: "Intake", derived: playbookSkillEdges("s1-intake", ["demand-classification"], skillIds) },
      { kind: "skill", id: "demand-classification", title: "Classify" },
    ];
    const g = buildGraph(docs);
    expect(g.sound).toBe(true);
    expect(orphans(g)).toEqual([]); // nothing isolated — one connected chain
  });
});

describe("tools in the graph — the app as a connected overview", () => {
  it("gives every launchpad tile a place in the pipeline (no island tool)", () => {
    const byTool = toolPipelineEdges();
    const touched = new Set<string>();
    for (const [from, edges] of byTool) {
      touched.add(from);
      for (const e of edges) touched.add(e.to.id);
    }
    const missing = ALL_TILES.map((t) => t.id).filter((id) => !touched.has(id));
    expect(missing, `tools with no pipeline edge: ${missing.join(", ")}`).toEqual([]);
  });

  it("derives one ownership edge per managed artifact, from the tool", () => {
    const edges = ownershipEdges("catalog", "skill", ["demand-classification", "persona-analysis"], "manages this skill");
    expect(edges.map((e) => e.to.id)).toEqual(["demand-classification", "persona-analysis"]);
    expect(edges[0]!.from).toEqual({ kind: "tool", id: "catalog" });
    expect(edges[0]!.to.kind).toBe("skill");
    expect(edges[0]!.source).toBe("derived");
    expect(ownershipEdges("catalog", "skill", [], "x")).toEqual([]);
  });

  it("connects a tool to the skills it manages in a sound graph — neither is an orphan", () => {
    const docs: MeshDocument[] = [
      { kind: "skill", id: "demand-classification", title: "Classify" },
      { kind: "tool", id: "catalog", title: "Skills & Playbooks", derived: ownershipEdges("catalog", "skill", ["demand-classification"], "manages this skill") },
    ];
    const g = buildGraph(docs);
    expect(g.sound).toBe(true);
    const loose = orphans(g).map((n) => n.id);
    expect(loose).not.toContain("demand-classification");
    expect(loose).not.toContain("catalog");
  });
});

describe("the tools the company runs are in the graph too", () => {
  const index = new Map([
    ["power bi", "APP-026"],
    ["app-026", "APP-026"],
    ["uns broker", "uns-broker-hivemq"],
  ]);

  it("resolves a demand's declared tools to register nodes", () => {
    const refs = declaredToolRefs("## State\n\n- **Tools:** Power BI, UNS broker\n", index);
    expect(refs.map((r) => r.id)).toEqual(["APP-026", "uns-broker-hivemq"]);
  });

  it("keeps a name no register knows, so the edge points somewhere real", () => {
    const refs = declaredToolRefs("- **Tools:** Senseye Predictive Maintenance", index);
    expect(refs).toEqual([{ id: "senseye-predictive-maintenance", name: "Senseye Predictive Maintenance" }]);
  });

  it("derives one depends-on edge per tool, never two for the same one", () => {
    const edges = demandToolEdges("UC-2026-0041", "- **Tools:** Power BI, APP-026, Power BI", index);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      from: { kind: "demand", id: "UC-2026-0041" },
      to: { kind: "application", id: "APP-026" },
      relation: "depends-on",
      source: "derived",
    });
  });

  it("derives nothing from a demand that declares nothing", () => {
    expect(demandToolEdges("UC-1", "## Problem\n\nNo tools named here.\n", index)).toEqual([]);
  });

  it("names each tool node as the register names it", () => {
    const docs = applicationDocs([
      { id: "APP-026", tool: "Power BI" },
      { id: "", tool: "UNS broker (HiveMQ)" },
    ] as never);
    expect(docs.map((d) => `${d.id}:${d.title}`)).toEqual(["APP-026:Power BI", "uns-broker-hivemq:UNS broker (HiveMQ)"]);
    expect(docs.every((d) => d.kind === "application")).toBe(true);
  });

  it("puts whatever the register holds in the corpus, connected and sound", async () => {
    // The masters ship empty, so a fresh corpus has no tools — and must still be a
    // sound graph, with the kind counted at zero rather than missing.
    const { counts, docs } = await loadCorpus();
    expect(counts.application).toBeGreaterThanOrEqual(0);
    const graph = buildGraph(docs);
    expect(graph.sound).toBe(true);
    // The landscape owns every registered tool, so none of them floats.
    const loose = new Set(orphans(graph).map((n) => `${n.kind}:${n.id}`));
    expect([...loose].filter((k) => k.startsWith("application:"))).toEqual([]);
  });
});
