/**
 * Use-case repository scaffolding (Feature 3, step 1: "create a repo automated").
 *
 * Produces the initial file set for a `uc-*` repository from the templates and
 * the CODEOWNERS generator already in the codebase — the same enforcement every
 * use case inherits from creation. Returns files; the host writes them.
 */

import { generateCodeowners } from "../codeowners.js";
import type { Lane } from "../types.js";

export interface UseCaseSeed {
  id: string; // UC-YYYY-NNNN
  title: string;
  slug: string;
  plant: string;
  lane: Lane;
  domain?: string;
  requester?: string;
  problem?: string;
  createdOn: string; // ISO date
  org?: string;
}

/** Repository name: uc-yyyy-nnnn-<slug> (docs/03 §3.4). */
export function repoName(seed: UseCaseSeed): string {
  return `${seed.id.toLowerCase()}-${seed.slug}`;
}

/** Turn a title into a short URL-safe slug. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 4)
    .join("-");
}

function readme(seed: UseCaseSeed): string {
  return `# ${seed.id} · ${seed.title}

## State

- **Stage:** S1
- **Lane:** ${seed.lane}
- **Status:** active
- **Plant:** ${seed.plant}
- **Domain:** ${seed.domain ?? ""}
- **Created:** ${seed.createdOn}
- **Intake:** complete

## Problem

${seed.problem ?? "_Captured at intake._"}

## People

| Role | Person |
|---|---|
| Requester | ${seed.requester ?? ""} |
| Sponsor | <!-- required before G3 --> |
| Value owner | <!-- required before G3 --> |

## Gates

| Gate | Status | Date | By | Note |
|---|---|---|---|---|
| G1 Intake accepted | open | | | |
| G2 Prioritized | pending | | | |
| G3 Business case | pending | | | |
| G4 POC proven/stop | pending | | | |
| G5 Pilot proven | pending | | | |
| G6 Scale readiness | pending | | | |
| G7 Rollout complete | pending | | | |

## History

- ${seed.createdOn} — created via portal PoC builder
`;
}

export interface ScaffoldFile {
  path: string;
  content: string;
}

/** The initial commit's files for a new use-case repository. */
export function buildScaffoldFiles(seed: UseCaseSeed): ScaffoldFile[] {
  return [
    { path: "README.md", content: readme(seed) },
    {
      path: ".github/CODEOWNERS",
      content: generateCodeowners({ id: seed.id, plant: seed.plant, lane: seed.lane, ...(seed.org ? { org: seed.org } : {}) }),
    },
    {
      path: "intake/conversation.md",
      content: `# Intake conversation · ${seed.id}\n\n_The original intake dialogue is recorded here._\n`,
    },
    {
      path: "intake/sources.md",
      content: `# Sources · ${seed.id}\n\n- Channel: portal PoC builder\n- Requester: ${seed.requester ?? "—"}\n`,
    },
  ];
}
