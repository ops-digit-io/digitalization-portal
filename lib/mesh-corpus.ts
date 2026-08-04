/**
 * Loading the whole corpus, so the mesh can be validated rather than assumed.
 *
 * `lib/mesh-store.ts` is the per-page loader and is bounded on purpose — it must
 * not open every demand on every page view. This module is the opposite: it opens
 * everything, once, for the jobs that genuinely need the whole graph (the integrity
 * check, an export, a graph view). It is deliberately NOT on any page's read path.
 *
 * Every node the mesh can name has to appear here, including the ones that hold no
 * references of their own — a champion in the register, a persona in the library.
 * An artifact missing from the corpus is indistinguishable from one that was
 * deleted, so leaving a kind out manufactures `dangling` errors for edges that are
 * perfectly fine.
 */

import { listChampions } from "./champions-store.js";
import { listDemands, readDemand, listArtifacts } from "./demands-store.js";
import { listPersonas } from "./persona-library-store.js";
import * as processStore from "./process/store.js";
import { mapPool } from "./pool.js";
import type { MeshDocument } from "./mesh-graph.js";
import type { MeshEdge } from "./mesh.js";

/** How many documents to read at once. The corpus read is a batch job, not a page. */
const READ_CONCURRENCY = 8;

export interface CorpusOptions {
  /** Cap on demands read, for a very large funnel. Omit to read all of them. */
  limit?: number;
}

/**
 * Every artifact the mesh can name, with the markdown that carries its references.
 *
 * Defensive throughout: a store that cannot be reached contributes no nodes rather
 * than failing the load. That is a real trade-off — a missing store shows up as
 * `dangling` edges, not as "the check could not run" — so the caller is told what
 * was actually read.
 */
export async function loadCorpus(opts: CorpusOptions = {}): Promise<{
  docs: MeshDocument[];
  counts: Record<string, number>;
}> {
  const [demands, engagements, personas, champions] = await Promise.all([
    listDemands().catch(() => []),
    processStore.list().catch(() => []),
    listPersonas().catch(() => []),
    listChampions().catch(() => []),
  ]);

  const wanted = opts.limit ? demands.slice(0, opts.limit) : demands;

  // Demands carry their own `## Related`, and their artifacts are derived edges.
  const demandDocs = await mapPool(wanted, READ_CONCURRENCY, async (d): Promise<MeshDocument> => {
    const [markdown, artifacts] = await Promise.all([
      readDemand(d.id).catch(() => undefined),
      listArtifacts(d.id).catch((): string[] => []),
    ]);
    const derived: MeshEdge[] = artifacts.includes("requirements")
      ? [
          {
            from: { kind: "demand", id: d.id },
            to: { kind: "requirement", id: d.id },
            note: "standardized requirements derived from this intake",
            source: "derived",
          },
        ]
      : [];
    return {
      kind: "demand",
      id: d.id,
      title: d.title,
      ...(markdown ? { markdown } : {}),
      ...(derived.length ? { derived } : {}),
    };
  });

  // The requirements artifact is a node in its own right — an edge pointing at it
  // is only dangling if the artifact really is absent.
  const requirementDocs: MeshDocument[] = demandDocs
    .filter((d) => d.derived?.some((e) => e.to.kind === "requirement"))
    .map((d) => ({ kind: "requirement", id: d.id, title: d.title }));

  const engagementDocs: MeshDocument[] = engagements.map((m) => ({
    kind: "process",
    id: m.slug,
    title: m.title,
    derived: (m.demands ?? []).map((d) => ({
      from: { kind: "process" as const, id: m.slug },
      to: { kind: "demand" as const, id: d.id },
      note: "cut out of this process diagnosis",
      source: "derived" as const,
    })),
  }));

  const personaDocs: MeshDocument[] = personas.map((p) => ({ kind: "persona", id: p.id, title: p.name }));
  const championDocs: MeshDocument[] = champions.map((c) => ({ kind: "champion", id: c.id, title: c.name || c.email }));

  const docs = [...demandDocs, ...requirementDocs, ...engagementDocs, ...personaDocs, ...championDocs];
  return {
    docs,
    counts: {
      demand: demandDocs.length,
      requirement: requirementDocs.length,
      process: engagementDocs.length,
      persona: personaDocs.length,
      champion: championDocs.length,
    },
  };
}
