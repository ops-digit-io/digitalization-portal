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
import { loadCorpus, repoDocForDemand } from "./mesh-corpus";
import { buildGraph, duplicateClusters } from "./mesh-graph";

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
    for (const kind of ["demand", "requirement", "process", "persona", "champion", "skill", "playbook", "repo"]) {
      expect(counts, `counts is missing the "${kind}" kind`).toHaveProperty(kind);
    }
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
