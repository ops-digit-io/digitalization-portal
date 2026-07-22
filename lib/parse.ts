/**
 * Markdown state extraction — the most load-bearing module in the portal
 * (`docs/BUILD.md §The markdown parser`, `docs/03-data-model.md §3.2`).
 *
 * Reads lifecycle state from a use case's `README.md` by **heading structure**,
 * not by schema. Two sections are parsed:
 *
 *   - `## State`  — a definition list of `- **Key:** value` lines.
 *   - `## Gates`  — a table with fixed columns: Gate, Status, Date, By, Note.
 *
 * Everything else is prose: displayed and read, never parsed.
 *
 * Contract (do not weaken):
 *   - NEVER throws. Returns a result carrying a `parseErrors` array.
 *   - A use case whose state cannot be read renders on the board marked
 *     `needsAttention` — it does not vanish. Failing visibly beats failing
 *     silently.
 *   - Tolerates whitespace variation, bold/non-bold keys, and extra sections.
 *   - Case-insensitive on keys and enum values.
 *   - Unknown `## State` keys are preserved in `state.raw` and ignored, not
 *     errors.
 *
 * `parsePeople()` additionally extracts the `## People` role table. That table
 * is prose to the board, but the portal reads it for gate enforcement
 * (`lib/gates.ts`) — a sponsor/value-owner presence check has nowhere else to
 * look. It is kept out of the `## State` contract deliberately.
 */

import {
  type Confidence,
  type Gate,
  type GateStatus,
  type Heat,
  type Lane,
  type Level,
  type RecordRole,
  type Stage,
  CONFIDENCES,
  GATE_STATUSES,
  GATES,
  HEATS,
  LANES,
  LEVELS,
  STAGES,
  STATUSES,
  type Status,
} from "./types.js";

export interface ParseError {
  section: "state" | "gates" | "people" | "document";
  message: string;
}

export interface ParsedState {
  /** Every `## State` key (lowercased) mapped to its raw value. Unknown keys kept. */
  raw: Record<string, string>;
  stage?: Stage;
  lane?: Lane;
  status?: Status;
  plant?: string;
  domain?: string;
  level?: Level;
  heat?: Heat;
  scalePotential?: string;
  created?: string;
  intake?: string;
  confidential?: boolean;
  // Parked-state extras (`docs/03-data-model.md §3.5`).
  parkedReason?: string;
  parkedSince?: string;
  reviewOn?: string;
}

export interface GateRow {
  /** G1–G7 parsed from the first column, if recognisable. */
  id?: Gate;
  /** The rest of the first cell, e.g. "Intake accepted". */
  label?: string;
  status?: GateStatus;
  date?: string;
  by?: string;
  note?: string;
  /** Raw trimmed cells, always present for debugging / display. */
  cells: string[];
}

export interface ParsedUseCase {
  /** First level-1 heading text, if any. */
  title?: string;
  state: ParsedState;
  gates: GateRow[];
  parseErrors: ParseError[];
  /**
   * True when the use case cannot be trusted to render normally — a missing or
   * unreadable `## State`, or an unrecognised stage. The board shows these with
   * a "needs attention" marker rather than hiding them.
   */
  needsAttention: boolean;
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;

/** Split markdown into sections keyed by their level-2 (`## `) heading, lowercased. */
function sectionsByHeading(markdown: string): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  let current: string | null = null;
  for (const line of markdown.split(/\r?\n/)) {
    const m = HEADING_RE.exec(line);
    if (m && m[1] && m[2] !== undefined) {
      const level = m[1].length;
      if (level <= 2) {
        // A `#` title or a new `##` section resets the current section.
        current = level === 2 ? m[2].trim().toLowerCase() : null;
        if (current !== null && !sections.has(current)) sections.set(current, []);
        continue;
      }
      // `###`+ headings are content within the current section.
    }
    if (current !== null) sections.get(current)!.push(line);
  }
  return sections;
}

function firstTitle(markdown: string): string | undefined {
  for (const line of markdown.split(/\r?\n/)) {
    const m = HEADING_RE.exec(line);
    if (m && m[1] && m[1].length === 1) return m[2]?.trim();
  }
  return undefined;
}

/** Parse one definition-list line `- **Key:** value` → [key, value] or null. */
function parseDefLine(line: string): [string, string] | null {
  const m = /^\s*[-*+]\s+(.*)$/.exec(line);
  if (!m || m[1] === undefined) return null;
  // Strip bold markers so `**Key:**` and `**value**` both normalise cleanly.
  const content = m[1].replace(/\*\*/g, "").trim();
  const idx = content.indexOf(":");
  if (idx === -1) return null;
  const key = content.slice(0, idx).trim();
  const value = content.slice(idx + 1).trim();
  if (key === "") return null;
  return [key, value];
}

/** Case-insensitive membership: return the canonical enum value or undefined. */
function matchEnum<T extends string>(value: string, allowed: readonly T[]): T | undefined {
  const lower = value.trim().toLowerCase();
  return allowed.find((a) => a.toLowerCase() === lower);
}

function parseStateSection(lines: string[], errors: ParseError[]): ParsedState {
  const raw: Record<string, string> = {};
  for (const line of lines) {
    const kv = parseDefLine(line);
    if (!kv) continue;
    const [key, value] = kv;
    raw[key.toLowerCase()] = value;
  }

  const state: ParsedState = { raw };

  const get = (k: string): string | undefined => raw[k];

  const stageRaw = get("stage");
  if (stageRaw !== undefined) {
    const stage = matchEnum<Stage>(stageRaw, STAGES);
    if (stage) state.stage = stage;
    else errors.push({ section: "state", message: `Unrecognised stage "${stageRaw}"` });
  }

  const laneRaw = get("lane");
  if (laneRaw !== undefined) {
    const lane = matchEnum<Lane>(laneRaw, LANES);
    if (lane) state.lane = lane;
    else errors.push({ section: "state", message: `Unrecognised lane "${laneRaw}"` });
  }

  const statusRaw = get("status");
  if (statusRaw !== undefined) {
    const status = matchEnum<Status>(statusRaw, STATUSES);
    if (status) state.status = status;
    else errors.push({ section: "state", message: `Unrecognised status "${statusRaw}"` });
  }

  const levelRaw = get("level");
  if (levelRaw !== undefined) {
    const level = matchEnum<Level>(levelRaw, LEVELS);
    if (level) state.level = level;
    else errors.push({ section: "state", message: `Unrecognised level "${levelRaw}"` });
  }

  const heatRaw = get("heat");
  if (heatRaw !== undefined) {
    const heat = matchEnum<Heat>(heatRaw, HEATS);
    if (heat) state.heat = heat;
    else errors.push({ section: "state", message: `Unrecognised heat "${heatRaw}"` });
  }

  if (get("plant") !== undefined) state.plant = get("plant");
  if (get("domain") !== undefined) state.domain = get("domain");
  if (get("scale potential") !== undefined) state.scalePotential = get("scale potential");
  if (get("created") !== undefined) state.created = get("created");
  if (get("intake") !== undefined) state.intake = get("intake");
  if (get("parked reason") !== undefined) state.parkedReason = get("parked reason");
  if (get("parked since") !== undefined) state.parkedSince = get("parked since");
  if (get("review on") !== undefined) state.reviewOn = get("review on");

  const confRaw = get("confidential");
  if (confRaw !== undefined) {
    state.confidential = /^(yes|true)$/i.test(confRaw.trim());
  }

  return state;
}

/** Split a markdown table row into trimmed cells, dropping the outer pipes. */
function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c.replace(/\s/g, "")));
}

function parseGatesSection(lines: string[], errors: ParseError[]): GateRow[] {
  const rows = lines.filter((l) => l.trim().startsWith("|")).map(splitRow);
  if (rows.length === 0) {
    errors.push({ section: "gates", message: "No gates table found" });
    return [];
  }
  // Drop the header row and the `---` separator; keep data rows.
  const dataRows = rows.filter((cells, i) => {
    if (i === 0) return false; // header
    if (isSeparatorRow(cells)) return false;
    return true;
  });

  const gates: GateRow[] = [];
  for (const cells of dataRows) {
    const cell = (i: number): string => (cells[i] ?? "").replace(/\*\*/g, "").trim();
    const gateCell = cell(0);
    const idMatch = /\bG([1-7])\b/i.exec(gateCell);
    const id = idMatch ? (`G${idMatch[1]}` as Gate) : undefined;
    const label = idMatch
      ? gateCell.replace(idMatch[0], "").trim() || undefined
      : gateCell || undefined;

    const statusRaw = cell(1);
    let status: GateStatus | undefined;
    if (statusRaw !== "") {
      status = matchEnum<GateStatus>(statusRaw, GATE_STATUSES);
      if (!status) {
        errors.push({ section: "gates", message: `Unrecognised gate status "${statusRaw}"` });
      }
    }

    gates.push({
      id,
      label,
      status,
      date: cell(2) || undefined,
      by: cell(3) || undefined,
      note: cell(4) || undefined,
      cells,
    });
  }
  return gates;
}

/**
 * Parse a use case's `README.md`. Never throws; malformed input is reported in
 * `parseErrors` and flagged via `needsAttention`.
 */
export function parseUseCase(markdown: string): ParsedUseCase {
  const parseErrors: ParseError[] = [];
  try {
    const sections = sectionsByHeading(markdown ?? "");
    const title = firstTitle(markdown ?? "");

    const stateLines = sections.get("state");
    let state: ParsedState;
    if (stateLines === undefined) {
      parseErrors.push({ section: "state", message: "Missing `## State` section" });
      state = { raw: {} };
    } else {
      state = parseStateSection(stateLines, parseErrors);
    }

    const gatesLines = sections.get("gates");
    const gates = gatesLines === undefined ? [] : parseGatesSection(gatesLines, parseErrors);
    if (gatesLines === undefined) {
      parseErrors.push({ section: "gates", message: "Missing `## Gates` section" });
    }

    const needsAttention =
      stateLines === undefined ||
      state.stage === undefined ||
      parseErrors.some((e) => e.section === "state");

    return { title, state, gates, parseErrors, needsAttention };
  } catch (err) {
    // The contract is absolute: never throw. Surface the failure as attention.
    parseErrors.push({
      section: "document",
      message: `Unexpected parse failure: ${err instanceof Error ? err.message : String(err)}`,
    });
    return { state: { raw: {} }, gates: [], parseErrors, needsAttention: true };
  }
}

/** A `Role → email` map read from the `## People` table. Used only for enforcement. */
export type PeopleMap = Partial<Record<RecordRole, string>>;

const PEOPLE_LABEL_TO_ROLE: Record<string, RecordRole> = {
  requester: "requester",
  lead: "lead",
  sponsor: "sponsor",
  "value owner": "value_owner",
  "business owner": "business_owner",
  "delivery lead": "delivery_lead",
  "run owner": "run_owner",
};

/**
 * Extract the `## People` role table. Returns `{}` if absent or unreadable —
 * like the main parser, it never throws. A person value of `*assigned at G7*`
 * or an empty cell is treated as "not yet named".
 */
export function parsePeople(markdown: string): PeopleMap {
  const people: PeopleMap = {};
  try {
    const lines = sectionsByHeading(markdown ?? "").get("people");
    if (!lines) return people;
    for (const line of lines) {
      if (!line.trim().startsWith("|")) continue;
      const cells = splitRow(line);
      if (cells.length < 2) continue;
      const roleLabel = (cells[0] ?? "").replace(/\*\*/g, "").trim().toLowerCase();
      const role = PEOPLE_LABEL_TO_ROLE[roleLabel];
      if (!role) continue;
      const person = (cells[1] ?? "").trim();
      // Skip header ("Person"), placeholders, and unfilled template angle-brackets.
      if (
        person === "" ||
        /^person$/i.test(person) ||
        /^[*_]*assigned/i.test(person) ||
        /^<.*>$/.test(person)
      ) {
        continue;
      }
      people[role] = person;
    }
  } catch {
    return people;
  }
  return people;
}
