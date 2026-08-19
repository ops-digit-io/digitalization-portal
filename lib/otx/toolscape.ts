/**
 * The tool landscape — every application the company runs, across all functions.
 *
 * `landscape.ts` is the OT deep-dive: plant × ISA-95 level, down to the
 * controller, answering "can we read this machine?". This module sits above it
 * and answers a different question: "what does the company run, who owns it, and
 * where is it going?" — the enterprise application portfolio, of which the plant
 * systems are one slice.
 *
 * The inventory is not the point. Anyone can list their applications; the list
 * changes nothing. What changes something is what falls out of the list once
 * `Capability` is a controlled vocabulary:
 *
 *   redundancies()   two tools serving one capability — the consolidation case,
 *                    weighted by the people actually affected
 *   unowned()        no business owner or no IT owner — shadow IT, named
 *   lifecycleDebt()  decided to go, still load-bearing — the gap between the
 *                    decision and the reality
 *   islands()        critical work happening with no integration at all
 *
 * That is why the vocabulary discipline matters more than the row count: a
 * capability invented per tool makes every tool unique, every overlap invisible,
 * and the whole register decorative.
 *
 * Pure: markdown in, data out. NEVER THROWS — a malformed row is kept and marked,
 * per `docs/BUILD.md`. Reading files is `lib/otx/source.ts`.
 */

import { parseFirstTable, columnIndex } from "../markdown.js";

// ---------------------------------------------------------------- vocabulary

/** The TIME model — the decision already taken about a tool. */
export const LIFECYCLES = ["evaluate", "invest", "tolerate", "migrate", "eliminate"] as const;
export type Lifecycle = (typeof LIFECYCLES)[number];

export const LIFECYCLE_MEANING: Record<Lifecycle, string> = {
  evaluate: "Under assessment, not yet in service.",
  invest: "The strategic answer for its capability. Extend it.",
  tolerate: "Fit for purpose, no further investment. Leave alone.",
  migrate: "Being replaced — the successor should be named.",
  eliminate: "Decided to go. Still being here is the finding, not the plan.",
};

/** How far a tool's data travels. Ordinal, mirroring the OT landscape's column. */
export const TOOL_INTEGRATIONS = ["isolated", "file-export", "point-to-point", "api", "hub"] as const;
export type ToolIntegration = (typeof TOOL_INTEGRATIONS)[number];

export const SCOPES = ["global", "regional", "plant", "local"] as const;
export type Scope = (typeof SCOPES)[number];

export const HOSTINGS = ["saas", "private-cloud", "on-prem", "edge"] as const;
export type Hosting = (typeof HOSTINGS)[number];

/** How much stops when the tool does. */
export const CRITICALITIES = ["critical", "important", "standard", "low"] as const;
export type Criticality = (typeof CRITICALITIES)[number];

const INTEGRATION_RANK = new Map<string, number>(TOOL_INTEGRATIONS.map((s, i) => [s, i]));
const CRITICALITY_RANK = new Map<string, number>(CRITICALITIES.map((c, i) => [c, CRITICALITIES.length - 1 - i]));

/** 0…4. An unreadable state ranks 0 — an unreadable claim is not an integration claim. */
export function toolIntegrationRank(state: string): number {
  return INTEGRATION_RANK.get((state ?? "").trim().toLowerCase()) ?? 0;
}
export const MAX_TOOL_INTEGRATION_RANK = TOOL_INTEGRATIONS.length - 1;

/** 3 (critical) … 0 (low). Unreadable ranks 0 so it cannot inflate a finding. */
export function criticalityRank(c: string): number {
  return CRITICALITY_RANK.get((c ?? "").trim().toLowerCase()) ?? 0;
}

/** Lifecycles that mean the tool is on its way out. */
export function isRetiring(l: Lifecycle | ""): boolean {
  return l === "migrate" || l === "eliminate";
}
/** Lifecycles that mean the tool is actually in service today. */
export function isActive(l: Lifecycle | ""): boolean {
  return l === "invest" || l === "tolerate" || l === "migrate" || l === "eliminate";
}

// ---------------------------------------------------------------- rows

export interface ToolRow {
  id: string;
  tool: string;
  vendor: string;
  capability: string;
  domain: string;
  scope: Scope | "";
  hosting: Hosting | "";
  lifecycle: Lifecycle | "";
  integration: ToolIntegration | "";
  businessOwner: string;
  itOwner: string;
  users: number | null;
  criticality: Criticality | "";
  /** Annual run cost in EUR — the budget half of "every tool is a risk or a cost". */
  annualCost: number | null;
  notes: string;
  needsAttention: boolean;
  issues: string[];
}

function norm(v: string | undefined): string {
  return (v ?? "").trim().toLowerCase();
}
function cell(cells: string[], idx: number): string {
  return idx < 0 ? "" : (cells[idx] ?? "").trim();
}

function rows(md: string | undefined): { get: (label: string) => string }[] {
  const table = parseFirstTable(md ?? "");
  if (!table || table.headers.length === 0) return [];
  const idx = new Map<string, number>();
  for (const h of table.headers) idx.set(h.trim().toLowerCase(), columnIndex(table.headers, h));
  return table.rows.map((cells) => ({
    get: (label: string) => cell(cells, idx.get(label.trim().toLowerCase()) ?? -1),
  }));
}

/** Parse `registry/tools.md`. Malformed rows are kept and marked, never dropped. */
export function parseTools(md: string | undefined): ToolRow[] {
  return rows(md)
    .map((r) => {
      const issues: string[] = [];

      const id = r.get("ID");
      if (id === "") issues.push("no ID");

      const tool = r.get("Tool");
      if (tool === "") issues.push("no tool name");

      const capability = r.get("Capability");
      // Without a capability the row cannot take part in any finding — it is
      // inventory and nothing more. That is worth saying out loud.
      if (capability === "") issues.push("no capability — the row cannot be compared with anything");

      const rawScope = norm(r.get("Scope"));
      const scope: Scope | "" = (SCOPES as readonly string[]).includes(rawScope) ? (rawScope as Scope) : "";
      if (scope === "") issues.push(rawScope === "" ? "no scope" : `unreadable scope "${rawScope}"`);

      const rawHosting = norm(r.get("Hosting"));
      const hosting: Hosting | "" = (HOSTINGS as readonly string[]).includes(rawHosting) ? (rawHosting as Hosting) : "";
      if (hosting === "") issues.push(rawHosting === "" ? "no hosting" : `unreadable hosting "${rawHosting}"`);

      const rawLifecycle = norm(r.get("Lifecycle"));
      const lifecycle: Lifecycle | "" = (LIFECYCLES as readonly string[]).includes(rawLifecycle)
        ? (rawLifecycle as Lifecycle)
        : "";
      if (lifecycle === "") issues.push(rawLifecycle === "" ? "no lifecycle" : `unreadable lifecycle "${rawLifecycle}"`);

      const rawIntegration = norm(r.get("Integration"));
      const integration: ToolIntegration | "" = (TOOL_INTEGRATIONS as readonly string[]).includes(rawIntegration)
        ? (rawIntegration as ToolIntegration)
        : "";
      if (integration === "") {
        issues.push(rawIntegration === "" ? "no integration state" : `unreadable integration state "${rawIntegration}"`);
      }

      const rawCriticality = norm(r.get("Criticality"));
      const criticality: Criticality | "" = (CRITICALITIES as readonly string[]).includes(rawCriticality)
        ? (rawCriticality as Criticality)
        : "";
      if (criticality === "") {
        issues.push(rawCriticality === "" ? "no criticality" : `unreadable criticality "${rawCriticality}"`);
      }

      const rawUsers = r.get("Users").replace(/[\s,._]/g, "");
      const users = rawUsers === "" ? null : Number.isFinite(Number(rawUsers)) ? Number(rawUsers) : null;
      if (users === null && rawUsers !== "") issues.push(`unreadable user count "${r.get("Users")}"`);

      // Budget. A tool nobody has costed is not free — it is unbudgeted, which is
      // its own finding, so an absent figure is `null` and says so rather than 0.
      const rawCost = r.get("Annual cost").replace(/[\s,._€]/g, "");
      const annualCost = rawCost === "" ? null : Number.isFinite(Number(rawCost)) ? Number(rawCost) : null;
      if (annualCost === null && rawCost !== "") issues.push(`unreadable annual cost "${r.get("Annual cost")}"`);
      // An ABSENT figure is not a parse issue — it is the "unbudgeted" risk factor
      // (`lib/otx/consolidate.ts`), where it belongs. `needsAttention` stays what it
      // has always been: something in the row could not be read.

      return {
        id,
        tool,
        vendor: r.get("Vendor"),
        capability,
        domain: r.get("Domain"),
        scope,
        hosting,
        lifecycle,
        integration,
        businessOwner: r.get("Business owner"),
        itOwner: r.get("IT owner"),
        users,
        criticality,
        annualCost,
        notes: r.get("Notes"),
        needsAttention: issues.length > 0,
        issues,
      };
    })
    .filter((r) => r.id !== "" || r.tool !== "");
}

// ---------------------------------------------------------------- findings

export interface Redundancy {
  capability: string;
  tools: ToolRow[];
  /** People touched by the overlap — how much the consolidation is worth. */
  users: number;
  /** The `invest` tool, when exactly one is named — the obvious target. */
  target: ToolRow | undefined;
  /** True when nothing in the group is `invest`: an overlap with no decision behind it. */
  undecided: boolean;
}

/**
 * Capabilities served by more than one tool that is still in service.
 *
 * `evaluate` rows are excluded — something under assessment is not yet an
 * overlap, it is the process working. Everything actually running counts,
 * including `migrate`/`eliminate` rows, because a replacement that never
 * finished is precisely the overlap worth seeing.
 *
 * Ordered by affected users: a redundancy between two tools with four users each
 * is not the same problem as one between two tools with two thousand.
 */
export function redundancies(tools: readonly ToolRow[]): Redundancy[] {
  const byCap = new Map<string, ToolRow[]>();
  for (const t of tools) {
    if (t.capability === "" || !isActive(t.lifecycle)) continue;
    const list = byCap.get(t.capability) ?? [];
    list.push(t);
    byCap.set(t.capability, list);
  }
  const out: Redundancy[] = [];
  for (const [capability, list] of byCap) {
    if (list.length < 2) continue;
    const invest = list.filter((t) => t.lifecycle === "invest");
    out.push({
      capability,
      tools: [...list].sort((a, b) => (b.users ?? 0) - (a.users ?? 0)),
      users: list.reduce((a, t) => a + (t.users ?? 0), 0),
      target: invest.length === 1 ? invest[0] : undefined,
      undecided: invest.length === 0,
    });
  }
  return out.sort((a, b) => b.users - a.users || b.tools.length - a.tools.length || (a.capability < b.capability ? -1 : 1));
}

export interface Unowned {
  tool: ToolRow;
  /** Which owner is absent — both is worse than either. */
  missing: ("business" | "IT")[];
}

/**
 * Tools with no named owner. Shadow IT, stated rather than implied.
 *
 * Owners are TEAMS in this register, never people (constraint #6) — so this is a
 * finding about a gap in accountability, never about a person. Worst first:
 * criticality, then users.
 */
export function unowned(tools: readonly ToolRow[]): Unowned[] {
  return tools
    .filter((t) => isActive(t.lifecycle) && (t.businessOwner === "" || t.itOwner === ""))
    .map((t) => ({
      tool: t,
      missing: [
        ...(t.businessOwner === "" ? (["business"] as const) : []),
        ...(t.itOwner === "" ? (["IT"] as const) : []),
      ],
    }))
    .sort(
      (a, b) =>
        b.missing.length - a.missing.length ||
        criticalityRank(b.tool.criticality) - criticalityRank(a.tool.criticality) ||
        (b.tool.users ?? 0) - (a.tool.users ?? 0),
    );
}

export interface Debt {
  tool: ToolRow;
  reason: string;
}

/**
 * Tools decided against that are still carrying real load.
 *
 * The gap between a decision and reality. An `eliminate` row with two users is
 * housekeeping; an `eliminate` row that is `critical`, or that hundreds of people
 * depend on, is a decision nobody executed — and it is usually still there
 * because the successor never covered the case that keeps it alive.
 */
export function lifecycleDebt(tools: readonly ToolRow[], userThreshold = 100): Debt[] {
  return tools
    .filter((t) => isRetiring(t.lifecycle))
    .filter((t) => criticalityRank(t.criticality) >= criticalityRank("important") || (t.users ?? 0) >= userThreshold)
    .map((t) => ({
      tool: t,
      reason:
        t.criticality === "critical"
          ? `Marked "${t.lifecycle}" but still business-critical${t.users ? ` for ~${t.users} people` : ""}.`
          : `Marked "${t.lifecycle}" but still carries ~${t.users ?? 0} users at "${t.criticality}" criticality.`,
    }))
    .sort(
      (a, b) =>
        criticalityRank(b.tool.criticality) - criticalityRank(a.tool.criticality) || (b.tool.users ?? 0) - (a.tool.users ?? 0),
    );
}

/**
 * Critical or important work happening with no integration at all.
 *
 * The enterprise counterpart of the OT landscape's K2.2 backlog: an isolated
 * system is one whose data can only leave by hand, so everything downstream of
 * it is a person retyping.
 */
export function islands(tools: readonly ToolRow[]): ToolRow[] {
  return tools
    .filter((t) => isActive(t.lifecycle) && t.integration === "isolated")
    .filter((t) => criticalityRank(t.criticality) >= criticalityRank("important"))
    .sort((a, b) => criticalityRank(b.criticality) - criticalityRank(a.criticality) || (b.users ?? 0) - (a.users ?? 0));
}

// ---------------------------------------------------------------- rollups

export interface CapabilityRow {
  capability: string;
  tools: number;
  users: number;
  /** Present at these scopes. */
  scopes: Scope[];
  /** Mean integration rank across the capability's active tools, 0…4. */
  integration: number | null;
  redundant: boolean;
  /** The `invest` tool for this capability, when exactly one is named. */
  target: string | undefined;
}

/** The capability spine, most-served first. The grid the surface renders. */
export function byCapability(tools: readonly ToolRow[]): CapabilityRow[] {
  const names = [...new Set(tools.map((t) => t.capability).filter((c) => c !== ""))];
  const red = new Map(redundancies(tools).map((r) => [r.capability, r]));
  return names
    .map((capability) => {
      const mine = tools.filter((t) => t.capability === capability);
      const active = mine.filter((t) => isActive(t.lifecycle));
      const invest = mine.filter((t) => t.lifecycle === "invest");
      return {
        capability,
        tools: mine.length,
        users: mine.reduce((a, t) => a + (t.users ?? 0), 0),
        scopes: SCOPES.filter((s) => mine.some((t) => t.scope === s)),
        integration:
          active.length === 0
            ? null
            : Math.round((active.reduce((a, t) => a + toolIntegrationRank(t.integration), 0) / active.length) * 10) / 10,
        redundant: red.has(capability),
        target: invest.length === 1 ? invest[0]!.tool : undefined,
      };
    })
    .sort((a, b) => b.users - a.users || b.tools - a.tools || (a.capability < b.capability ? -1 : 1));
}

export interface DomainRow {
  domain: string;
  tools: number;
  users: number;
  capabilities: number;
  redundancies: number;
}

/** Rollup by business domain — reuses the taxonomy in `registry/domains.md`. */
export function byDomain(tools: readonly ToolRow[]): DomainRow[] {
  const red = new Set(redundancies(tools).map((r) => r.capability));
  const names = [...new Set(tools.map((t) => t.domain).filter((d) => d !== ""))];
  return names
    .map((domain) => {
      const mine = tools.filter((t) => t.domain === domain);
      const caps = new Set(mine.map((t) => t.capability).filter((c) => c !== ""));
      return {
        domain,
        tools: mine.length,
        users: mine.reduce((a, t) => a + (t.users ?? 0), 0),
        capabilities: caps.size,
        redundancies: [...caps].filter((c) => red.has(c)).length,
      };
    })
    .sort((a, b) => b.redundancies - a.redundancies || b.tools - a.tools || (a.domain < b.domain ? -1 : 1));
}

export interface ToolscapeSummary {
  tools: number;
  active: number;
  capabilities: number;
  /** Capabilities served by more than one tool in service. */
  redundant: number;
  /** People touched by at least one redundancy. */
  redundantUsers: number;
  unowned: number;
  debt: number;
  islands: number;
  /** Mean integration rank across active tools, as a percentage. */
  integration: number | null;
  needsAttention: number;
}

export function summariseTools(tools: readonly ToolRow[]): ToolscapeSummary {
  const active = tools.filter((t) => isActive(t.lifecycle));
  const red = redundancies(tools);
  return {
    tools: tools.length,
    active: active.length,
    capabilities: new Set(tools.map((t) => t.capability).filter((c) => c !== "")).size,
    redundant: red.length,
    redundantUsers: red.reduce((a, r) => a + r.users, 0),
    unowned: unowned(tools).length,
    debt: lifecycleDebt(tools).length,
    islands: islands(tools).length,
    integration:
      active.length === 0
        ? null
        : Math.round(
            (active.reduce((a, t) => a + toolIntegrationRank(t.integration), 0) / active.length / MAX_TOOL_INTEGRATION_RANK) *
              100,
          ),
    needsAttention: tools.filter((t) => t.needsAttention).length,
  };
}

// ---------------------------------------------------------------- writing

/**
 * The register's column contract, in order. ONE definition, used to parse
 * (`registry/tools.md`'s header), to render a manually added tool back to
 * markdown, and to tell a form which fields exist — so the three can never
 * disagree about what a tool row is.
 */
export const TOOL_COLUMNS = [
  "ID", "Tool", "Vendor", "Capability", "Domain", "Scope", "Hosting", "Lifecycle",
  "Integration", "Business owner", "IT owner", "Users", "Criticality", "Annual cost", "Notes",
] as const;

/** A blank row — every field empty, nothing invented. */
export function emptyToolRow(): ToolRow {
  return {
    id: "", tool: "", vendor: "", capability: "", domain: "", scope: "", hosting: "",
    lifecycle: "", integration: "", businessOwner: "", itOwner: "", users: null,
    criticality: "", annualCost: null, notes: "", needsAttention: false, issues: [],
  };
}

/** Table cells must not carry `|` or newlines, or the row would break the table. */
function cellSafe(v: string): string {
  return v.replace(/\r?\n/g, " ").replace(/\|/g, "/").trim();
}

/** One markdown table row, in `TOOL_COLUMNS` order. */
function toolRowMarkdown(t: ToolRow): string {
  const v = [
    t.id, t.tool, t.vendor, t.capability, t.domain, t.scope, t.hosting, t.lifecycle,
    t.integration, t.businessOwner, t.itOwner,
    t.users === null ? "" : String(t.users),
    t.criticality,
    t.annualCost === null ? "" : String(t.annualCost),
    t.notes,
  ].map((x) => cellSafe(String(x ?? "")));
  return `| ${v.join(" | ")} |`;
}

/**
 * Render tools as a markdown table under a heading — the format the portal WRITES
 * when a tool is added by hand, and the same format `parseTools` reads. The
 * register stays markdown in git either way (constraint #4): a tool added in the
 * portal is a diff a human can review, not a database row nobody sees.
 */
export function serialiseTools(tools: readonly ToolRow[], intro: string): string {
  const header = `| ${TOOL_COLUMNS.join(" | ")} |`;
  const sep = `|${TOOL_COLUMNS.map(() => "---").join("|")}|`;
  return `${intro.trimEnd()}\n\n${header}\n${sep}\n${tools.map(toolRowMarkdown).join("\n")}\n`;
}

/** The next free `APP-NNN` id, given every id already taken across all sources. */
export function nextToolId(existing: readonly string[], prefix = "APP"): string {
  const re = new RegExp(`^${prefix}-(\\d+)$`, "i");
  const max = existing.reduce((m, id) => {
    const n = Number(re.exec(id.trim())?.[1] ?? NaN);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

export interface ToolValidation {
  ok: boolean;
  errors: string[];
  /** Readable but questionable — saved anyway, shown next to the row. */
  warnings: string[];
  row: ToolRow;
}

const ONE_OF = <T extends string>(allowed: readonly T[], raw: string): T | "" =>
  ((allowed as readonly string[]).includes(raw.trim().toLowerCase()) ? (raw.trim().toLowerCase() as T) : "");

/**
 * Validate and normalise a tool submitted from the portal.
 *
 * REFUSES only what makes the row useless: no name, or a capability missing —
 * without a capability the tool takes part in no finding, which is the one thing
 * this register exists to produce. Everything else is a WARNING that travels with
 * the row, because a half-known tool recorded is worth more than a perfect tool
 * nobody wrote down.
 */
export function validateTool(input: Record<string, unknown>, id: string): ToolValidation {
  const str = (k: string): string => (typeof input[k] === "string" ? (input[k] as string).trim() : "");
  const num = (k: string): number | null => {
    const raw = typeof input[k] === "number" ? String(input[k]) : str(k).replace(/[\s,._€]/g, "");
    if (raw === "") return null;
    return Number.isFinite(Number(raw)) ? Number(raw) : null;
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  const tool = str("tool");
  if (tool === "") errors.push("A tool needs a name.");
  const capability = str("capability");
  if (capability === "") {
    errors.push("A tool needs a capability — without one it can be compared with nothing, and every finding here works by comparison.");
  }

  const scope = ONE_OF(SCOPES, str("scope"));
  if (scope === "") warnings.push(`Scope is not one of ${SCOPES.join(" · ")} — left blank.`);
  const hosting = ONE_OF(HOSTINGS, str("hosting"));
  if (hosting === "") warnings.push(`Hosting is not one of ${HOSTINGS.join(" · ")} — left blank.`);
  const lifecycle = ONE_OF(LIFECYCLES, str("lifecycle"));
  if (lifecycle === "") warnings.push(`Lifecycle is not one of ${LIFECYCLES.join(" · ")} — left blank.`);
  const integration = ONE_OF(TOOL_INTEGRATIONS, str("integration"));
  if (integration === "") warnings.push(`Integration is not one of ${TOOL_INTEGRATIONS.join(" · ")} — left blank.`);
  const criticality = ONE_OF(CRITICALITIES, str("criticality"));
  if (criticality === "") warnings.push(`Criticality is not one of ${CRITICALITIES.join(" · ")} — left blank.`);

  const users = num("users");
  const annualCost = num("annualCost");
  if (annualCost === null) warnings.push("No annual cost — the tool will show as unbudgeted.");
  const businessOwner = str("businessOwner");
  const itOwner = str("itOwner");
  if (businessOwner === "" || itOwner === "") warnings.push("An owner is missing — the tool will show as shadow IT.");

  const row: ToolRow = {
    id: id.trim(),
    tool,
    vendor: str("vendor"),
    capability,
    domain: str("domain"),
    scope,
    hosting,
    lifecycle,
    integration,
    businessOwner,
    itOwner,
    users,
    criticality,
    annualCost,
    notes: str("notes"),
    needsAttention: false,
    issues: [],
  };
  // The row carries its own warnings, exactly as a malformed markdown row does.
  row.issues = warnings;
  row.needsAttention = warnings.length > 0;

  return { ok: errors.length === 0, errors, warnings, row };
}
