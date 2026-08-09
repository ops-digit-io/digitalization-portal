/**
 * Reading the mesh for steering, not just for navigation.
 *
 * `mesh-graph.ts` already surfaces the structural faults (dangling, contradiction)
 * and `orphans`/`duplicateClusters`. This module adds the two questions a Digital
 * leader asks OF a healthy graph: where are the gaps, and what is the blast radius.
 * Pure over a built `MeshGraph`, so both are unit-tested without a corpus.
 */

import { orphans, duplicateClusters, type MeshGraph, type MeshNode } from "./mesh-graph.js";
import type { MeshRef } from "./mesh.js";
import type { ReferenceKind, Relation } from "./references.js";

const key = (r: MeshRef): string => `${r.kind}:${r.id.toLowerCase()}`;

export interface Gap {
  node: MeshNode;
  /** The expected kinds this demand has no edge to. */
  missing: ReferenceKind[];
}

/**
 * Demands missing a link the portfolio expects — a champion who carries it, a
 * persona it serves. A gap is not an error (the graph is sound); it is work a demand
 * nobody owns, or that names no user, is exactly what steering wants surfaced.
 */
export function meshGaps(graph: MeshGraph, expect: ReferenceKind[] = ["champion", "persona"]): Gap[] {
  const near = new Map<string, Set<ReferenceKind>>();
  const touch = (k: string, kind: ReferenceKind) => {
    const s = near.get(k) ?? new Set<ReferenceKind>();
    s.add(kind);
    near.set(k, s);
  };
  for (const e of graph.edges) {
    touch(key(e.from), e.to.kind);
    touch(key(e.to), e.from.kind);
  }
  const gaps: Gap[] = [];
  for (const n of graph.nodes) {
    if (n.kind !== "demand") continue;
    const have = near.get(key(n)) ?? new Set<ReferenceKind>();
    const missing = expect.filter((k) => !have.has(k));
    if (missing.length) gaps.push({ node: n, missing });
  }
  return gaps.sort((a, b) => b.missing.length - a.missing.length || a.node.id.localeCompare(b.node.id));
}

/**
 * A compact, BOUNDED summary of the portfolio graph — small enough to sit in the
 * analyst's system prompt beside the org digest, so the analyst reasons over the
 * portfolio's SHAPE (its duplicates, its orphans, the demands nobody owns) and not
 * just the row list. Pure over a built graph; returns "" for an empty corpus so the
 * analyst degrades to "no mesh" rather than carrying an empty header. It is a
 * derivative of the corpus, never a source of truth — the header says so.
 */
export function meshDigest(graph: MeshGraph, opts: { sample?: number } = {}): string {
  if (graph.nodes.length === 0) return "";
  const sample = opts.sample ?? 5;

  const byKind = new Map<ReferenceKind, number>();
  for (const n of graph.nodes) byKind.set(n.kind, (byKind.get(n.kind) ?? 0) + 1);
  const kinds = [...byKind.entries()].sort((a, b) => b[1] - a[1]).map(([k, c]) => `${c} ${k}`).join(", ");

  const dupes = duplicateClusters(graph);
  const orph = orphans(graph);
  const gaps = meshGaps(graph);

  const lines: string[] = [
    "=== PORTFOLIO MESH (derived context graph) ===",
    "A read-only map derived from the corpus — the portfolio's shape and where it is thin. Use it to spot connections, duplicates and unlinked work; it is a derivative of the record, never a source of truth.",
    "",
    `Nodes: ${graph.nodes.length} (${kinds}). Edges: ${graph.edges.length}.`,
  ];
  if (dupes.length) {
    const eg = dupes.slice(0, sample).map((c) => c.map((r) => r.id).join("≈")).join("; ");
    lines.push(`Duplicate clusters: ${dupes.length} — ${eg}.`);
  }
  if (orph.length) {
    const eg = orph.slice(0, sample).map((n) => `${n.kind}:${n.id}`).join(", ");
    lines.push(`Orphans (no links either way): ${orph.length} — e.g. ${eg}.`);
  }
  if (gaps.length) {
    const eg = gaps.slice(0, sample).map((g) => g.node.id).join(", ");
    lines.push(`Demands missing a champion/persona link: ${gaps.length} — e.g. ${eg}.`);
  }
  return lines.join("\n").trim();
}

/** Relations by which one artifact's fate reaches another. */
const IMPACT: Relation[] = ["depends-on", "part-of", "blocks", "supersedes"];

/**
 * Blast radius — everything affected if `focus` changes or is killed.
 *
 * Directional, and deliberately so: `A depends-on B` means B's fate reaches A, so
 * from B we reach A (inbound depends-on / part-of). `X blocks Y` and `X supersedes Y`
 * reach Y forward (outbound). The transitive closure of those is what a kill/park
 * decision actually touches. `focus` is a `kind:id` key; the focus itself is excluded.
 */
export function blastRadius(graph: MeshGraph, focus: string): MeshNode[] {
  const start = focus.toLowerCase();
  const nodeByKey = new Map(graph.nodes.map((n) => [key(n), n] as const));
  const reached = new Set<string>([start]);
  let frontier = [start];
  while (frontier.length) {
    const next: string[] = [];
    for (const e of graph.edges) {
      if (!e.relation || !IMPACT.includes(e.relation)) continue;
      const from = key(e.from);
      const to = key(e.to);
      // Forward for blocks/supersedes (from → to); backward for depends-on/part-of.
      const forward = e.relation === "blocks" || e.relation === "supersedes";
      const [src, dst] = forward ? [from, to] : [to, from];
      if (frontier.includes(src) && !reached.has(dst)) {
        reached.add(dst);
        next.push(dst);
      }
    }
    frontier = next;
  }
  reached.delete(start);
  return [...reached].map((k) => nodeByKey.get(k)).filter((n): n is MeshNode => n !== undefined);
}
