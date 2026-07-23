/**
 * Advance a demand one stage forward by recording a gate passage in its markdown
 * (`docs/02-lifecycle.md`, `docs/03-data-model.md §3.14`).
 *
 * This is the funnel's stage-movement action. It is a PURE markdown rewrite —
 * given a case README it returns the next README — so it is fully testable and
 * has no IO. The caller (`/api/demands/[id]/advance`) persists the result to the
 * `du-demands` funnel, which the portal writes directly (it is the intake funnel,
 * not a gated use-case repo).
 *
 * What this is NOT: it does not merge a pull request and it is not an agent tool.
 * It records a human decision taken in the portal UI, and it refuses through the
 * SAME `canOpenGate` enforcement the rest of the portal uses — the button is
 * disabled with exactly the reason this returns. Gate governance for `uc-*`
 * repositories (a human merge under CODEOWNERS) is unchanged and lives elsewhere.
 */

import { parseUseCase, parsePeople } from "./parse.js";
import { canOpenGate } from "./gates.js";
import { exitGate, nextStage } from "./stages.js";
import type { Gate, GateStatus, Stage } from "./types.js";

export type AdvanceResult =
  | { ok: true; markdown: string; from: Stage; to: Stage; gate: Gate }
  | { ok: false; reason: string };

/** Split a markdown table row into trimmed cells, dropping the outer pipes. */
function splitCells(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

/** Set (or insert) a `- **Key:** value` line inside the `## State` section. */
function setStateField(md: string, key: string, value: string): string {
  const re = new RegExp(`^(\\s*[-*+]\\s+\\*\\*${key}:\\*\\*\\s*).*$`, "m");
  if (re.test(md)) return md.replace(re, `$1${value}`);
  // Not present — insert after the Stage line if there is one, else after the heading.
  const stageRe = /^(\s*[-*+]\s+\*\*Stage:\*\*.*)$/m;
  if (stageRe.test(md)) return md.replace(stageRe, `$1\n- **${key}:** ${value}`);
  return md.replace(/(##\s+State\s*\n)/i, `$1\n- **${key}:** ${value}\n`);
}

/** Patch the `## Gates` table row for a given gate, preserving the label and note. */
function setGateRow(md: string, gate: Gate, patch: { status?: GateStatus; date?: string; by?: string }): string {
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim().startsWith("|")) continue;
    const cells = splitCells(line);
    if (cells.length < 2) continue;
    const first = (cells[0] ?? "").replace(/\*\*/g, "");
    if (!new RegExp(`\\b${gate}\\b`, "i").test(first)) continue; // header ("Gate") and separator never match \bG\d\b
    if (patch.status !== undefined) cells[1] = patch.status;
    if (patch.date !== undefined) cells[2] = patch.date;
    if (patch.by !== undefined) cells[3] = patch.by;
    lines[i] = `| ${cells.join(" | ")} |`;
    break;
  }
  return lines.join("\n");
}

/** Append a bullet to the `## History` section (creating it if absent). */
function appendHistory(md: string, entry: string): string {
  const bullet = `- ${entry}`;
  const idx = md.search(/##\s+History/i);
  if (idx === -1) return `${md.trimEnd()}\n\n## History\n\n${bullet}\n`;
  const rel = md.slice(idx).search(/\n##\s+/);
  if (rel === -1) return `${md.trimEnd()}\n${bullet}\n`;
  const at = idx + rel;
  return `${md.slice(0, at).trimEnd()}\n${bullet}\n${md.slice(at)}`;
}

/**
 * Produce the next README for a demand: pass the current stage's exit gate and
 * move to the next stage. Refuses (with a reason) when the parsed state is
 * unreadable, the case is already at S8, or `canOpenGate` forbids the passage.
 */
export function advanceDemand(markdown: string, opts: { actor: string; date: string }): AdvanceResult {
  const uc = parseUseCase(markdown);
  const people = parsePeople(markdown);

  const stage = uc.state.stage;
  if (!stage) {
    return { ok: false, reason: "This demand's stage couldn't be read — fix the ## State section before advancing." };
  }
  const gate = exitGate(stage);
  const to = nextStage(stage);
  if (!gate || !to) {
    return { ok: false, reason: `${stage} is the final stage — there is nothing to advance to.` };
  }

  const decision = canOpenGate(gate, { readme: uc, people, actor: opts.actor });
  if (!decision.permitted) return { ok: false, reason: decision.reason };

  let md = setStateField(markdown, "Stage", to);
  md = setStateField(md, "Since", opts.date);
  md = setGateRow(md, gate, { status: "passed", date: opts.date, by: opts.actor });
  const nextOpen = exitGate(to); // the gate the case now works toward
  if (nextOpen) md = setGateRow(md, nextOpen, { status: "open" });
  md = appendHistory(md, `${opts.date} — ${gate} passed (${stage}→${to}) by ${opts.actor}`);

  return { ok: true, markdown: md, from: stage, to, gate };
}
