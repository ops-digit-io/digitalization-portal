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
import { loadCorpus } from "./mesh-corpus";
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
});
