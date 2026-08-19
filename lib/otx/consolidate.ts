/**
 * ONE register of everything that behaves like a tool.
 *
 * Before this module there were two answers to "what do we run?" — the enterprise
 * application register (`toolscape.ts`, from `registry/tools.md`) and the plant
 * system landscape (`landscape.ts`, from `registry/landscape.md`) — and a third
 * that lived nowhere: the tool a use case names on the way past. So a tool could
 * be load-bearing in three places and governed in none, which is the whole
 * problem, because **every tool is a risk and a cost** whether or not somebody
 * remembered to file it.
 *
 * This module consolidates four SOURCES into one list of `ToolEntry`:
 *
 *   register   `registry/tools.md`      — the curated master, hand-edited in git
 *   plant      `registry/landscape.md`  — a system running in a plant
 *   manual     `landscape/tools.md`     — added by hand in the portal, git-backed
 *   use-case   a demand naming a tool   — declared in `## State` or mentioned
 *
 * A tool present in several sources is ONE entry: the register row carries it,
 * the plant rows become its installations, the demands become its exposure. A
 * tool present in only one is still an entry — and which source it came from is
 * itself the finding (a plant system nobody registered, a use case building on a
 * tool nobody owns).
 *
 * NOT a source, deliberately: the free text of a process engagement. An engagement
 * records no structured system field, so pulling tools out of it would mean
 * guessing from prose across every section file of every engagement — expensive to
 * read and unreliable enough to put wrong rows on a register people are meant to
 * act on. When an engagement's diagnosis becomes a demand, the demand declares the
 * tools, and they land here through the path above.
 *
 * On top of the consolidated list two things are DERIVED, never stored, so they
 * cannot drift from the rows:
 *
 *   risk()      why this tool is exposed, as weighted factors in plain words
 *   budget()    what the portfolio costs, and what the findings cost
 *
 * Pure: markdown-parsed rows in, data out. NEVER THROWS (`docs/BUILD.md`).
 */

import {
  MAX_TOOL_INTEGRATION_RANK,
  criticalityRank,
  isActive,
  isRetiring,
  redundancies,
  toolIntegrationRank,
  type ToolRow,
} from "./toolscape.js";
import { ISA_LEVELS, isBlocked, type IsaLevel, type SystemRow } from "./landscape.js";

// ---------------------------------------------------------------- sources

/** Where an entry came from. The order is the order of authority. */
export const TOOL_ORIGINS = ["register", "manual", "plant", "use-case"] as const;
export type ToolOrigin = (typeof TOOL_ORIGINS)[number];

export const ORIGIN_MEANING: Record<ToolOrigin, string> = {
  register: "In the curated application register (`registry/tools.md`).",
  manual: "Added by hand in the portal — recorded, not yet reviewed into the master.",
  plant: "Running in a plant, in the OT landscape, but in no application register.",
  "use-case": "Named by a use case and found in no register at all.",
};

/** A demand, reduced to what consolidation needs. */
export interface DemandDoc {
  id: string;
  title: string;
  /** The demand's `README.md`, verbatim. */
  markdown: string;
}

/** How a use case came to reference a tool. */
export type ReferenceKind = "declared" | "mentioned";

export interface UseCaseRef {
  id: string;
  title: string;
  /**
   * `declared` — the demand names it in `## State` (`- **Tools:** …`), which is a
   * statement. `mentioned` — the name appears in the demand's prose, which is a
   * hint. Both are shown; only the first is treated as a claim.
   */
  kind: ReferenceKind;
}

// ---------------------------------------------------------------- entries

export interface ToolEntry extends ToolRow {
  origin: ToolOrigin;
  /** Every source this tool was found in, in `TOOL_ORIGINS` order. */
  sources: ToolOrigin[];
  /** The plant systems that ARE this tool — the OT depth beneath the row. */
  installations: SystemRow[];
  /** Plant codes it runs at, from the installations. */
  plants: string[];
  /** Use cases that build on it. */
  useCases: UseCaseRef[];
  risk: RiskAssessment;
}

// ---------------------------------------------------------------- matching

const STOP_WORDS = new Set(["the", "and", "for", "gmbh", "inc", "ltd", "line", "cell", "local"]);

/** Words of length ≥ 3, lower-cased, punctuation dropped, stop words removed. */
export function tokens(v: string): Set<string> {
  const out = new Set<string>();
  for (const w of (v ?? "").toLowerCase().split(/[^a-z0-9]+/)) {
    if (w.length >= 3 && !STOP_WORDS.has(w)) out.add(w);
  }
  return out;
}

function overlaps(a: Set<string>, b: Set<string>): boolean {
  for (const w of a) if (b.has(w)) return true;
  return false;
}

/**
 * A landscape row that records an ABSENCE rather than a system — "no historian on
 * site", "no MES, order execution on paper travellers". They are written as a row
 * with no vendor and no role so the gap is visible per plant; they are not
 * installations of anything, and must not become tools.
 */
export function isAbsenceRow(s: SystemRow): boolean {
  const dash = (v: string) => v.trim() === "" || v.trim() === "—" || v.trim() === "-";
  return dash(s.vendor) && dash(s.role);
}

/**
 * Does this plant system IS-A this registered tool?
 *
 * Two conditions, both required, because either alone is wrong: the vendor must
 * overlap (so "SCADA extrusion @ Siemens WinCC" cannot land on "Ignition"), AND
 * the system's own words must appear in the tool's name or capability (so "MES @
 * Local vendor" cannot land on "Local CMMS (Suzhou)" merely because both are
 * local). Deliberately conservative: a missed match shows up as a register gap,
 * which is honest, while a wrong match hides a system inside the wrong tool.
 */
function systemMatchesTool(s: SystemRow, t: ToolRow): boolean {
  const vendorHit = overlaps(tokens(s.vendor), tokens(`${t.vendor} ${t.tool}`));
  if (!vendorHit) return false;
  return overlaps(tokens(s.system), tokens(`${t.tool} ${t.capability}`));
}

/** The best registered tool for a plant system, or `undefined`. */
function matchSystem(s: SystemRow, tools: readonly ToolRow[]): ToolRow | undefined {
  const hits = tools.filter((t) => systemMatchesTool(s, t));
  if (hits.length === 0) return undefined;
  // Prefer the tool whose capability IS the system's kind, then the biggest.
  const kind = tokens(s.system);
  const exact = hits.filter((t) => overlaps(kind, tokens(t.capability)));
  const pool = exact.length > 0 ? exact : hits;
  return [...pool].sort((a, b) => (b.users ?? 0) - (a.users ?? 0))[0];
}

/** The key several plant rows of the same system share (one entry, many plants). */
function systemKey(s: SystemRow): string {
  return `${s.system}|${s.vendor}`.toLowerCase().trim();
}

// ---------------------------------------------------------------- use cases

/**
 * The tools a demand DECLARES: `- **Tools:** SAP S/4HANA, Power BI` in its
 * `## State` block. The use-case parser keeps unknown `## State` keys rather than
 * failing on them, which is exactly why this needed no parser change — a demand
 * that names its tools is readable by every existing reader too.
 */
export function declaredTools(markdown: string): string[] {
  const line = /^\s*[-*+]\s+\*\*(?:Tools|Systems|Tools & systems)\s*:\*\*\s*(.*)$/im.exec(markdown ?? "");
  const raw = line?.[1] ?? "";
  return raw
    .split(/[,;·]/)
    .map((v) => v.replace(/`/g, "").trim())
    .filter((v) => v !== "" && v !== "—" && !v.startsWith("<!--"));
}

/**
 * Case-insensitive whole-name occurrence — "PI" must not match "pipeline".
 *
 * `lower` is the markdown lower-cased once per demand, and the cheap `includes`
 * runs first: this is called once per (demand × entry), so the regex must only be
 * built for the handful of names that could actually be there.
 */
function mentions(lower: string, name: string): boolean {
  const n = name.trim();
  if (n.length < 4) return false; // too short to mention safely
  if (!lower.includes(n.toLowerCase())) return false;
  const esc = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, "i").test(lower);
}

// ---------------------------------------------------------------- risk

export const RISK_BANDS = ["low", "elevated", "high", "critical"] as const;
export type RiskBand = (typeof RISK_BANDS)[number];

export interface RiskFactor {
  key: string;
  /** Why this is a risk, in the words a steering committee would use. */
  label: string;
  weight: number;
}

export interface RiskAssessment {
  /** 0…100. The sum of the factors, capped. */
  score: number;
  band: RiskBand;
  factors: RiskFactor[];
}

export function riskBand(score: number): RiskBand {
  return score >= 60 ? "critical" : score >= 40 ? "high" : score >= 20 ? "elevated" : "low";
}

/**
 * Why a tool is exposed — derived from the register's own facts, never a stored
 * rating, so it cannot drift from the rows and nobody can quietly downgrade it.
 *
 * The factors are the findings this register already makes, priced: an unowned
 * tool, an island, a decision nobody executed, a tool that exists in the plants
 * or in a use case but in no register, a capability with no decision behind it,
 * and a tool nobody has costed. Criticality and headcount SCALE the factors
 * rather than adding one of their own — a critical tool is not a risk for being
 * critical; it is a risk when something is wrong with a critical tool.
 */
export function assessRisk(
  t: ToolRow,
  ctx: { origin: ToolOrigin; installations: readonly SystemRow[]; useCases: readonly UseCaseRef[]; overlapping: boolean },
): RiskAssessment {
  const factors: RiskFactor[] = [];
  // 1 (low) … 2 (critical). Nothing is scaled to zero — an unowned tool with an
  // unreadable criticality is still unowned.
  const weightOf = (base: number): number => Math.round(base * (1 + criticalityRank(t.criticality) / 3));

  if (ctx.origin === "use-case") {
    factors.push({
      key: "unregistered",
      label: `Named by ${ctx.useCases.length} use case(s) and in no register — nobody owns it, nobody budgeted it.`,
      weight: 30,
    });
  } else if (ctx.origin === "plant") {
    // Weighted by ISA-95 level, because "not in the application register" does not
    // mean the same thing at every level: an L3/L4 system missing from it is a
    // governance gap, while an application register was never meant to carry every
    // controller on every line. Without this the register drowns in PLCs and the
    // one unregistered MES is invisible — which is the failure mode this page exists
    // to prevent.
    const top = ctx.installations.reduce((m, i) => Math.max(m, ISA_LEVELS.indexOf(i.level as IsaLevel)), -1);
    const weight = top >= 3 ? 20 : top === 2 ? 12 : 5;
    factors.push({
      key: "off-register",
      label:
        top >= 3
          ? "Runs in the plants at L3/L4 and appears in no application register — outside licence, lifecycle and security review."
          : "Runs in the plants and appears in no application register — expected for control-level equipment, listed so nothing is invisible.",
      weight,
    });
  } else if (ctx.origin === "manual") {
    factors.push({
      key: "unreviewed",
      label: "Recorded in the portal, not yet reviewed into the curated register.",
      weight: 10,
    });
  }

  if (isActive(t.lifecycle) || ctx.origin !== "register") {
    // The OT landscape has one owner column (`Data owner`), not two, so a plant
    // system is judged on that alone — a missing "business owner" there is a column
    // that does not exist, not a gap in accountability.
    const missing =
      ctx.origin === "plant"
        ? (t.itOwner === "" ? ["data"] : [])
        : [t.businessOwner === "" ? "business" : "", t.itOwner === "" ? "IT" : ""].filter(Boolean);
    if (missing.length > 0) {
      factors.push({
        key: "unowned",
        label: `No ${missing.join(" and no ")} owner — shadow IT: no one is accountable when it fails or renews.`,
        weight: weightOf(missing.length === 2 ? 15 : 10),
      });
    }
  }

  if (isActive(t.lifecycle) && t.integration === "isolated") {
    factors.push({
      key: "island",
      label: "Isolated — data leaves only by hand, so everything downstream is a person retyping.",
      weight: weightOf(10),
    });
  }

  if (isRetiring(t.lifecycle) && (criticalityRank(t.criticality) >= criticalityRank("important") || (t.users ?? 0) >= 100)) {
    factors.push({
      key: "lifecycle-debt",
      label: `Marked "${t.lifecycle}" and still load-bearing — a decision nobody executed.`,
      weight: weightOf(12),
    });
  }

  // A plant system has no lifecycle column to leave blank, so its silence is not a
  // missing decision — the OT register simply does not model one.
  if (t.lifecycle === "" && ctx.origin !== "plant") {
    factors.push({
      key: "undecided",
      label: "No lifecycle decision on record — nobody has said whether this tool has a future.",
      weight: 8,
    });
  }

  if (ctx.overlapping) {
    factors.push({
      key: "overlap",
      label: `Shares its capability (${t.capability}) with another tool in service — paid for twice.`,
      weight: 8,
    });
  }

  const blocked = ctx.installations.filter(isBlocked);
  if (blocked.length > 0) {
    factors.push({
      key: "unreadable",
      label: `Unreadable at ${blocked.length} plant installation(s) — no interface, so every process on it is stuck at K2.2.`,
      weight: Math.min(18, 6 * blocked.length),
    });
  }

  // Budget is an application question. Control-level equipment is bought with the
  // line, not licensed per year, so an empty cost there is not money going missing.
  if (t.annualCost === null && ctx.origin !== "plant" && (isActive(t.lifecycle) || ctx.origin !== "register")) {
    factors.push({
      key: "unbudgeted",
      label: "No annual cost on record — it is being paid for somewhere nobody is looking.",
      weight: 6,
    });
  }

  if (ctx.useCases.length > 0 && (isRetiring(t.lifecycle) || t.integration === "isolated")) {
    factors.push({
      key: "building-on-sand",
      label: `${ctx.useCases.length} use case(s) build on a tool that is ${isRetiring(t.lifecycle) ? `marked "${t.lifecycle}"` : "isolated"}.`,
      weight: 12,
    });
  }

  const score = Math.min(100, factors.reduce((a, f) => a + f.weight, 0));
  return { score, band: riskBand(score), factors: [...factors].sort((a, b) => b.weight - a.weight) };
}

// ---------------------------------------------------------------- consolidate

export interface ConsolidateInput {
  /** `registry/tools.md` — the curated master. */
  register: readonly ToolRow[];
  /** `landscape/tools.md` — tools added by hand in the portal. */
  manual?: readonly ToolRow[];
  /** `registry/landscape.md` — plant systems. */
  systems?: readonly SystemRow[];
  /** Demands, for the tools they declare or mention. */
  demands?: readonly DemandDoc[];
}

/**
 * Build the one register. Deterministic and total: every input row ends up in
 * exactly one entry, and no input can make it throw.
 */
export function consolidate(input: ConsolidateInput): ToolEntry[] {
  const register = input.register ?? [];
  const manual = input.manual ?? [];
  const systems = input.systems ?? [];
  const demands = input.demands ?? [];

  // 1. The registered rows — master first, then the manual ones it does not
  //    already carry (a manual row whose name is now in the master is the same
  //    tool, and the master wins: that is what "reviewed in" looks like).
  const base: { row: ToolRow; origin: ToolOrigin; sources: Set<ToolOrigin> }[] = register.map((row) => ({
    row,
    origin: "register" as ToolOrigin,
    sources: new Set<ToolOrigin>(["register"]),
  }));
  const byName = new Map<string, (typeof base)[number]>();
  for (const b of base) byName.set(b.row.tool.trim().toLowerCase(), b);

  for (const row of manual) {
    const key = row.tool.trim().toLowerCase();
    const existing = byName.get(key);
    if (existing) {
      existing.sources.add("manual");
      continue;
    }
    const entry = { row, origin: "manual" as ToolOrigin, sources: new Set<ToolOrigin>(["manual"]) };
    base.push(entry);
    byName.set(key, entry);
  }

  // 2. Plant systems: attach to the tool they are, or become one.
  const installations = new Map<(typeof base)[number], SystemRow[]>();
  const unmatched = new Map<string, SystemRow[]>();
  for (const s of systems) {
    if (isAbsenceRow(s)) continue; // "no historian on site" is a gap, not a tool
    const hit = matchSystem(s, base.map((b) => b.row));
    if (hit) {
      const owner = base.find((b) => b.row === hit)!;
      owner.sources.add("plant");
      installations.set(owner, [...(installations.get(owner) ?? []), s]);
      continue;
    }
    const key = systemKey(s);
    unmatched.set(key, [...(unmatched.get(key) ?? []), s]);
  }

  for (const [, group] of unmatched) {
    const first = group[0]!;
    const entry = {
      row: rowFromSystem(first, group),
      origin: "plant" as ToolOrigin,
      sources: new Set<ToolOrigin>(["plant"]),
    };
    base.push(entry);
    installations.set(entry, group);
  }

  // 3. Use cases: link to the tool they name, or create the unregistered tool
  //    they name — the point of the whole exercise. A demand may not invent a
  //    tool that already exists under a different case, hence the name index.
  const refs = new Map<(typeof base)[number], UseCaseRef[]>();
  const addRef = (b: (typeof base)[number], ref: UseCaseRef) => {
    const list = refs.get(b) ?? [];
    if (!list.some((r) => r.id === ref.id && r.kind === ref.kind)) list.push(ref);
    refs.set(b, list);
  };
  const findByName = (name: string): (typeof base)[number] | undefined => {
    const n = name.trim().toLowerCase();
    if (n === "") return undefined;
    return (
      base.find((b) => b.row.tool.trim().toLowerCase() === n) ??
      base.find((b) => {
        const tool = b.row.tool.trim().toLowerCase();
        return tool !== "" && n.length >= 4 && (tool.includes(n) || n.includes(tool));
      })
    );
  };

  for (const d of demands) {
    const md = d.markdown ?? "";
    const lower = md.toLowerCase();
    for (const name of declaredTools(md)) {
      const hit = findByName(name);
      if (hit) {
        hit.sources.add("use-case");
        addRef(hit, { id: d.id, title: d.title, kind: "declared" });
        continue;
      }
      const entry = {
        row: rowFromUseCase(name),
        origin: "use-case" as ToolOrigin,
        sources: new Set<ToolOrigin>(["use-case"]),
      };
      base.push(entry);
      addRef(entry, { id: d.id, title: d.title, kind: "declared" });
    }
    // Prose mentions of tools we already know about. Never invents a tool: a name
    // in prose is a hint, and a hint must not create a register row.
    for (const b of base) {
      if (b.row.tool.trim() === "") continue;
      if ((refs.get(b) ?? []).some((r) => r.id === d.id)) continue;
      if (mentions(lower, b.row.tool)) {
        b.sources.add("use-case");
        addRef(b, { id: d.id, title: d.title, kind: "mentioned" });
      }
    }
  }

  // 4. Derive. Overlap is computed over the CONSOLIDATED list, so a plant system
  //    that duplicates a registered capability counts as an overlap too.
  const overlapping = new Set(redundancies(base.map((b) => b.row)).flatMap((r) => r.tools.map((t) => t.id || t.tool)));

  return base
    .map((b): ToolEntry => {
      const inst = installations.get(b) ?? [];
      const useCases = (refs.get(b) ?? []).sort((a, c) => a.id.localeCompare(c.id));
      return {
        ...b.row,
        origin: b.origin,
        sources: TOOL_ORIGINS.filter((o) => b.sources.has(o)),
        installations: inst,
        plants: [...new Set(inst.map((s) => s.plant).filter((p) => p !== ""))].sort(),
        useCases,
        risk: assessRisk(b.row, {
          origin: b.origin,
          installations: inst,
          useCases,
          overlapping: overlapping.has(b.row.id || b.row.tool),
        }),
      };
    })
    .sort((a, z) => z.risk.score - a.risk.score || (z.annualCost ?? 0) - (a.annualCost ?? 0) || a.tool.localeCompare(z.tool));
}

/** A plant system nobody registered, expressed in the register's own columns. */
function rowFromSystem(s: SystemRow, group: readonly SystemRow[]): ToolRow {
  const plants = [...new Set(group.map((g) => g.plant).filter((p) => p !== ""))];
  // The OT integration vocabulary maps onto the enterprise one: both are ordinal
  // and both mean "how far does this system's data travel".
  const integration =
    s.integration === "uns-modelled" || s.integration === "broker-published"
      ? "hub"
      : s.integration === "point-to-point"
        ? "point-to-point"
        : s.integration === "file-export"
          ? "file-export"
          : s.integration === "none"
            ? "isolated"
            : "";
  return {
    id: "",
    tool: s.vendor === "" ? s.system : `${s.system} (${s.vendor})`,
    vendor: s.vendor,
    capability: s.system.replace(/\s+(line|cell)\s+\d+.*$/i, "").trim(),
    domain: "ot_integration",
    scope: "plant",
    hosting: "edge",
    lifecycle: "",
    integration,
    businessOwner: "",
    itOwner: s.dataOwner,
    users: null,
    // A system the plant depends on is important until somebody says otherwise;
    // claiming `critical` for it would inflate every finding it touches.
    criticality: "important",
    annualCost: null,
    notes: `Runs at ${plants.join(", ") || "an unnamed plant"} — in the OT landscape, in no application register.`,
    needsAttention: true,
    issues: ["not in the application register"],
  };
}

/** A tool a use case names that exists in no register. */
function rowFromUseCase(name: string): ToolRow {
  return {
    id: "",
    tool: name,
    vendor: "",
    capability: "",
    domain: "",
    scope: "",
    hosting: "",
    lifecycle: "",
    integration: "",
    businessOwner: "",
    itOwner: "",
    users: null,
    criticality: "",
    annualCost: null,
    notes: "Named by a use case; in no register.",
    needsAttention: true,
    issues: ["named by a use case, in no register"],
  };
}

// ---------------------------------------------------------------- budget

export interface BudgetLine {
  label: string;
  /** EUR per year. */
  amount: number;
  tools: number;
  /** Why this money is worth looking at. */
  reason: string;
}

export interface Budget {
  /** Total annual run cost of everything with a figure. */
  total: number;
  /** Entries in service with no figure at all — the number the total is missing. */
  unbudgeted: number;
  /** Share of entries in service that carry a cost, 0…100. `null` when none. */
  coverage: number | null;
  /** Annual cost carried by high/critical-risk tools. */
  atRisk: number;
  lines: BudgetLine[];
}

const sum = (rows: readonly ToolEntry[]): number => rows.reduce((a, t) => a + (t.annualCost ?? 0), 0);

/**
 * What the portfolio costs, and what each finding costs — the sentence a steering
 * committee actually acts on. Every line is money already being spent; none of it
 * is a projected saving, because a projected saving is an argument and this is a
 * register.
 */
export function budget(entries: readonly ToolEntry[]): Budget {
  // Control-level plant equipment is bought with the line, not licensed per year,
  // so it is outside the coverage question — exactly as it is outside the
  // "unbudgeted" risk factor. Counting it would make coverage look worse every
  // time somebody documented another PLC, which is the opposite of the incentive.
  const inService = entries.filter((t) => t.origin !== "plant" && (isActive(t.lifecycle) || t.origin !== "register"));
  const costed = inService.filter((t) => t.annualCost !== null);

  const retiring = entries.filter((t) => isRetiring(t.lifecycle) && t.annualCost !== null);
  const shadow = entries.filter((t) => (t.businessOwner === "" || t.itOwner === "") && t.annualCost !== null);
  const overlap = entries.filter((t) => t.risk.factors.some((f) => f.key === "overlap") && t.annualCost !== null);
  const isolated = entries.filter((t) => t.integration === "isolated" && t.annualCost !== null);

  const lines: BudgetLine[] = [
    {
      label: "On tools already decided against",
      amount: sum(retiring),
      tools: retiring.length,
      reason: "Marked migrate or eliminate and still invoiced — the cost of a decision nobody executed.",
    },
    {
      label: "On overlapping capabilities",
      amount: sum(overlap),
      tools: overlap.length,
      reason: "Two or more tools serving one job. Consolidation targets the smaller of each pair.",
    },
    {
      label: "Without a named owner",
      amount: sum(shadow),
      tools: shadow.length,
      reason: "Money leaving the company with no team accountable for it.",
    },
    {
      label: "On isolated tools",
      amount: sum(isolated),
      tools: isolated.length,
      reason: "Paid for, and the data still has to be retyped out of it by hand.",
    },
  ]
    .filter((l) => l.tools > 0)
    .sort((a, b) => b.amount - a.amount);

  return {
    total: sum(entries),
    unbudgeted: inService.length - costed.length,
    coverage: inService.length === 0 ? null : Math.round((costed.length / inService.length) * 100),
    atRisk: sum(entries.filter((t) => t.risk.band === "high" || t.risk.band === "critical")),
    lines,
  };
}

// ---------------------------------------------------------------- rollups

export interface ConsolidatedSummary {
  entries: number;
  /** By source of record. */
  registered: number;
  manual: number;
  offRegister: number;
  fromUseCases: number;
  /** Plant installations folded into the entries. */
  installations: number;
  plants: number;
  capabilities: number;
  /** Entries scoring high or critical. */
  atRisk: number;
  /** Entries a use case builds on. */
  inUse: number;
  meanRisk: number | null;
}

export function summariseConsolidated(entries: readonly ToolEntry[]): ConsolidatedSummary {
  const count = (o: ToolOrigin) => entries.filter((e) => e.origin === o).length;
  return {
    entries: entries.length,
    registered: count("register"),
    manual: count("manual"),
    offRegister: count("plant"),
    fromUseCases: count("use-case"),
    installations: entries.reduce((a, e) => a + e.installations.length, 0),
    plants: new Set(entries.flatMap((e) => e.plants)).size,
    capabilities: new Set(entries.map((e) => e.capability).filter((c) => c !== "")).size,
    atRisk: entries.filter((e) => e.risk.band === "high" || e.risk.band === "critical").length,
    inUse: entries.filter((e) => e.useCases.length > 0).length,
    meanRisk: entries.length === 0 ? null : Math.round(entries.reduce((a, e) => a + e.risk.score, 0) / entries.length),
  };
}

/**
 * Entries that are NOT in any register — the work list this consolidation exists
 * to produce. Worst first, and each one is either "register it" or "retire it".
 */
export function registerGaps(entries: readonly ToolEntry[]): ToolEntry[] {
  return entries
    .filter((e) => e.origin === "plant" || e.origin === "use-case" || e.origin === "manual")
    .sort((a, b) => b.risk.score - a.risk.score || a.tool.localeCompare(b.tool));
}

/** Every use case that builds on a tool, with the tools it builds on. */
export interface UseCaseExposure {
  id: string;
  title: string;
  tools: { tool: string; risk: RiskBand; kind: ReferenceKind; registered: boolean }[];
  /** The worst risk band among the tools it depends on. */
  worst: RiskBand;
}

export function useCaseExposure(entries: readonly ToolEntry[]): UseCaseExposure[] {
  const byCase = new Map<string, UseCaseExposure>();
  for (const e of entries) {
    for (const ref of e.useCases) {
      const row = byCase.get(ref.id) ?? { id: ref.id, title: ref.title, tools: [], worst: "low" as RiskBand };
      row.tools.push({ tool: e.tool, risk: e.risk.band, kind: ref.kind, registered: e.origin !== "use-case" });
      if (RISK_BANDS.indexOf(e.risk.band) > RISK_BANDS.indexOf(row.worst)) row.worst = e.risk.band;
      byCase.set(ref.id, row);
    }
  }
  return [...byCase.values()]
    .map((r) => ({ ...r, tools: r.tools.sort((a, b) => RISK_BANDS.indexOf(b.risk) - RISK_BANDS.indexOf(a.risk)) }))
    .sort((a, b) => RISK_BANDS.indexOf(b.worst) - RISK_BANDS.indexOf(a.worst) || b.tools.length - a.tools.length || a.id.localeCompare(b.id));
}

/** The riskiest entries, for the surface's lead section. */
export function topRisks(entries: readonly ToolEntry[], limit = 12): ToolEntry[] {
  return [...entries]
    .filter((e) => e.risk.score > 0)
    .sort((a, b) => b.risk.score - a.risk.score || (b.annualCost ?? 0) - (a.annualCost ?? 0) || a.tool.localeCompare(b.tool))
    .slice(0, limit);
}

/** Mean integration rank across entries in service, as a percentage. */
export function integrationHealth(entries: readonly ToolEntry[]): number | null {
  const active = entries.filter((e) => isActive(e.lifecycle) || e.origin !== "register");
  if (active.length === 0) return null;
  return Math.round(
    (active.reduce((a, e) => a + toolIntegrationRank(e.integration), 0) / active.length / MAX_TOOL_INTEGRATION_RANK) * 100,
  );
}
