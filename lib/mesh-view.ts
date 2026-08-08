/**
 * Views OF the whole-corpus graph, for the `/mesh` page — filtering, focusing on
 * one artifact's neighbourhood, and a styled Mermaid rendering that reads as a
 * graph rather than a hairball.
 *
 * `lib/mesh-graph.ts` builds and validates the graph; this module never re-reads
 * the corpus, it only reshapes a `MeshGraph` a reader is already looking at. Pure,
 * so every reshaping is unit-tested without a filesystem or a browser. The Mermaid
 * string it emits is styled by node KIND (shape + colour) with a legend, which is
 * what lets a person tell a persona from a demand at a glance.
 */

import { sameRef, type MeshEdge, type MeshRef } from "./mesh.js";
import type { MeshGraph, MeshNode } from "./mesh-graph.js";
import type { ReferenceKind, Relation } from "./references.js";

/** A reshaped slice of the graph — just what a rendering needs. */
export interface MeshView {
  nodes: MeshNode[];
  edges: MeshEdge[];
}

const key = (r: MeshRef): string => `${r.kind}:${r.id.toLowerCase()}`;

/** How each kind is drawn: a Mermaid shape and a categorical colour (theme-safe). */
export const KIND_STYLE: Record<ReferenceKind, { open: string; close: string; color: string; label: string }> = {
  demand: { open: "[", close: "]", color: "#2563eb", label: "Demand" },
  requirement: { open: "(", close: ")", color: "#7c3aed", label: "Requirements" },
  process: { open: "[[", close: "]]", color: "#0891b2", label: "Process" },
  persona: { open: "((", close: "))", color: "#059669", label: "Persona" },
  champion: { open: "{{", close: "}}", color: "#d97706", label: "Champion" },
  skill: { open: "([", close: "])", color: "#db2777", label: "Skill" },
  playbook: { open: ">", close: "]", color: "#4b5563", label: "Playbook" },
};

/**
 * Filter the graph. An empty/absent set means "no filter on that axis"; a set means
 * "keep only these". Kind is inclusive on EITHER endpoint — filtering to `demand`
 * keeps a demand→persona edge, so you still see how demands reach out — while
 * relation and source filter the edge itself. Nodes are those left with an edge.
 */
export function filterGraph(
  graph: MeshGraph,
  f: { kinds?: Set<ReferenceKind>; relations?: Set<Relation>; sources?: Set<MeshEdge["source"]> } = {},
): MeshView {
  const edges = graph.edges.filter((e) => {
    if (f.relations && f.relations.size && !(e.relation && f.relations.has(e.relation))) return false;
    if (f.sources && f.sources.size && !f.sources.has(e.source)) return false;
    if (f.kinds && f.kinds.size && !(f.kinds.has(e.from.kind) || f.kinds.has(e.to.kind))) return false;
    return true;
  });
  return { nodes: nodesOf(graph, edges), edges };
}

/**
 * One artifact's neighbourhood — every node within `depth` hops of `focus`, and the
 * edges among them. Undirected: "what is near this?" does not care which way an
 * arrow points. This is the read a person does before deciding anything near a case.
 */
export function egoGraph(graph: MeshGraph, focus: string, depth = 1): MeshView {
  const reached = new Set<string>([focus.toLowerCase()]);
  let frontier = new Set<string>([focus.toLowerCase()]);
  for (let d = 0; d < Math.max(0, depth); d++) {
    const next = new Set<string>();
    for (const e of graph.edges) {
      const a = key(e.from);
      const b = key(e.to);
      if (frontier.has(a) && !reached.has(b)) next.add(b);
      if (frontier.has(b) && !reached.has(a)) next.add(a);
    }
    for (const k of next) reached.add(k);
    frontier = next;
    if (next.size === 0) break;
  }
  const edges = graph.edges.filter((e) => reached.has(key(e.from)) && reached.has(key(e.to)));
  return { nodes: graph.nodes.filter((n) => reached.has(key(n))), edges };
}

/** The nodes that appear as an endpoint of any of `edges`, in the graph's order. */
function nodesOf(graph: MeshGraph, edges: readonly MeshEdge[]): MeshNode[] {
  const touched = new Set<string>();
  for (const e of edges) { touched.add(key(e.from)); touched.add(key(e.to)); }
  return graph.nodes.filter((n) => touched.has(key(n)));
}

const MERMAID_SAFE = /[^A-Za-z0-9_]/g;
const nodeId = (r: MeshRef): string => `${r.kind}_${r.id}`.replace(MERMAID_SAFE, "_");

/**
 * The view as Mermaid, styled by kind (shape + colour) with the focus node marked.
 * Isolated nodes are left out — they are answered by the "Unconnected" tile and only
 * add noise. Bounded so a large corpus stays legible; the omission is stated, never
 * silent.
 */
export function toMermaidView(view: MeshView, opts: { focus?: string; maxEdges?: number } = {}): string {
  const max = opts.maxEdges ?? 120;
  const shown = view.edges.slice(0, max);
  const drawn = new Set<string>();
  for (const e of shown) { drawn.add(key(e.from)); drawn.add(key(e.to)); }

  const lines = ["graph LR"];
  const kindsPresent = new Set<ReferenceKind>();

  for (const n of view.nodes) {
    if (!drawn.has(key(n))) continue;
    kindsPresent.add(n.kind);
    const s = KIND_STYLE[n.kind];
    const label = (n.title ?? n.id).replace(/"/g, "'");
    lines.push(`  ${nodeId(n)}${s.open}"${label}"${s.close}:::${n.kind}`);
  }
  for (const e of shown) {
    const arrow = e.source === "derived" ? "-.->" : "-->";
    const label = e.relation ? `|${e.relation}|` : "";
    lines.push(`  ${nodeId(e.from)} ${arrow}${label} ${nodeId(e.to)}`);
  }

  // classDef per kind actually drawn — coloured borders, theme-safe (fill stays the
  // theme's node colour, only the stroke is per-kind).
  for (const kind of kindsPresent) {
    lines.push(`  classDef ${kind} stroke:${KIND_STYLE[kind].color},stroke-width:2px;`);
  }
  if (opts.focus && drawn.has(opts.focus.toLowerCase())) {
    const fn = view.nodes.find((n) => key(n) === opts.focus!.toLowerCase());
    if (fn) lines.push(`  style ${nodeId(fn)} stroke-width:4px;`);
  }
  if (view.edges.length > shown.length) {
    lines.push(`  %% ${view.edges.length - shown.length} further edges omitted (maxEdges=${max})`);
  }
  return lines.join("\n");
}
