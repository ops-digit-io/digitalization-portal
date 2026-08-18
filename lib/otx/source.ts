/**
 * Reading the hand-edited `registry/*.md` masters at runtime.
 *
 * The IT/OT surfaces (`/landscape`, `/rollout`, `/ai-framework`, `/scout`) read
 * their data from markdown tables a human edits in git — the portal's own claim,
 * applied to itself: every artifact is markdown, git is the system of record
 * (`docs/BUILD.md` constraint #4).
 *
 * One seam, so the fallback story is one function. The files ship with the app
 * (`outputFileTracingIncludes` in `next.config.mjs` puts them in the serverless
 * bundle), so this is a read of the deployed working tree, never a write —
 * `process.cwd()` is read-only on serverless and nothing here tries otherwise.
 *
 * NEVER THROWS. A missing or unreadable file yields `undefined` and the surface
 * renders its empty state, for the same reason the use-case parser never throws:
 * a registry that cannot be read must show up as a visible gap, not as a 500.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = "registry";

/** The registry masters the IT/OT surfaces read. */
export type RegistryFile =
  | "plants"
  | "landscape"
  | "uns"
  | "technology"
  | "rollout"
  | "ai-portfolio"
  | "handovers"
  | "tools";

/** Read one registry master. `undefined` when it is absent or unreadable. */
export async function readRegistry(name: RegistryFile, baseDir: string = process.cwd()): Promise<string | undefined> {
  return readFile(join(baseDir, DIR, `${name}.md`), "utf8").catch(() => undefined);
}
