/**
 * Collecting the context mesh from the stores the portal already keeps.
 *
 * The design constraint here is a performance one, and it decides the shape of
 * everything below: `getFunnelRows` is a PROJECTION. It deliberately does not read
 * each demand's markdown, because at 14k cases that is the read the projection
 * exists to avoid. A mesh that scanned every document to find its edges would undo
 * that on every page view.
 *
 * So edges are collected from where they are already cheap:
 *
 * | Edge | Source | Cost |
 * |---|---|---|
 * | process → demand | the engagement's own `demands` list | metas only, small N |
 * | process → champion | engagement owner / champion, matched to the register | free |
 * | demand → champion | the row's requester / sponsor, matched to the register | free |
 * | demand → requirement | the case's artifact list | one dir read, subject only |
 * | anything → authored | the document's `## Related` section | one read, subject only |
 *
 * The one relation that cannot be had cheaply is **authored backlinks**: finding
 * every OTHER document whose `## Related` names this one means reading them all.
 * Rather than pretend otherwise, that scan is bounded by `AUTHORED_SCAN_LIMIT` and
 * the result carries `truncated`, so the UI can say the mesh looked at part of the
 * funnel instead of implying it looked at all of it. The permanent fix is to
 * materialise authored references into the funnel projection when a demand is
 * saved — the same move the reconciler already makes for state.
 */

import { listChampions } from "./champions-store.js";
import { readDemand, listArtifacts } from "./demands-store.js";
import { getFunnelRows } from "./funnel/query.js";
import * as processStore from "./process/store.js";
import { parseReferences } from "./references.js";
import {
  dedupeEdges,
  edgesFrom,
  neighbourhood,
  sameRef,
  type MeshEdge,
  type MeshRef,
  type Neighbourhood,
} from "./mesh.js";

/**
 * How many funnel documents an authored-backlink scan will open. Chosen to keep a
 * page render bounded rather than to be complete; `truncated` reports the shortfall.
 */
export const AUTHORED_SCAN_LIMIT = 250;

export interface LoadedMesh extends Neighbourhood {
  /** True when the authored-backlink scan hit its bound and stopped early. */
  truncated: boolean;
}

const norm = (s: string | undefined): string => (s ?? "").trim().toLowerCase();

/**
 * Cheap, complete edges: everything the portal already knows without opening a
 * demand document. Titles come along so the UI renders names rather than ids.
 */
async function derived(): Promise<{ edges: MeshEdge[]; titles: Map<string, string> }> {
  const [{ rows }, engagements, champions] = await Promise.all([
    getFunnelRows(),
    processStore.list().catch(() => []),
    listChampions().catch(() => []),
  ]);

  const edges: MeshEdge[] = [];
  const titles = new Map<string, string>();
  const put = (ref: MeshRef, title: string) => {
    if (title.trim()) titles.set(`${ref.kind}:${ref.id.toLowerCase()}`, title.trim());
  };

  // A champion is reachable by the address the register holds, and also by name —
  // engagements record people as names, the funnel records them as emails.
  const byPerson = new Map<string, string>();
  for (const c of champions) {
    put({ kind: "champion", id: c.id }, c.name || c.email);
    if (norm(c.email)) byPerson.set(norm(c.email), c.id);
    if (norm(c.name)) byPerson.set(norm(c.name), c.id);
  }

  for (const r of rows) {
    put({ kind: "demand", id: r.id }, r.title);
    const demand: MeshRef = { kind: "demand", id: r.id };
    for (const [person, role] of [
      [r.requester, "raised this demand"],
      [r.sponsor, "sponsors this demand"],
    ] as const) {
      const cid = byPerson.get(norm(person));
      if (cid) edges.push({ from: demand, to: { kind: "champion", id: cid }, note: role, source: "derived" });
    }
  }

  for (const m of engagements) {
    const engagement: MeshRef = { kind: "process", id: m.slug };
    put(engagement, m.title);
    // The relation that was previously prose only: the diagnosis records what it
    // was disassembled into, and the mesh inverts it so each demand shows its origin.
    for (const d of m.demands ?? []) {
      put({ kind: "demand", id: d.id }, d.title);
      edges.push({
        from: engagement,
        to: { kind: "demand", id: d.id },
        note: "cut out of this process diagnosis",
        source: "derived",
      });
    }
    for (const [person, role] of [
      [m.owner, "owns the process"],
      [m.champion, "champions the process"],
    ] as const) {
      const cid = byPerson.get(norm(person));
      if (cid) edges.push({ from: engagement, to: { kind: "champion", id: cid }, note: role, source: "derived" });
    }
  }

  return { edges, titles };
}

/** The subject's own edges: what its document declares, plus its artifacts. */
async function ownEdges(subject: MeshRef): Promise<MeshEdge[]> {
  if (subject.kind !== "demand") return [];
  const md = await readDemand(subject.id).catch(() => undefined);
  const edges = md ? edgesFrom(subject, parseReferences(md)) : [];

  const artifacts = await listArtifacts(subject.id).catch((): string[] => []);
  if (artifacts.includes("requirements")) {
    edges.push({
      from: subject,
      to: { kind: "requirement", id: subject.id },
      note: "standardized requirements derived from this intake",
      source: "derived",
    });
  }
  return edges;
}

/**
 * Authored backlinks — the bounded scan. Only demands are opened, and only until
 * the limit, because this is the one collection that costs a read per document.
 */
async function authoredBacklinks(subject: MeshRef): Promise<{ edges: MeshEdge[]; truncated: boolean }> {
  const { rows } = await getFunnelRows();
  const candidates = rows.filter((r) => !sameRef({ kind: "demand", id: r.id }, subject));
  const scan = candidates.slice(0, AUTHORED_SCAN_LIMIT);

  const found = await Promise.all(
    scan.map(async (r) => {
      const md = await readDemand(r.id).catch(() => undefined);
      if (!md) return [];
      return edgesFrom({ kind: "demand", id: r.id }, parseReferences(md)).filter((e) => sameRef(e.to, subject));
    }),
  );
  return { edges: found.flat(), truncated: candidates.length > scan.length };
}

/**
 * A subject's neighbourhood, both directions, ready to render.
 *
 * Never throws: every store is read defensively, because a mesh is an aid to
 * navigation and must never be the reason a demand page fails to open.
 */
export async function loadNeighbourhood(subject: MeshRef): Promise<LoadedMesh> {
  try {
    const [{ edges: base, titles }, own, back] = await Promise.all([
      derived(),
      ownEdges(subject),
      authoredBacklinks(subject),
    ]);
    const all = dedupeEdges([...base, ...own, ...back.edges]);
    const n = neighbourhood(all, subject, (ref) => titles.get(`${ref.kind}:${ref.id.toLowerCase()}`));
    return { ...n, truncated: back.truncated };
  } catch {
    return { outbound: [], inbound: [], truncated: false };
  }
}
