/**
 * Loading the whole corpus, so the mesh can be validated rather than assumed.
 *
 * `lib/mesh-store.ts` is the per-page loader and is bounded on purpose — it must
 * not open every demand on every page view. This module is the opposite: it opens
 * everything, once, for the jobs that genuinely need the whole graph (the integrity
 * check, an export, a graph view). It is deliberately NOT on any page's read path.
 *
 * Every node the mesh can name has to appear here, including the ones that hold no
 * references of their own — a champion in the register, a persona in the library, a
 * skill or playbook in the agent registry, the uc-* repository a use case earns at
 * PoC. An artifact missing from the corpus is indistinguishable from one that was
 * deleted, so leaving a kind out manufactures `dangling` errors for edges that are
 * perfectly fine.
 */

import { listChampions } from "./champions-store.js";
import { listDemands, readDemand, listArtifacts } from "./demands-store.js";
import { listPersonas } from "./persona-library-store.js";
import { listRegistry } from "./registry-store.js";
import { repoNameFor } from "./poc/scaffold.js";
import * as processStore from "./process/store.js";
import { mapPool } from "./pool.js";
import { STAGES, type Stage } from "./types.js";
import type { MeshDocument } from "./mesh-graph.js";
import type { MeshEdge } from "./mesh.js";

/** How many documents to read at once. The corpus read is a batch job, not a page. */
const READ_CONCURRENCY = 8;

export interface CorpusOptions {
  /** Cap on demands read, for a very large funnel. Omit to read all of them. */
  limit?: number;
}

/** Stages at or past PoC — where a use case has earned its own `uc-*` repository
 *  (G3, S3→S4, is the PoC gate). Before S4 there is no repo to point at. */
function hasScaffoldedRepo(stage?: Stage): boolean {
  return stage !== undefined && STAGES.indexOf(stage) >= STAGES.indexOf("S4");
}

/**
 * The scaffolded-repo node a demand implies, or null before the PoC stage. Pure, so
 * the derivation is unit-tested without reading the funnel. The demand→repo edge is
 * `derived`: it is as reliable as the demand's stage, and no more — there is no
 * repository listing to confirm it against (the git host exposes no `listRepos`).
 */
/**
 * The playbook→skill edges a playbook implies: one per skill it declares that
 * actually exists in the registry. Pure, so the connection is unit-tested. A
 * reference to an unknown skill is dropped — that is a registry data issue, not an
 * edge for the mesh to invent (and inventing it would read as `dangling`).
 */
export function playbookSkillEdges(
  playbook: string,
  uses: readonly string[],
  skillIds: Map<string, string>,
): MeshEdge[] {
  return uses
    .map((s) => skillIds.get(s.toLowerCase()))
    .filter((id): id is string => id !== undefined)
    .map((id) => ({
      from: { kind: "playbook" as const, id: playbook },
      to: { kind: "skill" as const, id },
      note: "runs this skill",
      source: "derived" as const,
    }));
}

export function repoDocForDemand(d: { id: string; title: string; stage?: Stage }): MeshDocument | null {
  if (!hasScaffoldedRepo(d.stage)) return null;
  const id = repoNameFor(d.id, d.title);
  return {
    kind: "repo",
    id,
    title: id,
    derived: [
      {
        from: { kind: "demand", id: d.id },
        to: { kind: "repo", id },
        note: "PoC repository scaffolded for this use case at the PoC stage",
        source: "derived",
      },
    ],
  };
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
  const [demands, engagements, personas, champions, registry] = await Promise.all([
    listDemands().catch(() => []),
    processStore.list().catch(() => []),
    listPersonas().catch(() => []),
    listChampions().catch(() => []),
    listRegistry().catch(() => ({ skills: [], playbooks: [], contracts: [] })),
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

  // Skills and playbooks live in the external agent registry (du-agent-registry),
  // read through the content seam. Unreachable → no nodes, so an edge to one then
  // reads as `unverifiable` rather than `dangling` — the same honest degrade every
  // other store makes.
  const skillDocs: MeshDocument[] = registry.skills.map((e) => ({ kind: "skill", id: e.name, title: e.title }));

  // A playbook declares the skills it runs; the registry already knows this, so the
  // mesh derives a playbook→skill edge rather than leaving both as orphans. Only edges
  // to a skill that actually exists are drawn — a reference to an unknown skill is a
  // registry data issue, not an edge to invent. This is what connects the library.
  const skillIds = new Map(registry.skills.map((s) => [s.name.toLowerCase(), s.name]));
  const playbookDocs: MeshDocument[] = registry.playbooks.map((e) => ({
    kind: "playbook",
    id: e.name,
    title: e.title,
    derived: playbookSkillEdges(e.name, e.skills ?? [], skillIds),
  }));

  // A use case earns its own uc-* repository at the PoC stage; derive that node and
  // the demand→repo edge from the demands that have reached it.
  const repoDocs: MeshDocument[] = wanted
    .map((d) => repoDocForDemand(d))
    .filter((d): d is MeshDocument => d !== null);

  const docs = [
    ...demandDocs,
    ...requirementDocs,
    ...engagementDocs,
    ...personaDocs,
    ...championDocs,
    ...skillDocs,
    ...playbookDocs,
    ...repoDocs,
  ];
  return {
    docs,
    counts: {
      demand: demandDocs.length,
      requirement: requirementDocs.length,
      process: engagementDocs.length,
      persona: personaDocs.length,
      champion: championDocs.length,
      skill: skillDocs.length,
      playbook: playbookDocs.length,
      repo: repoDocs.length,
    },
  };
}
