/**
 * Loading the consolidated tool register — the one read behind every surface that
 * needs it: the `/landscape` page, the API, and the context mesh.
 *
 * `consolidate()` is pure by design; this is its IO seam. Each source degrades on
 * its own, so a funnel that cannot be read costs the use-case links and nothing
 * else — the register is the answer these callers exist to give.
 */

import { readRegistry } from "./source.js";
import { parseTools, type ToolRow } from "./toolscape.js";
import { parseLandscape, type SystemRow } from "./landscape.js";
import { listManualTools } from "./tool-store.js";
import { consolidate, type DemandDoc, type ToolEntry } from "./consolidate.js";
import { listDemandDocs } from "../demands-store.js";

export interface LoadedRegister {
  entries: ToolEntry[];
  /** The curated master, as parsed — for callers that need the source rows. */
  register: ToolRow[];
  systems: SystemRow[];
  manual: ToolRow[];
  demands: DemandDoc[];
}

/**
 * The whole register. Pass `demands` when the caller has already read them (the
 * mesh corpus opens every demand anyway); omit it to have them read here.
 */
export async function loadRegister(demands?: readonly DemandDoc[]): Promise<LoadedRegister> {
  const [toolsMd, landscapeMd, manual, docs] = await Promise.all([
    readRegistry("tools"),
    readRegistry("landscape"),
    listManualTools().catch(() => [] as ToolRow[]),
    demands ? Promise.resolve([...demands]) : listDemandDocs().catch(() => [] as DemandDoc[]),
  ]);

  const register = parseTools(toolsMd);
  const systems = parseLandscape(landscapeMd);
  return { entries: consolidate({ register, manual, systems, demands: docs }), register, systems, manual, demands: docs };
}
