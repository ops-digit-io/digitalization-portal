/**
 * Tools added by hand in the portal.
 *
 * `registry/tools.md` ships with the app and is read-only at runtime (serverless
 * `process.cwd()` is not writable — see `lib/otx/source.ts`). But a register only
 * a developer can add to is a register that goes stale, and the tool nobody can
 * write down is exactly the one nobody owns. So the portal writes ITS additions
 * to a second file, `landscape/tools.md`, in the process repo:
 *
 *   - same columns, same parser (`parseTools`) — one contract, two files
 *   - markdown in git, so adding a tool is a reviewable diff (constraint #4)
 *   - GitHub when the App is configured, a local directory otherwise, exactly
 *     like the champions register beside it
 *
 * `/landscape` reads both and consolidates them (`lib/otx/consolidate.ts`); a tool
 * added here shows as `manual` until somebody moves the row into the curated
 * master, at which point the master wins and the duplicate collapses.
 *
 * Adding is APPEND-ONLY on purpose: this file is a capture surface, not an
 * editor. Correcting a row is a git edit, where it is reviewed.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getGitHost, hasGitHubCredentials, type RepoRef } from "../git/index.js";
import { repoRef } from "../repos.js";
import { parseTools, serialiseTools, nextToolId, validateTool, type ToolRow } from "./toolscape.js";

/** Where the portal's own additions live, in the process repo. */
export const FILE = "landscape/tools.md";

const INTRO = `# Tools added in the portal

Rows captured through \`/landscape\`, in the same columns as
\`registry/tools.md\` so one parser reads both. Curating a row — correcting it,
or promoting it into the shipped master — is a normal git edit; the portal only
appends.
`;

function live(): boolean {
  return hasGitHubCredentials();
}

function repo(): RepoRef {
  return repoRef("processes");
}

/** The local mirror when GitHub is not configured — never the app's working tree. */
function localBase(): string {
  return process.env.LANDSCAPE_DATA_DIR ?? process.env.PROCESS_DATA_DIR ?? path.join(os.tmpdir(), "du-processes");
}

/** Raw markdown of the added-tools file, or `undefined` when there is none yet. */
async function read(): Promise<string | undefined> {
  if (live()) return getGitHost().getFile(repo(), FILE).catch(() => undefined);
  return readFile(path.join(localBase(), FILE), "utf8").catch(() => undefined);
}

/**
 * Every manually added tool. NEVER THROWS: an unreadable or absent file yields
 * `[]` and the consolidated register renders without it, for the same reason
 * `readRegistry` never throws — a store that cannot be read must show up as a
 * missing source, not as a 500 on the landscape.
 */
export async function listManualTools(): Promise<ToolRow[]> {
  return parseTools(await read());
}

async function write(rows: readonly ToolRow[], message: string): Promise<void> {
  const body = serialiseTools(rows, INTRO);
  if (live()) {
    await getGitHost().putFile(repo(), { path: FILE, content: body }, message, "main");
    return;
  }
  const abs = path.join(localBase(), FILE);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body);
}

export interface AddToolResult {
  ok: boolean;
  /** Present when the submission was refused; each string is shown to the user. */
  errors: string[];
  /** Recorded anyway, and shown next to the row. */
  warnings: string[];
  tool?: ToolRow;
}

/**
 * Record a tool. `takenIds` are the ids already used by the shipped master, so a
 * portal-added tool never collides with one that arrives in a later deploy.
 */
export async function addTool(input: Record<string, unknown>, takenIds: readonly string[] = []): Promise<AddToolResult> {
  const existing = await listManualTools();
  const id = nextToolId([...takenIds, ...existing.map((t) => t.id)]);
  const check = validateTool(input, id);
  if (!check.ok) return { ok: false, errors: check.errors, warnings: check.warnings };

  const duplicate = existing.find((t) => t.tool.trim().toLowerCase() === check.row.tool.trim().toLowerCase());
  if (duplicate) {
    return { ok: false, errors: [`"${duplicate.tool}" is already recorded as ${duplicate.id}.`], warnings: [] };
  }

  await write([...existing, check.row], `Landscape: record ${check.row.tool}`);
  return { ok: true, errors: [], warnings: check.warnings, tool: check.row };
}
