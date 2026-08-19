/**
 * What the portal WRITES about the landscape: tools added by hand, edits to tools
 * it cannot write at the source, and risk decisions.
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
 * Editing works the same way, one file along: `landscape/overrides.md` holds a
 * patch per tool (blank cell = unchanged), applied at read time over whatever the
 * source says — so a cost can be corrected, or a lifecycle decided, without a pull
 * request against a file that ships with the app. `landscape/risk.md` holds the
 * risk decisions: a derived factor accepted with a reason, or a risk the register
 * cannot see, added with its own weight.
 *
 * Three small tables rather than one: `parseFirstTable` reads the first table in a
 * document, so one file cannot hold two.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getGitHost, hasGitHubCredentials, type RepoRef } from "../git/index.js";
import { repoRef } from "../repos.js";
import { parseTools, serialiseTools, nextToolId, validateTool, type ToolRow } from "./toolscape.js";
import {
  mergeOverride,
  parseOverrides,
  parseRiskAdjustments,
  readToolPatch,
  serialiseOverrides,
  serialiseRiskAdjustments,
  validateRiskAdjustment,
  type RiskAdjustment,
  type ToolOverride,
} from "./adjustments.js";

/** Where the portal's own additions live, in the process repo. */
export const FILE = "landscape/tools.md";
/** Field edits over any tool, whatever file it came from. */
export const OVERRIDES_FILE = "landscape/overrides.md";
/** Risk accepted, and risk the register cannot see. */
export const RISK_FILE = "landscape/risk.md";

const INTRO = `# Tools added in the portal

Rows captured through \`/landscape\`, in the same columns as
\`registry/tools.md\` so one parser reads both. Curating a row — correcting it,
or promoting it into the shipped master — is a normal git edit; the portal only
appends.
`;

const OVERRIDES_INTRO = `# Tool edits

One row per tool corrected through \`/landscape\`, keyed by the tool's id (\`APP-001\`)
or, for a tool with no id, the slug of its name. A BLANK cell means unchanged; an
em dash means "make this empty". Applied over the source row at read time.
`;

const RISK_INTRO = `# Risk decisions

\`accept\` — a derived risk factor that is known and accepted: it stops counting and
stays on the record with its reason. \`add\` — a risk the register cannot derive
(end of support, an audit finding, a vendor in trouble), with its own weight.
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

/** Raw markdown of one of the landscape files, or `undefined` when absent. */
async function read(file: string): Promise<string | undefined> {
  if (live()) return getGitHost().getFile(repo(), file).catch(() => undefined);
  return readFile(path.join(localBase(), file), "utf8").catch(() => undefined);
}

/**
 * Every manually added tool. NEVER THROWS: an unreadable or absent file yields
 * `[]` and the consolidated register renders without it, for the same reason
 * `readRegistry` never throws — a store that cannot be read must show up as a
 * missing source, not as a 500 on the landscape.
 */
export async function listManualTools(): Promise<ToolRow[]> {
  return parseTools(await read(FILE));
}

/** Every field edit, by tool node id. Same never-throw contract. */
export async function listOverrides(): Promise<Map<string, ToolOverride>> {
  return parseOverrides(await read(OVERRIDES_FILE));
}

/** Every risk decision. Same never-throw contract. */
export async function listRiskAdjustments(): Promise<RiskAdjustment[]> {
  return parseRiskAdjustments(await read(RISK_FILE));
}

async function write(file: string, body: string, message: string): Promise<void> {
  if (live()) {
    await getGitHost().putFile(repo(), { path: file, content: body }, message, "main");
    return;
  }
  const abs = path.join(localBase(), file);
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

  await write(FILE, serialiseTools([...existing, check.row], INTRO), `Landscape: record ${check.row.tool}`);
  return { ok: true, errors: [], warnings: check.warnings, tool: check.row };
}

export interface EditToolResult {
  ok: boolean;
  errors: string[];
  override?: ToolOverride;
}

/**
 * Edit a tool's fields. Works on ANY tool, whichever file it came from: the edit
 * is an overlay keyed by node id, merged onto whatever was recorded before, so a
 * one-field correction stays a one-field correction.
 */
export async function editTool(
  node: string,
  input: Record<string, unknown>,
  actor: { by: string; date: string },
): Promise<EditToolResult> {
  const tool = node.trim();
  if (tool === "") return { ok: false, errors: ["Which tool?"] };

  const { patch, fields } = readToolPatch(input);
  if (fields.length === 0) return { ok: false, errors: ["Nothing to change."] };

  const existing = await listOverrides();
  const merged = mergeOverride(existing.get(tool.toLowerCase()), {
    tool,
    patch,
    fields,
    by: actor.by,
    date: actor.date,
  });
  existing.set(tool.toLowerCase(), merged);

  await write(
    OVERRIDES_FILE,
    serialiseOverrides([...existing.values()], OVERRIDES_INTRO),
    `Landscape: edit ${tool} (${fields.join(", ")})`,
  );
  return { ok: true, errors: [], override: merged };
}

export interface RiskDecisionResult {
  ok: boolean;
  errors: string[];
  adjustment?: RiskAdjustment;
}

/**
 * Record a risk decision — accept a derived factor, or add one the register cannot
 * see. Re-deciding the same factor REPLACES the earlier row rather than stacking:
 * the register should say what is true now, and git holds what it said before.
 */
export async function decideRisk(
  input: Record<string, unknown>,
  actor: { by: string; date: string },
): Promise<RiskDecisionResult> {
  const check = validateRiskAdjustment(input, actor.by, actor.date);
  if (!check.ok || !check.adjustment) return { ok: false, errors: check.errors };

  const a = check.adjustment;
  const rest = (await listRiskAdjustments()).filter(
    (x) => !(x.tool.toLowerCase() === a.tool.toLowerCase() && x.factor.toLowerCase() === a.factor.toLowerCase()),
  );
  await write(
    RISK_FILE,
    serialiseRiskAdjustments([...rest, a], RISK_INTRO),
    `Landscape: ${a.action === "accept" ? "accept" : "add"} risk "${a.factor}" on ${a.tool}`,
  );
  return { ok: true, errors: [], adjustment: a };
}

/** Undo a risk decision — the factor goes back to counting as derived. */
export async function undecideRisk(tool: string, factor: string): Promise<{ ok: boolean; removed: number }> {
  const all = await listRiskAdjustments();
  const rest = all.filter(
    (x) => !(x.tool.toLowerCase() === tool.trim().toLowerCase() && x.factor.toLowerCase() === factor.trim().toLowerCase()),
  );
  if (rest.length === all.length) return { ok: false, removed: 0 };
  await write(RISK_FILE, serialiseRiskAdjustments(rest, RISK_INTRO), `Landscape: undo risk decision on ${tool}`);
  return { ok: true, removed: all.length - rest.length };
}

export interface RemoveToolResult {
  ok: boolean;
  errors: string[];
  /** What went with it: the row, plus any edits and risk decisions it carried. */
  removed?: { tool: string; overrides: number; adjustments: number };
}

/**
 * Remove a tool that was added HERE.
 *
 * Only rows in `landscape/tools.md` can go: a tool in the shipped master or a
 * system in the plant survey is not the portal's to delete — the way to retire one
 * of those is a lifecycle decision on the row, which is a fact about the tool
 * rather than a hole in the record. Anything the removed tool carried (its edits,
 * its risk decisions) goes with it, so nothing is left pointing at a tool that no
 * longer exists.
 */
export async function removeTool(node: string): Promise<RemoveToolResult> {
  const key = node.trim().toLowerCase();
  if (key === "") return { ok: false, errors: ["Which tool?"] };

  const tools = await listManualTools();
  const gone = tools.find((t) => t.id.trim().toLowerCase() === key || t.tool.trim().toLowerCase() === key);
  if (!gone) {
    return {
      ok: false,
      errors: ["Only a tool added in the portal can be removed here. Mark the others `eliminate` instead — that is a decision, not a deletion."],
    };
  }

  const [overrides, adjustments] = await Promise.all([listOverrides(), listRiskAdjustments()]);
  const keptOverrides = [...overrides.values()].filter((o) => o.tool.trim().toLowerCase() !== key);
  const keptAdjustments = adjustments.filter((a) => a.tool.trim().toLowerCase() !== key);

  await write(FILE, serialiseTools(tools.filter((t) => t !== gone), INTRO), `Landscape: remove ${gone.tool}`);
  if (keptOverrides.length !== overrides.size) {
    await write(OVERRIDES_FILE, serialiseOverrides(keptOverrides, OVERRIDES_INTRO), `Landscape: drop edits for ${gone.tool}`);
  }
  if (keptAdjustments.length !== adjustments.length) {
    await write(RISK_FILE, serialiseRiskAdjustments(keptAdjustments, RISK_INTRO), `Landscape: drop risk decisions for ${gone.tool}`);
  }

  return {
    ok: true,
    errors: [],
    removed: {
      tool: gone.tool,
      overrides: overrides.size - keptOverrides.length,
      adjustments: adjustments.length - keptAdjustments.length,
    },
  };
}
