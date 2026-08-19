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
 * | demand → tool | the `- **Tools:**` line, in the scan already being done | free |
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
import { loadRegister, type LoadedRegister } from "./otx/register.js";
import { declaredTools, resolveToolName, toolNameIndex, toolNodeId } from "./otx/consolidate.js";
import { repoNameFor } from "./poc/scaffold.js";
import { STAGES, type Stage } from "./types.js";
import {
  dedupeEdges,
  edgesFrom,
  neighbourhood,
  type MeshEdge,
  type MeshRef,
  type Neighbourhood,
  type TitleLookup,
} from "./mesh.js";

/** A use case has earned its uc-* repo once it reaches the PoC stage (S4+). */
const hasScaffoldedRepo = (s?: Stage): boolean => s !== undefined && STAGES.indexOf(s) >= STAGES.indexOf("S4");

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
async function derived(register: LoadedRegister | null): Promise<{ edges: MeshEdge[]; titles: Map<string, string> }> {
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
    // The scaffolded uc-* repo is a real node (S4+); the edge is derived from stage,
    // computed from id+title without opening the document — so a repo shows in the
    // demand's neighbourhood the same way it shows on /mesh.
    if (hasScaffoldedRepo(r.stage)) {
      const repo = repoNameFor(r.id, r.title);
      put({ kind: "repo", id: repo }, repo);
      edges.push({ from: demand, to: { kind: "repo", id: repo }, note: "PoC repository scaffolded for this use case", source: "derived" });
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

  // Tools are nodes too, named as the register names them, so a demand's dependency
  // renders as "Power BI" rather than as an id.
  for (const t of register?.entries ?? []) put({ kind: "application", id: toolNodeId(t) }, t.tool);

  return { edges, titles };
}

/** The subject's own edges: what its document declares, plus its artifacts. */
async function ownEdges(subject: MeshRef): Promise<MeshEdge[]> {
  // A requirement is 1:1 with its demand; surface the parent edge when looked at from
  // the requirement's own page (the demand adds this too, but only for itself).
  if (subject.kind === "requirement") {
    const artifacts = await listArtifacts(subject.id).catch((): string[] => []);
    return artifacts.includes("requirements")
      ? [{ from: { kind: "demand", id: subject.id }, to: { kind: "requirement", id: subject.id }, note: "standardized requirements derived from this intake", source: "derived" }]
      : [];
  }
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

const refKey = (r: MeshRef): string => `${r.kind}:${r.id.toLowerCase()}`;

/**
 * The whole cheap edge set — the derived edges plus every authored edge from one
 * bounded scan of the funnel. It backs both the per-artifact neighbourhood and the
 * list-page mesh, and it is CACHED (below), so neither re-derives per request.
 */
export interface MeshEdges {
  edges: MeshEdge[];
  titles: Map<string, string>;
  /** True when the authored scan hit its bound and stopped early. */
  truncated: boolean;
  title: TitleLookup;
}

async function allAuthoredEdges(toolIndex: ReadonlyMap<string, string>): Promise<{
  edges: MeshEdge[];
  truncated: boolean;
  titles: Map<string, string>;
}> {
  const { rows } = await getFunnelRows();
  const scan = rows.slice(0, AUTHORED_SCAN_LIMIT);
  const titles = new Map<string, string>();
  const found = await Promise.all(
    scan.map(async (r) => {
      const md = await readDemand(r.id).catch(() => undefined);
      if (!md) return [];
      const subject: MeshRef = { kind: "demand", id: r.id };
      // The tools this demand declares — derived from the document already open, so
      // the dependency costs nothing extra. A name no register knows still becomes a
      // node, titled as the demand wrote it: that is the finding, not a dead end.
      const tools = declaredTools(md).map((name) => {
        const id = resolveToolName(toolIndex, name);
        if (!titles.has(`application:${id.toLowerCase()}`)) titles.set(`application:${id.toLowerCase()}`, name);
        return {
          from: subject,
          to: { kind: "application" as const, id },
          note: "builds on this tool",
          source: "derived" as const,
          relation: "depends-on" as const,
        };
      });
      return [...edgesFrom(subject, parseReferences(md)), ...tools];
    }),
  );
  return { edges: found.flat(), truncated: rows.length > scan.length, titles };
}

const BASE_TTL_MS = 60_000;
let baseCache: { at: number; value: MeshEdges } | null = null;
let baseInflight: Promise<MeshEdges> | null = null;

/**
 * The shared base edge set, built at most once per TTL and reused across requests —
 * and concurrent callers share one in-flight build. This is the read the projection
 * exists to avoid doing per page: without it, every artifact page re-derives the whole
 * mesh and re-scans the funnel for its backlinks. (Persisting `## Related` into the
 * funnel projection at save-time would remove even the one scan — the permanent fix
 * the spec names; this caches it rather than materialising to disk.)
 */
async function baseMeshEdges(now: number): Promise<MeshEdges> {
  if (baseCache && now - baseCache.at < BASE_TTL_MS) return baseCache.value;
  if (baseInflight) return baseInflight;
  baseInflight = (async () => {
    // The register is small and both heavy reads below need it: the derived pass to
    // name the tool nodes, the authored scan to resolve what each demand declares.
    const register = await loadRegister([]).catch(() => null);
    const toolIndex = toolNameIndex(register?.entries ?? []);
    const [{ edges: d, titles }, authored] = await Promise.all([derived(register), allAuthoredEdges(toolIndex)]);
    // A register name wins over the spelling a demand used; anything the register
    // does not carry keeps the demand's own words.
    for (const [k, v] of authored.titles) if (!titles.has(k)) titles.set(k, v);
    const title: TitleLookup = (ref) => titles.get(refKey(ref));
    const value: MeshEdges = { edges: dedupeEdges([...d, ...authored.edges]), titles, truncated: authored.truncated, title };
    baseCache = { at: now, value };
    return value;
  })();
  try {
    return await baseInflight;
  } finally {
    baseInflight = null;
  }
}

/** Drop the cached mesh — call after a write that changes edges. */
export function clearMeshCache(): void {
  baseCache = null;
}

/**
 * A subject's neighbourhood, both directions, ready to render.
 *
 * Reads the shared (cached) base edge set plus the subject's own artifact edges, so a
 * page render is one cheap lookup, not a re-derivation. Never throws: a mesh is an aid
 * to navigation and must never be the reason a page fails to open.
 */
export async function loadNeighbourhood(subject: MeshRef): Promise<LoadedMesh> {
  try {
    const [base, own] = await Promise.all([baseMeshEdges(Date.now()), ownEdges(subject)]);
    const all = dedupeEdges([...base.edges, ...own]);
    const n = neighbourhood(all, subject, base.title);
    return { ...n, truncated: base.truncated };
  } catch {
    return { outbound: [], inbound: [], truncated: false };
  }
}

/** The whole cheap edge set for a LIST page — the cached base, shared by every card. */
export async function loadMeshEdges(): Promise<MeshEdges> {
  try {
    return await baseMeshEdges(Date.now());
  } catch {
    return { edges: [], titles: new Map(), truncated: false, title: () => undefined };
  }
}

/** One subject's neighbourhood, computed from an already-loaded `MeshEdges`. */
export function neighbourhoodOf(mesh: MeshEdges, subject: MeshRef): Neighbourhood {
  return neighbourhood(mesh.edges, subject, mesh.title);
}
