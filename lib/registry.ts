/**
 * Registry index — the portal's board cache (`docs/03-data-model.md §3.11`,
 * `docs/12-architecture.md §12.4`).
 *
 * The registry is a CACHE. Truth is each use case's `README.md`; the reconciler
 * (M3) rebuilds this file from the fleet, and it is safe to delete. This module
 * reads and writes the `registry/index.md` table. It never decides anything — it
 * only serialises fleet state for fast board rendering.
 */

import {
  type Heat,
  type Lane,
  type Level,
  type Stage,
  type Status,
} from "./types.js";
import { columnIndex, parseFirstTable } from "./markdown.js";
import { matchEnumLoose } from "./enums.js";

export interface RegistryRow {
  id: string;
  title: string;
  stage?: Stage;
  lane?: Lane;
  status?: Status;
  plant?: string;
  domain?: string;
  level?: Level;
  heat?: Heat;
  sponsor?: string;
  /** Requester email/name — enables the "my demands" self-filter (not analytics). */
  requester?: string;
  valueProjected?: number;
  valueRealized?: number;
  /** ISO date the use case entered its current stage. */
  since?: string;
  /** Confidential use cases appear only to view_all holders (`§4.8`). */
  confidential?: boolean;
  /** True when the source README could not be parsed cleanly. */
  needsAttention?: boolean;
  /** True when the demand is captured in the interim buffer, not yet committed to git. */
  pending?: boolean;
}

const COLUMN_ALIASES: Record<keyof RegistryRow, string[]> = {
  id: ["id"],
  title: ["title"],
  stage: ["stage"],
  lane: ["lane"],
  status: ["status"],
  plant: ["plant"],
  domain: ["domain"],
  level: ["level"],
  heat: ["heat"],
  sponsor: ["sponsor"],
  requester: ["requester"],
  valueProjected: ["value (proj)", "value proj", "value projected"],
  valueRealized: ["value (real)", "value real", "value realized"],
  since: ["since"],
  confidential: ["confidential"],
  needsAttention: ["needs attention"],
  pending: ["pending"],
};

function parseNumber(cell: string | undefined): number | undefined {
  if (!cell) return undefined;
  const cleaned = cell.replace(/[^0-9.-]/g, "");
  if (cleaned === "" || cleaned === "-") return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Parse `registry/index.md` into typed rows. Never throws; unrecognised enum
 * values are left undefined rather than dropping the row — a use case with a bad
 * cell still appears (flagged) rather than vanishing.
 */
export function parseRegistryIndex(markdown: string): RegistryRow[] {
  const table = parseFirstTable(markdown);
  if (!table) return [];

  const idx = (key: keyof RegistryRow): number => {
    for (const alias of COLUMN_ALIASES[key]) {
      const i = columnIndex(table.headers, alias);
      if (i !== -1) return i;
    }
    return -1;
  };

  const cols = {
    id: idx("id"),
    title: idx("title"),
    stage: idx("stage"),
    lane: idx("lane"),
    status: idx("status"),
    plant: idx("plant"),
    domain: idx("domain"),
    level: idx("level"),
    heat: idx("heat"),
    sponsor: idx("sponsor"),
    valueProjected: idx("valueProjected"),
    valueRealized: idx("valueRealized"),
    since: idx("since"),
    confidential: idx("confidential"),
  };

  const cell = (cells: string[], i: number): string | undefined =>
    i >= 0 ? (cells[i] ?? "").trim() || undefined : undefined;

  const rows: RegistryRow[] = [];
  for (const cells of table.rows) {
    const id = cell(cells, cols.id);
    if (!id) continue; // a row without an ID is not a use case
    const row: RegistryRow = {
      id,
      title: cell(cells, cols.title) ?? "",
    };
    row.stage = matchEnumLoose<Stage>(cell(cells, cols.stage), ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]);
    row.lane = matchEnumLoose<Lane>(cell(cells, cols.lane), [
      "run", "regulatory", "continuous_improvement", "transform", "innovation", "data_ai", "local",
    ]);
    row.status = matchEnumLoose<Status>(cell(cells, cols.status), ["active", "parked", "killed", "retired"]);
    row.level = matchEnumLoose<Level>(cell(cells, cols.level), ["L1", "L2"]);
    row.heat = matchEnumLoose<Heat>(cell(cells, cols.heat), ["high", "medium", "low"]);
    const plant = cell(cells, cols.plant);
    if (plant) row.plant = plant;
    const domain = cell(cells, cols.domain);
    if (domain) row.domain = domain;
    const sponsor = cell(cells, cols.sponsor);
    if (sponsor) row.sponsor = sponsor;
    const vp = parseNumber(cell(cells, cols.valueProjected));
    if (vp !== undefined) row.valueProjected = vp;
    const vr = parseNumber(cell(cells, cols.valueRealized));
    if (vr !== undefined) row.valueRealized = vr;
    const since = cell(cells, cols.since);
    if (since) row.since = since;
    const conf = cell(cells, cols.confidential);
    if (conf) row.confidential = /^(yes|true)$/i.test(conf);
    rows.push(row);
  }
  return rows;
}
