#!/usr/bin/env node
/**
 * Read the whole markdown corpus as a graph, and say whether it is a sound one.
 *
 * This is the thing that turns "the files can be read as a graph" from a hope into
 * a checkable property. It opens every artifact, builds one graph, and reports what
 * would otherwise be invisible — above all the reference that names nothing, which
 * from inside the portal is indistinguishable from a reference nobody wrote.
 *
 *   npm run mesh:check              report; exit 1 if the corpus is not sound
 *   npm run mesh:check -- --json    the graph as nodes + edges, for another tool
 *   npm run mesh:check -- --mermaid the graph as a diagram
 *   npm run mesh:check -- --warn    treat warnings as failures too
 *
 * It reads the working tree directly, so it needs no server. `lib/mesh-corpus.test.ts`
 * runs the same check inside `npm test`, the way `docs-coverage.test.ts` keeps the
 * generated maps honest — this script is the readable report and the exports.
 */

import { loadCorpus } from "../lib/mesh-corpus.js";
import { buildGraph, orphans, duplicateClusters, toGraphJson, toMermaid, type MeshIssue } from "../lib/mesh-graph.js";

const args = process.argv.slice(2);
const has = (f: string): boolean => args.includes(f);

const { docs, counts } = await loadCorpus();
const graph = buildGraph(docs);

if (has("--json")) {
  console.log(JSON.stringify(toGraphJson(graph), null, 2));
  process.exit(graph.sound ? 0 : 1);
}
if (has("--mermaid")) {
  console.log(toMermaid(graph));
  process.exit(graph.sound ? 0 : 1);
}

const errors = graph.issues.filter((i) => i.severity === "error");
const warnings = graph.issues.filter((i) => i.severity === "warning");

console.log("Context mesh — corpus check\n");
console.log(
  `  corpus   ${graph.nodes.length} nodes (${Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k}`)
    .join(", ") || "nothing loaded"})`,
);
console.log(`  edges    ${graph.edges.length} (${graph.edges.filter((e) => e.source === "authored").length} authored)`);

const loose = orphans(graph);
console.log(`  orphans  ${loose.length} node(s) with no edge in either direction`);

const clusters = duplicateClusters(graph);
if (clusters.length) {
  console.log(`\n  duplicate clusters — triage should merge each of these:`);
  for (const c of clusters) console.log(`    ${c.map((r) => r.id).join("  ≡  ")}`);
}

const show = (list: MeshIssue[], heading: string): void => {
  if (!list.length) return;
  console.log(`\n${heading}`);
  for (const i of list) {
    const where = `${i.at.kind} ${i.at.id}`;
    console.log(`  [${i.code}] ${where}\n      ${i.message}`);
  }
};

show(errors, `${errors.length} error(s) — the corpus does NOT read as a sound graph:`);
show(warnings, `${warnings.length} warning(s):`);

if (!errors.length && !warnings.length) console.log("\nNo issues. The corpus reads cleanly as a graph.");
else if (!errors.length) console.log("\nNo errors. The corpus reads as a sound graph.");

const failed = errors.length > 0 || (has("--warn") && warnings.length > 0);
process.exit(failed ? 1 : 0);
