/**
 * The system landscape — the as-is half of the IT/OT integration roadmap.
 *
 * Reads `registry/landscape.md` and `registry/plants.md` (markdown tables, edited
 * by hand) and derives what the roadmap actually needs:
 *
 *   1. per-plant UNS maturity, from the ORDINAL `Integration` column
 *   2. the K2.2 backlog — systems whose `Interface` is `none`, ranked by how much
 *      they block
 *
 * (2) is the point. The process funnel already refuses to optimise a process whose
 * systems cannot be read: `K2.2 Interface-Zugänglichkeit` and `K5.1
 * Timestamp-Farmbarkeit` are its two `optimisation` knockouts, and branch `Z1b`
 * says an inaccessible interface "zahlt per Compounding auf jeden weiteren Prozess
 * am selben System ein". That argument was written with nowhere to land — nothing
 * recorded WHICH system caused a shelved engagement. This module is where it lands.
 *
 * Pure and dependency-light: every function takes markdown in and gives data out,
 * so the whole thing is unit-tested without IO or a model. Reading files is
 * `lib/otx/source.ts`.
 *
 * NEVER THROWS (`docs/BUILD.md`): a malformed row is kept and marked
 * `needsAttention` with the reason, exactly as the use-case parser keeps an
 * unreadable state section on the board rather than letting it vanish.
 */

import { parseFirstTable, columnIndex } from "../markdown.js";

// ---------------------------------------------------------------- vocabulary

/**
 * How far a system's data has travelled towards the namespace. ORDINAL — the
 * index IS the maturity, which is why per-plant maturity can be derived rather
 * than stored and so cannot drift from the rows.
 */
export const INTEGRATION_STATES = [
  "none",
  "file-export",
  "point-to-point",
  "broker-published",
  "uns-modelled",
] as const;
export type IntegrationState = (typeof INTEGRATION_STATES)[number];

/** ISA-95 / Purdue levels, L0 (sensor/actuator) … L4 (ERP). */
export const ISA_LEVELS = ["L0", "L1", "L2", "L3", "L4"] as const;
export type IsaLevel = (typeof ISA_LEVELS)[number];

/** What a consumer can actually read the system through. `none` is the K2.2 knockout. */
export const INTERFACES = ["OPC-UA", "MQTT", "REST", "SQL", "CSV", "none"] as const;
export type InterfaceKind = (typeof INTERFACES)[number];

/** Site role in the rollout sequence (`registry/plants.md`). */
export const SITE_ROLES = ["lead", "wave-1", "wave-2", "reference"] as const;
export type SiteRole = (typeof SITE_ROLES)[number];

const INTEGRATION_RANK = new Map<string, number>(INTEGRATION_STATES.map((s, i) => [s, i]));

/** 0…4. Unknown states rank 0 — an unreadable claim is not a maturity claim. */
export function integrationRank(state: string): number {
  return INTEGRATION_RANK.get(normalise(state)) ?? 0;
}

/** The top rank, so callers can express maturity as a percentage without a magic number. */
export const MAX_INTEGRATION_RANK = INTEGRATION_STATES.length - 1;

// ---------------------------------------------------------------- rows

export interface SystemRow {
  plant: string;
  level: IsaLevel | "";
  system: string;
  vendor: string;
  role: string;
  integration: IntegrationState | "";
  iface: InterfaceKind | "";
  topicRoot: string;
  dataOwner: string;
  freshness: string;
  barrier: string;
  /** The row is kept and shown, but something about it could not be read. */
  needsAttention: boolean;
  /** Why, in plain words — rendered next to the row. */
  issues: string[];
}

export interface PlantRow {
  code: string;
  name: string;
  country: string;
  region: string;
  siteRole: SiteRole | "";
  opsItOwner: string;
  notes: string;
  needsAttention: boolean;
  issues: string[];
}

function normalise(v: string | undefined): string {
  return (v ?? "").trim().toLowerCase();
}
function cell(cells: string[], idx: number): string {
  return idx < 0 ? "" : (cells[idx] ?? "").trim();
}

/**
 * Rows of the first table in a registry master, as header→value records.
 * Undefined input, no table, or a header-only table all yield `[]` — never a throw.
 */
function rows(md: string | undefined): { get: (label: string) => string }[] {
  const table = parseFirstTable(md ?? "");
  if (!table || table.headers.length === 0) return [];
  const idx = new Map<string, number>();
  for (const h of table.headers) idx.set(h.trim().toLowerCase(), columnIndex(table.headers, h));
  return table.rows.map((cells) => ({
    get: (label: string) => cell(cells, idx.get(label.trim().toLowerCase()) ?? -1),
  }));
}

// ---------------------------------------------------------------- parsing

/** Parse `registry/landscape.md`. Malformed rows are kept and marked, never dropped. */
export function parseLandscape(md: string | undefined): SystemRow[] {
  return rows(md)
    .map((r) => {
      const issues: string[] = [];

      const plant = r.get("Plant");
      if (plant === "") issues.push("no plant code");

      const system = r.get("System");
      if (system === "" || system === "—") issues.push("no system named");

      const rawLevel = r.get("ISA-95").toUpperCase();
      const level: IsaLevel | "" = (ISA_LEVELS as readonly string[]).includes(rawLevel) ? (rawLevel as IsaLevel) : "";
      if (level === "") issues.push(rawLevel === "" ? "no ISA-95 level" : `unreadable ISA-95 level "${rawLevel}"`);

      const rawIntegration = normalise(r.get("Integration"));
      const integration: IntegrationState | "" = (INTEGRATION_STATES as readonly string[]).includes(rawIntegration)
        ? (rawIntegration as IntegrationState)
        : "";
      if (integration === "") {
        issues.push(rawIntegration === "" ? "no integration state" : `unreadable integration state "${rawIntegration}"`);
      }

      const rawIface = r.get("Interface");
      const iface: InterfaceKind | "" =
        (INTERFACES.find((i) => i.toLowerCase() === normalise(rawIface)) as InterfaceKind | undefined) ?? "";
      if (iface === "") issues.push(rawIface === "" ? "no interface" : `unreadable interface "${rawIface}"`);

      return {
        plant,
        level,
        system,
        vendor: r.get("Vendor"),
        role: r.get("Role"),
        integration,
        iface,
        topicRoot: r.get("UNS topic root"),
        dataOwner: r.get("Data owner"),
        freshness: r.get("Freshness"),
        barrier: r.get("Barrier"),
        needsAttention: issues.length > 0,
        issues,
      };
    })
    // A row with nothing in it at all is a formatting artifact, not a finding.
    .filter((r) => r.plant !== "" || r.system !== "");
}

/** Parse `registry/plants.md`. Same never-throw contract. */
export function parsePlants(md: string | undefined): PlantRow[] {
  return rows(md)
    .map((r) => {
      const issues: string[] = [];
      const code = r.get("Code");
      if (code === "") issues.push("no plant code");

      const rawRole = normalise(r.get("Site role"));
      const siteRole = (SITE_ROLES as readonly string[]).includes(rawRole) ? (rawRole as SiteRole) : "";
      if (siteRole === "" && code !== "ALL") {
        issues.push(rawRole === "" ? "no site role" : `unreadable site role "${rawRole}"`);
      }

      return {
        code,
        name: r.get("Name"),
        country: r.get("Country"),
        region: r.get("Region"),
        siteRole: siteRole as SiteRole | "",
        opsItOwner: r.get("Ops IT owner"),
        notes: r.get("Notes"),
        needsAttention: issues.length > 0,
        issues,
      };
    })
    .filter((r) => r.code !== "");
}

// ---------------------------------------------------------------- derivation

export interface LevelMaturity {
  level: IsaLevel;
  systems: number;
  /** Mean integration rank across the level's systems, 0…4. `null` when none. */
  rank: number | null;
  /** Systems at this level with no readable interface. */
  blocked: number;
}

export interface PlantMaturity {
  plant: string;
  systems: number;
  /** 0…100, derived from the mean integration rank. `null` when the plant has no systems. */
  maturity: number | null;
  byLevel: LevelMaturity[];
  /** Systems with `Interface = none` — the K2.2 backlog for this plant. */
  blocked: number;
  /** True once at least one system publishes to a modelled namespace. */
  hasNamespace: boolean;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Per-plant UNS maturity, derived from the ordinal integration column. */
export function plantMaturity(systems: readonly SystemRow[], plant: string): PlantMaturity {
  const mine = systems.filter((s) => s.plant === plant);
  const byLevel: LevelMaturity[] = ISA_LEVELS.map((level) => {
    const at = mine.filter((s) => s.level === level);
    return {
      level,
      systems: at.length,
      rank: at.length === 0 ? null : round1(at.reduce((a, s) => a + integrationRank(s.integration), 0) / at.length),
      blocked: at.filter(isBlocked).length,
    };
  });

  const maturity =
    mine.length === 0
      ? null
      : Math.round(
          (mine.reduce((a, s) => a + integrationRank(s.integration), 0) / mine.length / MAX_INTEGRATION_RANK) * 100,
        );

  return {
    plant,
    systems: mine.length,
    maturity,
    byLevel,
    blocked: mine.filter(isBlocked).length,
    hasNamespace: mine.some((s) => s.integration === "uns-modelled"),
  };
}

/** Every plant present in the landscape, most-blocked first, then least mature. */
export function maturityByPlant(systems: readonly SystemRow[]): PlantMaturity[] {
  const codes = [...new Set(systems.map((s) => s.plant).filter((p) => p !== ""))];
  return codes
    .map((p) => plantMaturity(systems, p))
    .sort((a, b) => b.blocked - a.blocked || (a.maturity ?? 0) - (b.maturity ?? 0) || (a.plant < b.plant ? -1 : 1));
}

/**
 * A system nobody can read. This is the funnel's K2.2 level-1 condition — "kein
 * technischer Zugang und kein benennbarer Freigabeweg" — expressed as data.
 */
export function isBlocked(s: SystemRow): boolean {
  return s.iface === "none" || s.integration === "none";
}

export interface Blocker extends SystemRow {
  /** Ordinal position in the backlog — lower is more urgent. */
  rank: number;
}

/**
 * The UNS backlog: systems with no readable interface, worst first.
 *
 * Ordered by ISA-95 level DESCENDING, because a blocked L3 historian denies data
 * to every process in the plant while a blocked L1 controller denies it to one
 * line — the compounding argument from branch `Z1`, made operational.
 */
export function blockers(systems: readonly SystemRow[]): Blocker[] {
  const levelWeight = (l: IsaLevel | ""): number => (l === "" ? -1 : ISA_LEVELS.indexOf(l));
  return systems
    .filter(isBlocked)
    .sort(
      (a, b) =>
        levelWeight(b.level) - levelWeight(a.level) ||
        (a.plant < b.plant ? -1 : a.plant > b.plant ? 1 : 0) ||
        (a.system < b.system ? -1 : 1),
    )
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

// ---------------------------------------------------------------- namespace

/** Where a namespace segment stands: drafted → signed off → actually published. */
export const UNS_STATUSES = ["proposed", "agreed", "published"] as const;
export type UnsStatus = (typeof UNS_STATUSES)[number];

export interface UnsRow {
  level: string;
  segment: string;
  example: string;
  owner: string;
  standardRef: string;
  status: UnsStatus | "";
  needsAttention: boolean;
  issues: string[];
}

/** Parse `registry/uns.md` — the topic convention. Same never-throw contract. */
export function parseUns(md: string | undefined): UnsRow[] {
  return rows(md)
    .map((r) => {
      const issues: string[] = [];
      const rawStatus = normalise(r.get("Status"));
      const status = (UNS_STATUSES as readonly string[]).includes(rawStatus) ? (rawStatus as UnsStatus) : "";
      if (status === "") issues.push(rawStatus === "" ? "no status" : `unreadable status "${rawStatus}"`);

      const example = r.get("Example topic");
      if (example === "") issues.push("no example topic");

      return {
        level: r.get("Level"),
        segment: r.get("Segment"),
        example,
        owner: r.get("Owner"),
        standardRef: r.get("Standard ref"),
        status: status as UnsStatus | "",
        needsAttention: issues.length > 0,
        issues,
      };
    })
    .filter((r) => r.level !== "" || r.segment !== "");
}

/**
 * How far the CONVENTION itself has got, independent of any plant: the share of
 * segments that are actually published. A namespace agreed on paper and published
 * nowhere is a strategy, not a namespace — this is the number that says which.
 */
export function unsConventionProgress(uns: readonly UnsRow[]): { published: number; agreed: number; proposed: number; percent: number | null } {
  const count = (s: UnsStatus) => uns.filter((u) => u.status === s).length;
  const scored = uns.filter((u) => u.status !== "").length;
  const published = count("published");
  return {
    published,
    agreed: count("agreed"),
    proposed: count("proposed"),
    percent: scored === 0 ? null : Math.round((published / scored) * 100),
  };
}

export interface LandscapeSummary {
  plants: number;
  systems: number;
  blocked: number;
  /** Plants with at least one `uns-modelled` system. */
  withNamespace: number;
  /** Mean maturity across plants that have systems, 0…100. `null` when empty. */
  meanMaturity: number | null;
  needsAttention: number;
}

export function summarise(systems: readonly SystemRow[]): LandscapeSummary {
  const per = maturityByPlant(systems);
  const scored = per.filter((p) => p.maturity !== null);
  return {
    plants: per.length,
    systems: systems.length,
    blocked: systems.filter(isBlocked).length,
    withNamespace: per.filter((p) => p.hasNamespace).length,
    meanMaturity: scored.length === 0 ? null : Math.round(scored.reduce((a, p) => a + (p.maturity ?? 0), 0) / scored.length),
    needsAttention: systems.filter((s) => s.needsAttention).length,
  };
}
