/**
 * Reading the whole markdown corpus as one graph — and proving it is a sound one.
 *
 * `lib/mesh.ts` answers "what is next to this artifact?". That is enough to render
 * a panel and wrong for the question this module exists for: **can the corpus be
 * read as a graph at all?** A per-subject view cannot tell you that. It never sees
 * an edge pointing at a document that was deleted, never notices two documents
 * contradicting each other, and — worst of the three — never notices the reference
 * that was silently dropped because someone typed the target wrong.
 *
 * That last one is the failure a mesh cannot detect from the inside. A dropped edge
 * looks exactly like an edge that was never written, and the page renders happily
 * either way. So the corpus is validated from the outside, all of it at once, and
 * the checks are named rather than lumped into "invalid":
 *
 * | Issue | What it means | Severity |
 * |---|---|---|
 * | `unresolved` | a `## Related` line names no known kind — a typo eating an edge | error |
 * | `dangling` | the target does not exist in the corpus | error |
 * | `contradiction` | two documents state incompatible relations about the same pair | error |
 * | `duplicate-line` | the same target listed twice in one document | warning |
 * | `asymmetric` | only one end records a relation that both ends should | warning |
 * | `unverifiable` | a whole kind is absent, so its edges cannot be judged | warning |
 *
 * Errors mean the corpus does not read as a sound graph. Warnings mean it does, but
 * something is worth a human's attention. Everything here is pure — documents in,
 * graph and findings out — so the whole thing is testable without a filesystem.
 */

import {
  parseReferenceReport,
  RELATION_INVERSE,
  type ReferenceKind,
  type Relation,
} from "./references.js";
import { dedupeEdges, edgesFrom, sameRef, type MeshEdge, type MeshRef } from "./mesh.js";

/** One artifact of the corpus, as the graph builder needs it. */
export interface MeshDocument {
  kind: ReferenceKind;
  id: string;
  /** Display name. Falls back to the id when the document has no title. */
  title?: string;
  /** The document's markdown. Omit for a node that exists but holds no references
   *  (a champion in the register, a persona in the library). */
  markdown?: string;
  /** Edges the portal knows structurally rather than from the document's prose. */
  derived?: MeshEdge[];
}

export interface MeshNode {
  kind: ReferenceKind;
  id: string;
  title?: string;
  /** Edges leaving this node. */
  out: number;
  /** Edges arriving at this node. */
  in: number;
}

export type IssueCode = "unresolved" | "dangling" | "contradiction" | "duplicate-line" | "asymmetric" | "unverifiable";

export interface MeshIssue {
  code: IssueCode;
  severity: "error" | "warning";
  /** The document the problem was found in. */
  at: MeshRef;
  /** The other end, when the issue is about an edge. */
  target?: MeshRef;
  /** A sentence a human can act on. */
  message: string;
}

export interface MeshGraph {
  nodes: MeshNode[];
  edges: MeshEdge[];
  issues: MeshIssue[];
  /** True when no error-severity issue was found: the corpus reads as a sound graph. */
  sound: boolean;
}

const key = (r: MeshRef): string => `${r.kind}:${r.id.toLowerCase()}`;

/**
 * Relations that cannot both be true of the same pair. `duplicate` and `supersedes`
 * are the pair that matters: one says these are the same demand, the other says one
 * replaced the other, and triage does opposite things with each.
 */
function contradicts(a: Relation, b: Relation): boolean {
  if (a === b) return false;
  const both = new Set([a, b]);
  if (both.has("duplicate") && (both.has("supersedes") || both.has("superseded-by"))) return true;
  if (both.has("depends-on") && both.has("part-of")) return false; // compatible
  // A relation stated one way and its own inverse stated the same way is a
  // contradiction: A supersedes B and A superseded-by B cannot both hold.
  return RELATION_INVERSE[a] === b && RELATION_INVERSE[b] === a && a !== RELATION_INVERSE[a];
}

/** Relations where a missing counterpart is worth flagging (symmetric by nature). */
const SHOULD_BE_MUTUAL: Relation[] = ["duplicate", "related", "part-of"];

/**
 * Build the whole graph from the corpus and validate it.
 *
 * `docs` must be every artifact the mesh can name. A document missing from this
 * list is indistinguishable from one that was deleted, so a partial corpus produces
 * false `dangling` errors — which is the correct failure: silently treating unknown
 * targets as fine is how a broken mesh passes for a working one.
 */
export function buildGraph(docs: readonly MeshDocument[]): MeshGraph {
  const known = new Map<string, MeshDocument>();
  for (const d of docs) known.set(key(d), d);

  const edges: MeshEdge[] = [];
  const issues: MeshIssue[] = [];

  for (const doc of docs) {
    const subject: MeshRef = { kind: doc.kind, id: doc.id };

    if (doc.markdown !== undefined) {
      const { refs, unresolved } = parseReferenceReport(doc.markdown);
      for (const u of unresolved) {
        issues.push(
          u.reason === "unknown-kind"
            ? {
                code: "unresolved",
                severity: "error",
                at: subject,
                message: `"${u.line}" names no artifact the mesh knows — this line records no edge at all.`,
              }
            : {
                code: "duplicate-line",
                severity: "warning",
                at: subject,
                message: `"${u.line}" repeats a target already listed; only the first is kept.`,
              },
        );
      }
      edges.push(...edgesFrom(subject, refs));
    }

    for (const e of doc.derived ?? []) edges.push({ ...e, source: "derived" });
  }

  const all = dedupeEdges(edges);

  // Dangling: the target is not part of the corpus.
  //
  // With one exception that matters in practice. Skills and playbooks live in a
  // separate repository the deployment may not be able to reach, and a corpus that
  // loaded NO nodes of a kind cannot tell a deleted target from an unreachable
  // store. Reporting every such edge as dangling would be loud and wrong; reporting
  // none would be quiet and wrong. So a wholly absent kind is called out once, as
  // its own finding, and its edges are left unjudged.
  const loadedKinds = new Set(docs.map((d) => d.kind));
  const unverified = new Map<ReferenceKind, number>();

  for (const e of all) {
    if (known.has(key(e.to))) continue;
    if (!loadedKinds.has(e.to.kind)) {
      unverified.set(e.to.kind, (unverified.get(e.to.kind) ?? 0) + 1);
      continue;
    }
    issues.push({
      code: "dangling",
      severity: "error",
      at: e.from,
      target: e.to,
      message: `points at ${e.to.kind} ${e.to.id}, which is not in the corpus — the edge leads nowhere.`,
    });
  }

  for (const [kind, count] of unverified) {
    issues.push({
      code: "unverifiable",
      severity: "warning",
      at: { kind, id: "*" },
      message: `${count} edge(s) point at ${kind} artifacts, but the corpus loaded none of that kind — these targets could not be checked.`,
    });
  }

  // Contradiction and asymmetry: compare each pair's two directions.
  const byPair = new Map<string, MeshEdge[]>();
  for (const e of all) {
    const k = [key(e.from), key(e.to)].sort().join("|");
    const list = byPair.get(k);
    if (list) list.push(e);
    else byPair.set(k, [e]);
  }

  for (const pair of byPair.values()) {
    const [a, b] = pair;
    if (!a) continue;

    if (b && a.relation && b.relation) {
      // Read both from the same end before comparing, or every mutual pair looks
      // like a disagreement purely because it was written from opposite sides.
      const bFromA = sameRef(b.from, a.from) ? b.relation : RELATION_INVERSE[b.relation];
      if (contradicts(a.relation, bFromA)) {
        issues.push({
          code: "contradiction",
          severity: "error",
          at: a.from,
          target: a.to,
          message: `${a.from.id} says "${a.relation}" but ${b.from.id} says "${b.relation}" about the same pair — both cannot hold.`,
        });
      }
    }

    if (!b && a.relation && SHOULD_BE_MUTUAL.includes(a.relation) && a.source === "authored" && known.has(key(a.to))) {
      issues.push({
        code: "asymmetric",
        severity: "warning",
        at: a.to,
        target: a.from,
        message: `${a.from.id} records "${a.relation}" about ${a.to.id}, but ${a.to.id} does not say so in return.`,
      });
    }
  }

  // Node degrees, so a reader can see reach without walking the edge list.
  const nodes: MeshNode[] = docs.map((d) => {
    const ref: MeshRef = { kind: d.kind, id: d.id };
    return {
      kind: d.kind,
      id: d.id,
      ...(d.title ? { title: d.title } : {}),
      out: all.filter((e) => sameRef(e.from, ref)).length,
      in: all.filter((e) => sameRef(e.to, ref)).length,
    };
  });

  return { nodes, edges: all, issues, sound: !issues.some((i) => i.severity === "error") };
}

/** Nodes nothing references and that reference nothing — the corpus's dark matter. */
export function orphans(graph: MeshGraph): MeshNode[] {
  return graph.nodes.filter((n) => n.in === 0 && n.out === 0);
}

/**
 * Connected groups over `duplicate` edges.
 *
 * This is the mesh's flagship query, and the reason relations are typed rather than
 * prose: three demands each flagged a duplicate of the next, and triage needs to see
 * ONE cluster of three, not three unrelated pairs. Duplicate is symmetric, so the
 * groups are plain connected components.
 */
export function duplicateClusters(graph: MeshGraph): MeshRef[][] {
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let root = k;
    while (parent.get(root) && parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };
  const union = (x: string, y: string) => {
    const [rx, ry] = [find(x), find(y)];
    if (rx !== ry) parent.set(rx, ry);
  };

  const refs = new Map<string, MeshRef>();
  for (const e of graph.edges) {
    if (e.relation !== "duplicate") continue;
    for (const end of [e.from, e.to]) {
      const k = key(end);
      if (!parent.has(k)) parent.set(k, k);
      refs.set(k, end);
    }
    union(key(e.from), key(e.to));
  }

  const groups = new Map<string, MeshRef[]>();
  for (const [k, ref] of refs) {
    const root = find(k);
    const list = groups.get(root);
    if (list) list.push(ref);
    else groups.set(root, [ref]);
  }
  return [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => [...g].sort((a, b) => a.id.localeCompare(b.id)));
}

// ------------------------------------------------------------------ exports
//
// The corpus is the system of record, so the graph is always a derivative — these
// are views for other tools, never a second source of truth.

/** A plain node/edge document: what a graph database or a d3 view would ingest. */
export function toGraphJson(graph: MeshGraph): {
  nodes: { id: string; kind: ReferenceKind; label: string; in: number; out: number }[];
  edges: { from: string; to: string; relation?: Relation; source: string; note: string }[];
} {
  return {
    nodes: graph.nodes.map((n) => ({
      id: `${n.kind}:${n.id}`,
      kind: n.kind,
      label: n.title ?? n.id,
      in: n.in,
      out: n.out,
    })),
    edges: graph.edges.map((e) => ({
      from: `${e.from.kind}:${e.from.id}`,
      to: `${e.to.kind}:${e.to.id}`,
      ...(e.relation ? { relation: e.relation } : {}),
      source: e.source,
      note: e.note,
    })),
  };
}

const MERMAID_SAFE = /[^A-Za-z0-9_]/g;
const nodeId = (r: MeshRef): string => `${r.kind}_${r.id}`.replace(MERMAID_SAFE, "_");

/**
 * The graph as Mermaid, so it renders in the repo's own docs the way `api-map.md`
 * and `pages.md` already do — the portal's established way of showing a structure
 * that must not drift from the code.
 */
export function toMermaid(graph: MeshGraph, opts: { maxEdges?: number } = {}): string {
  const max = opts.maxEdges ?? 300;
  const shown = graph.edges.slice(0, max);
  const lines = ["graph LR"];

  for (const n of graph.nodes) {
    if (!shown.some((e) => sameRef(e.from, n) || sameRef(e.to, n))) continue;
    const label = (n.title ?? n.id).replace(/"/g, "'");
    lines.push(`  ${nodeId(n)}["${label}<br/><i>${n.kind}</i>"]`);
  }
  for (const e of shown) {
    // A derived edge is drawn dotted: the picture keeps the distinction the panel makes.
    const arrow = e.source === "derived" ? "-.->" : "-->";
    const label = e.relation ? `|${e.relation}|` : "";
    lines.push(`  ${nodeId(e.from)} ${arrow}${label} ${nodeId(e.to)}`);
  }
  if (graph.edges.length > shown.length) {
    lines.push(`  %% ${graph.edges.length - shown.length} further edges omitted (maxEdges=${max})`);
  }
  return lines.join("\n");
}
