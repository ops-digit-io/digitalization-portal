/**
 * The two ways a human changes what the register says: an EDIT to a tool's facts,
 * and an ADJUSTMENT to the risk derived from them.
 *
 * Both exist because the register reads from files the portal cannot write —
 * `registry/tools.md` ships with the app, `registry/landscape.md` is the plant
 * survey — and because risk is derived on purpose, so there is no rating to
 * overwrite. Neither is a reason a person should have to open a pull request to
 * correct a cost or accept a known risk. So both are OVERLAYS, in the register's
 * own format (a markdown table in git), applied at read time:
 *
 *   `landscape/overrides.md`  a tool's fields, edited. Blank cell = unchanged.
 *   `landscape/risk.md`       a factor accepted, or a factor the model cannot see.
 *
 * The derivation is never overwritten, only annotated: an accepted factor is still
 * shown, with who accepted it and why, at weight zero. That is the difference
 * between governing a risk and hiding it.
 *
 * Pure: markdown in, data out. NEVER THROWS.
 */

import { parseFirstTable, columnIndex } from "../markdown.js";
import {
  CRITICALITIES,
  HOSTINGS,
  LIFECYCLES,
  SCOPES,
  TOOL_INTEGRATIONS,
  type ToolRow,
} from "./toolscape.js";

// ---------------------------------------------------------------- shared

function rows(md: string | undefined): { get: (label: string) => string }[] {
  const table = parseFirstTable(md ?? "");
  if (!table || table.headers.length === 0) return [];
  const idx = new Map<string, number>();
  for (const h of table.headers) idx.set(h.trim().toLowerCase(), columnIndex(table.headers, h));
  return table.rows.map((cells) => ({
    get: (label: string) => {
      const i = idx.get(label.trim().toLowerCase()) ?? -1;
      return i < 0 ? "" : (cells[i] ?? "").trim();
    },
  }));
}

function cellSafe(v: string): string {
  return String(v ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "/").trim();
}

function table(columns: readonly string[], values: readonly (readonly string[])[], intro: string): string {
  const header = `| ${columns.join(" | ")} |`;
  const sep = `|${columns.map(() => "---").join("|")}|`;
  const body = values.map((r) => `| ${r.map(cellSafe).join(" | ")} |`).join("\n");
  return `${intro.trimEnd()}\n\n${header}\n${sep}\n${body}${body ? "\n" : ""}`;
}

/** An explicit "make this empty", so a blank cell can keep meaning "unchanged". */
const CLEARED = "—";

const number = (raw: string): number | null => {
  const v = raw.replace(/[\s,._€]/g, "");
  if (v === "") return null;
  return Number.isFinite(Number(v)) ? Number(v) : null;
};

const oneOf = <T extends string>(allowed: readonly T[], raw: string): T | "" =>
  ((allowed as readonly string[]).includes(raw.trim().toLowerCase()) ? (raw.trim().toLowerCase() as T) : "");

// ---------------------------------------------------------------- overrides

/** The fields a person may edit. `id`, and what a tool IS, stay with the source. */
export const OVERRIDE_COLUMNS = [
  "Tool", "Name", "Vendor", "Capability", "Domain", "Scope", "Hosting", "Lifecycle",
  "Integration", "Business owner", "IT owner", "Users", "Criticality", "Annual cost", "Notes", "By", "Date",
] as const;

/** A patch over one tool, keyed by its node id (`APP-001`, `uns-broker-hivemq`). */
export interface ToolOverride {
  /** Node id of the tool this edits. */
  tool: string;
  /** Only the fields actually set. A field set to `—` is an explicit clear. */
  patch: Partial<ToolRow>;
  /** Which fields the patch touches, for provenance on the row. */
  fields: string[];
  by: string;
  date: string;
}

/**
 * `input` is the key a submitted patch uses. It differs from the row key for the
 * name: a patch is addressed BY tool (`{ tool: "APP-001", … }`), so the new name
 * has to arrive as `name` or an edit would rename every tool to its own id.
 */
const OVERRIDE_FIELDS: { column: string; key: keyof ToolRow; input: string; read: (raw: string) => unknown }[] = [
  { column: "Name", key: "tool", input: "name", read: (v) => v },
  { column: "Vendor", key: "vendor", input: "vendor", read: (v) => v },
  { column: "Capability", key: "capability", input: "capability", read: (v) => v },
  { column: "Domain", key: "domain", input: "domain", read: (v) => v },
  { column: "Scope", key: "scope", input: "scope", read: (v) => oneOf(SCOPES, v) },
  { column: "Hosting", key: "hosting", input: "hosting", read: (v) => oneOf(HOSTINGS, v) },
  { column: "Lifecycle", key: "lifecycle", input: "lifecycle", read: (v) => oneOf(LIFECYCLES, v) },
  { column: "Integration", key: "integration", input: "integration", read: (v) => oneOf(TOOL_INTEGRATIONS, v) },
  { column: "Business owner", key: "businessOwner", input: "businessOwner", read: (v) => v },
  { column: "IT owner", key: "itOwner", input: "itOwner", read: (v) => v },
  { column: "Users", key: "users", input: "users", read: (v) => number(v) },
  { column: "Criticality", key: "criticality", input: "criticality", read: (v) => oneOf(CRITICALITIES, v) },
  { column: "Annual cost", key: "annualCost", input: "annualCost", read: (v) => number(v) },
  { column: "Notes", key: "notes", input: "notes", read: (v) => v },
];

/** Parse `landscape/overrides.md`. Later rows win, so an edit is just an append. */
export function parseOverrides(md: string | undefined): Map<string, ToolOverride> {
  const out = new Map<string, ToolOverride>();
  for (const r of rows(md)) {
    const tool = r.get("Tool").trim();
    if (tool === "") continue;
    const key = tool.toLowerCase();
    const existing = out.get(key);
    const patch: Partial<ToolRow> = { ...(existing?.patch ?? {}) };
    const fields = new Set(existing?.fields ?? []);

    for (const f of OVERRIDE_FIELDS) {
      const raw = r.get(f.column);
      if (raw === "") continue; // blank = unchanged, so a patch can be one column wide
      const value = raw === CLEARED ? (f.key === "users" || f.key === "annualCost" ? null : "") : f.read(raw);
      (patch as Record<string, unknown>)[f.key] = value;
      fields.add(f.column);
    }
    if (fields.size === 0) continue;
    out.set(key, { tool, patch, fields: [...fields], by: r.get("By"), date: r.get("Date") });
  }
  return out;
}

/** Render overrides back to markdown — one row per edited tool. */
export function serialiseOverrides(overrides: Iterable<ToolOverride>, intro: string): string {
  const values = [...overrides].map((o) => {
    const patch = o.patch as Record<string, unknown>;
    const cell = (f: (typeof OVERRIDE_FIELDS)[number]): string => {
      if (!(f.key in patch)) return "";
      const v = patch[f.key];
      if (v === null || v === "") return CLEARED;
      return String(v);
    };
    return [o.tool, ...OVERRIDE_FIELDS.map(cell), o.by, o.date];
  });
  return table(OVERRIDE_COLUMNS, values, intro);
}

/** Merge a new patch onto an existing override for the same tool. */
export function mergeOverride(existing: ToolOverride | undefined, next: ToolOverride): ToolOverride {
  if (!existing) return next;
  const fields = new Set([...existing.fields, ...next.fields]);
  return { ...next, patch: { ...existing.patch, ...next.patch }, fields: [...fields] };
}

/**
 * Read a submitted patch. Only the keys actually present are written, so a form
 * that posts one field edits one field. An explicit `—` clears a value.
 */
export function readToolPatch(input: Record<string, unknown>): { patch: Partial<ToolRow>; fields: string[] } {
  const patch: Partial<ToolRow> = {};
  const fields: string[] = [];
  for (const f of OVERRIDE_FIELDS) {
    const raw = input[f.input];
    if (raw === undefined || raw === null) continue;
    const text = String(raw).trim();
    if (text === "") continue;
    (patch as Record<string, unknown>)[f.key] =
      text === CLEARED ? (f.key === "users" || f.key === "annualCost" ? null : "") : f.read(text);
    fields.push(f.column);
  }
  return { patch, fields };
}

// ---------------------------------------------------------------- risk

export const RISK_ACTIONS = ["accept", "add"] as const;
export type RiskAction = (typeof RISK_ACTIONS)[number];

export const RISK_ACTION_MEANING: Record<RiskAction, string> = {
  accept: "The factor is known and accepted — it stops counting, and stays on the record with its reason.",
  add: "A risk the register cannot see (end of support, an audit finding, a vendor in trouble), with its own weight.",
};

/** The most a single hand-added factor may weigh — a score is a scale, not a veto. */
export const MAX_MANUAL_WEIGHT = 40;

export interface RiskAdjustment {
  /** Node id of the tool this adjusts. */
  tool: string;
  action: RiskAction;
  /** For `accept`, the derived factor's key. For `add`, the new factor's label. */
  factor: string;
  /** For `add`, its weight, 1…MAX_MANUAL_WEIGHT. Ignored for `accept`. */
  weight: number;
  reason: string;
  by: string;
  date: string;
}

export const RISK_COLUMNS = ["Tool", "Action", "Factor", "Weight", "Reason", "By", "Date"] as const;

/** Parse `landscape/risk.md`. A row that names no tool or no factor is skipped. */
export function parseRiskAdjustments(md: string | undefined): RiskAdjustment[] {
  return rows(md)
    .map((r): RiskAdjustment | null => {
      const tool = r.get("Tool").trim();
      const factor = r.get("Factor").trim();
      const action = oneOf(RISK_ACTIONS, r.get("Action"));
      if (tool === "" || factor === "" || action === "") return null;
      const weight = number(r.get("Weight")) ?? 0;
      return {
        tool,
        action,
        factor,
        weight: Math.max(0, Math.min(MAX_MANUAL_WEIGHT, weight)),
        reason: r.get("Reason"),
        by: r.get("By"),
        date: r.get("Date"),
      };
    })
    .filter((a): a is RiskAdjustment => a !== null);
}

export function serialiseRiskAdjustments(adjustments: readonly RiskAdjustment[], intro: string): string {
  return table(
    RISK_COLUMNS,
    adjustments.map((a) => [a.tool, a.action, a.factor, a.action === "add" ? String(a.weight) : "", a.reason, a.by, a.date]),
    intro,
  );
}

export interface RiskAdjustmentCheck {
  ok: boolean;
  errors: string[];
  adjustment?: RiskAdjustment;
}

/**
 * Validate a submitted adjustment.
 *
 * A REASON is required for both actions, and that is the whole point: accepting a
 * risk without saying why is indistinguishable from hiding it, and a hand-added
 * risk nobody can read is a number with no argument behind it.
 */
export function validateRiskAdjustment(input: Record<string, unknown>, by: string, date: string): RiskAdjustmentCheck {
  const str = (k: string): string => (typeof input[k] === "string" ? (input[k] as string).trim() : "");
  const errors: string[] = [];

  const tool = str("tool");
  if (tool === "") errors.push("Which tool?");
  const action = oneOf(RISK_ACTIONS, str("action"));
  if (action === "") errors.push(`Action must be one of ${RISK_ACTIONS.join(" · ")}.`);
  const factor = str("factor");
  if (factor === "") errors.push(action === "add" ? "Name the risk." : "Which factor?");
  const reason = str("reason");
  if (reason === "") errors.push("A reason is required — an accepted risk with no reason is a hidden risk.");

  const rawWeight = typeof input.weight === "number" ? input.weight : Number(str("weight"));
  const weight = Number.isFinite(rawWeight) ? Math.round(rawWeight) : NaN;
  if (action === "add") {
    if (!Number.isFinite(weight) || weight < 1) errors.push("A hand-added risk needs a weight of at least 1.");
    else if (weight > MAX_MANUAL_WEIGHT) errors.push(`A single factor may weigh at most ${MAX_MANUAL_WEIGHT}.`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    errors: [],
    adjustment: { tool, action: action as RiskAction, factor, weight: action === "add" ? weight : 0, reason, by, date },
  };
}
