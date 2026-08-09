/**
 * The context mesh — the reference graph, and the half of it nobody writes down.
 *
 * `lib/references.ts` is the grammar for edges a human authors. This module is the
 * graph they form, and it exists mainly for the **inverse**: a persona is cited by
 * requirements that the persona document knows nothing about, and a process
 * diagnosis spawns demands that carry no way back to it. Those relations are real
 * whether or not anyone recorded them from both ends, so the mesh records them
 * once and inverts them here rather than asking two documents to stay in sync.
 *
 * Edges come from two places, and the difference is shown in the UI rather than
 * smoothed over:
 *
 * - **authored** — someone wrote it in a `## Related` section. It carries a stated
 *   reason and a human stands behind it.
 * - **derived** — the portal already knew it from structured data (an engagement's
 *   demand list, a requirement's persona citations, a demand's named people). It
 *   is as reliable as the field it came from and no more.
 *
 * Everything here is pure: edges in, graph out. The I/O that collects them lives in
 * `lib/mesh-store.ts`, so the traversal can be tested without a filesystem.
 */

import { RELATION_INVERSE, type Reference, type ReferenceKind, type Relation } from "./references.js";

export type EdgeSource = "authored" | "derived";

/** One end of an edge. */
export interface MeshRef {
  kind: ReferenceKind;
  id: string;
}

export interface MeshEdge {
  from: MeshRef;
  to: MeshRef;
  /** Why the edge exists, in words. Empty is allowed but makes for a poor mesh. */
  note: string;
  source: EdgeSource;
  /** The typed relation, when the edge has one. Queryable; the note is not. */
  relation?: Relation;
}

/** A node's title, for rendering an edge as something other than an id. */
export type TitleLookup = (ref: MeshRef) => string | undefined;

/** One side of a node's neighbourhood. */
export interface Neighbour {
  kind: ReferenceKind;
  id: string;
  note: string;
  source: EdgeSource;
  /**
   * The relation as read FROM THIS NODE. On an inbound edge it is the inverse of
   * what the other document wrote: if A says it supersedes B, then on B's page the
   * neighbour A is "superseded by" — stating it the other way round would be false.
   */
  relation?: Relation;
  /** The target's own title when the portal knows it, else undefined. */
  title?: string;
}

export interface Neighbourhood {
  /** Edges this artifact declares — what it points at. */
  outbound: Neighbour[];
  /** Edges pointing here from elsewhere — what cites it. The half nobody writes. */
  inbound: Neighbour[];
}

const key = (r: MeshRef): string => `${r.kind}:${r.id.toLowerCase()}`;

/** Same artifact, whatever the case of the id. */
export function sameRef(a: MeshRef, b: MeshRef): boolean {
  return a.kind === b.kind && a.id.toLowerCase() === b.id.toLowerCase();
}

/**
 * Turn a document's authored references into edges from that document.
 * The subject is passed in because a `## Related` section never names its owner.
 */
export function edgesFrom(subject: MeshRef, refs: readonly Reference[], source: EdgeSource = "authored"): MeshEdge[] {
  return refs
    .map((r) => ({
      from: subject,
      to: { kind: r.kind, id: r.id },
      note: r.note,
      source,
      ...(r.relation ? { relation: r.relation } : {}),
    }))
    // A self-edge is always a mistake and would render as an artifact citing itself.
    .filter((e) => !sameRef(e.from, e.to));
}

/**
 * Collapse duplicates, preferring the edge a human stands behind.
 *
 * The same relation legitimately arrives twice — a process engagement lists a
 * demand it created (derived) and someone also writes it into `## Related`
 * (authored). Showing it twice is noise; showing the derived one is a loss, since
 * the authored one carries the reason. So: authored wins, and between two of the
 * same source the one with a note wins.
 */
export function dedupeEdges(edges: readonly MeshEdge[]): MeshEdge[] {
  const best = new Map<string, MeshEdge>();
  for (const e of edges) {
    if (sameRef(e.from, e.to)) continue;
    const k = `${key(e.from)}->${key(e.to)}`;
    const prev = best.get(k);
    if (!prev) { best.set(k, e); continue; }
    const better =
      (prev.source === "derived" && e.source === "authored") ||
      (prev.source === e.source && prev.note.trim() === "" && e.note.trim() !== "");
    if (better) best.set(k, e);
  }
  return [...best.values()];
}

/**
 * A node's neighbourhood in both directions.
 *
 * Inbound is computed by scanning rather than stored, for the same reason the
 * digest is regenerated rather than cached: an index that can go stale silently is
 * worse than one that is recomputed, and the funnel this runs over is thousands of
 * rows, not millions. When it stops being true, this is the one function to change.
 */
export function neighbourhood(edges: readonly MeshEdge[], subject: MeshRef, title?: TitleLookup): Neighbourhood {
  const out: Neighbour[] = [];
  const inb: Neighbour[] = [];
  for (const e of edges) {
    if (sameRef(e.from, subject)) {
      out.push({ ...e.to, note: e.note, source: e.source, ...rel(e.relation), ...titleOf(title, e.to) });
    } else if (sameRef(e.to, subject)) {
      // Read from this end, the relation is the other document's inverted.
      inb.push({
        ...e.from,
        note: e.note,
        source: e.source,
        ...rel(e.relation ? RELATION_INVERSE[e.relation] : undefined),
        ...titleOf(title, e.from),
      });
    }
  }
  return { outbound: sortNeighbours(out), inbound: sortNeighbours(inb) };
}

function rel(relation: Relation | undefined): { relation?: Relation } {
  return relation ? { relation } : {};
}

function titleOf(title: TitleLookup | undefined, ref: MeshRef): { title?: string } {
  const t = title?.(ref);
  return t ? { title: t } : {};
}

/**
 * Kind first (so a page groups cleanly), then id. Deliberately NOT by source:
 * a reader wants all the demands together, not the authored ones above the
 * derived ones.
 */
const KIND_ORDER: ReferenceKind[] = ["demand", "requirement", "process", "persona", "champion", "skill", "playbook", "repo", "department", "lane", "tool"];
function sortNeighbours(ns: Neighbour[]): Neighbour[] {
  return [...ns].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.id.localeCompare(b.id),
  );
}

/** Group a side of a neighbourhood by kind, in the display order above. */
export function byKind(ns: readonly Neighbour[]): { kind: ReferenceKind; items: Neighbour[] }[] {
  const groups = new Map<ReferenceKind, Neighbour[]>();
  for (const n of ns) {
    const list = groups.get(n.kind);
    if (list) list.push(n);
    else groups.set(n.kind, [n]);
  }
  return KIND_ORDER.filter((k) => groups.has(k)).map((kind) => ({ kind, items: groups.get(kind)! }));
}

/**
 * Collapse reciprocal edges for display.
 *
 * A→B and B→A are genuinely two edges and the graph keeps both — but when A is the
 * page you are on, the same artifact appearing under "References" and again under
 * "Referenced by" reads as two relationships when there is one. The declared side
 * wins, because an edge someone wrote carries a reason and its mirror is usually
 * the derived restatement of it.
 *
 * This is a view concern, deliberately kept out of `neighbourhood` so the API and
 * any future graph view still see the full, honest edge set.
 */
export function collapseReciprocal(n: Neighbourhood): Neighbourhood {
  const declared = new Set(n.outbound.map((o) => key(o)));
  return { outbound: n.outbound, inbound: n.inbound.filter((i) => !declared.has(key(i))) };
}

/**
 * Edges whose target does not exist. A mesh that points at deleted artifacts is
 * worse than no mesh — it reads as coverage while sending people to a 404 — so the
 * portal can surface these the way the board surfaces "needs attention".
 */
export function danglingEdges(edges: readonly MeshEdge[], exists: (ref: MeshRef) => boolean): MeshEdge[] {
  return edges.filter((e) => !exists(e.to));
}
