/**
 * The production AI portfolio — the AI framework as a register, not a slide.
 *
 * Every model that touches the plants, with two things the usual "AI use case
 * list" leaves out: how much authority it holds (a rung of the existing ladder)
 * and WHERE ITS OUTPUT LANDS (the control surface from `lib/org/autonomy.ts`).
 *
 * The second is what makes this governable. A model that suggests something to an
 * operator and a model that moves a zone temperature are the same "AI use case"
 * on every roadmap slide ever drawn, and they are not remotely the same risk.
 *
 * So this module's real output is `evaluate()`: it runs each row through
 * `canActOn` and returns the REFUSALS. A row claiming an acting rung on a
 * setpoint with no envelope, no fallback and no abort condition does not render
 * as a warning icon — it renders as a refusal with the reason, in the same voice
 * the portal refuses a gate.
 *
 * `Stage` is the model's own life (concept → live), NOT a second demand
 * lifecycle. The eight stages and seven gates are untouched; a row points at its
 * demand and that is the whole relationship.
 *
 * Pure: markdown in, data out. Never throws.
 */

import { parseFirstTable, columnIndex } from "../markdown.js";
import {
  canActOn,
  loopKind,
  isControlSurface,
  isAuthorityLevel,
  surfacePolicy,
  EXECUTE_READINESS,
  type AuthorityLevel,
  type ControlSurface,
  type SafetyCase,
} from "../org/autonomy.js";

/** The model's own life. Not a demand lifecycle. */
export const MODEL_STAGES = ["concept", "data", "trained", "shadow", "assisted", "live", "retired"] as const;
export type ModelStage = (typeof MODEL_STAGES)[number];

export const MODEL_CLASSES = [
  "rule",
  "statistical",
  "ml-supervised",
  "ml-forecast",
  "vision",
  "llm-assistant",
] as const;
export type ModelClass = (typeof MODEL_CLASSES)[number];

export interface AiRow {
  id: string;
  useCase: string;
  plant: string;
  domain: string;
  modelClass: ModelClass | "";
  stage: ModelStage | "";
  authority: AuthorityLevel | "";
  surface: ControlSurface | "";
  envelope: string;
  fallback: string;
  abortCondition: string;
  humanOwner: string;
  demand: string;
  needsAttention: boolean;
  issues: string[];
}

function normalise(v: string | undefined): string {
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

/** Parse `registry/ai-portfolio.md`. Malformed rows are kept and marked. */
export function parseAiPortfolio(md: string | undefined): AiRow[] {
  return rows(md)
    .map((r) => {
      const issues: string[] = [];

      const id = r.get("ID");
      if (id === "") issues.push("no ID");

      const rawStage = normalise(r.get("Stage"));
      const stage: ModelStage | "" = (MODEL_STAGES as readonly string[]).includes(rawStage)
        ? (rawStage as ModelStage)
        : "";
      if (stage === "") issues.push(rawStage === "" ? "no stage" : `unreadable stage "${rawStage}"`);

      const rawClass = normalise(r.get("Model class"));
      const modelClass: ModelClass | "" = (MODEL_CLASSES as readonly string[]).includes(rawClass)
        ? (rawClass as ModelClass)
        : "";
      if (modelClass === "") issues.push(rawClass === "" ? "no model class" : `unreadable model class "${rawClass}"`);

      const rawAuthority = normalise(r.get("Authority"));
      const authority: AuthorityLevel | "" = isAuthorityLevel(rawAuthority) ? rawAuthority : "";
      if (authority === "") issues.push(rawAuthority === "" ? "no authority" : `unreadable authority "${rawAuthority}"`);

      const rawSurface = normalise(r.get("Control surface"));
      const surface: ControlSurface | "" = isControlSurface(rawSurface) ? rawSurface : "";
      if (surface === "") issues.push(rawSurface === "" ? "no control surface" : `unreadable control surface "${rawSurface}"`);

      const humanOwner = r.get("Human owner");
      // The ladder's own rule, applied here: an agent with no named human is a
      // masterless tool. It is not softened because the row is about a model.
      if (humanOwner === "") issues.push("no named human owner");

      return {
        id,
        useCase: r.get("Use case"),
        plant: r.get("Plant"),
        domain: r.get("Domain"),
        modelClass,
        stage,
        authority,
        surface,
        envelope: r.get("Envelope"),
        fallback: r.get("Fallback"),
        abortCondition: r.get("Abort condition"),
        humanOwner,
        demand: r.get("Demand"),
        needsAttention: issues.length > 0,
        issues,
      };
    })
    .filter((r) => r.id !== "" || r.useCase !== "");
}

/** The safety case a row actually carries — a cell with text in it counts as written. */
export function safetyOf(row: AiRow): SafetyCase {
  return {
    envelope: row.envelope.trim() !== "",
    fallback: row.fallback.trim() !== "",
    abortCondition: row.abortCondition.trim() !== "",
  };
}

export interface Verdict {
  row: AiRow;
  /** What this row IS, in the plant's vocabulary — undefined where it has no name. */
  kind: string | undefined;
  /** Whether the row may act as declared. */
  ok: boolean;
  /** Why not, in the portal's refusal voice. */
  reason?: string;
  /** The row moves a process parameter on a machine. */
  physical: boolean;
}

/**
 * Run every row through the real guardrail.
 *
 * The register is treated as its own agent brief: a row that names an owner, an
 * authority and a surface is a brief that has been filled in, so readiness is
 * complete and the ONLY thing left to earn is the machine. That keeps the refusal
 * honest — it is never "your paperwork is short", it is always "this moves a
 * setpoint and you have not said what stops it".
 */
export function evaluate(rows: readonly AiRow[]): Verdict[] {
  return rows.map((row) => {
    if (row.authority === "" || row.surface === "") {
      return {
        row,
        kind: undefined,
        ok: false,
        physical: false,
        reason: "Authority and control surface must both be readable before this row can be judged at all.",
      };
    }
    const physical = surfacePolicy(row.surface).physical;
    const res = canActOn(row.authority, row.surface, {
      agentBriefPresent: true,
      agentBriefScore: row.humanOwner === "" ? 0 : EXECUTE_READINESS,
      safety: safetyOf(row),
    });
    return {
      row,
      kind: loopKind(row.authority, row.surface),
      ok: res.ok,
      physical,
      ...(res.reason ? { reason: res.reason } : {}),
    };
  });
}

/** The rows that may not act as declared. The page leads with these. */
export function refusals(verdicts: readonly Verdict[]): Verdict[] {
  return verdicts.filter((v) => !v.ok);
}

/** Rows whose consequence is physical, most authoritative first. */
export function controlLoops(verdicts: readonly Verdict[]): Verdict[] {
  const rank = (a: AuthorityLevel | ""): number =>
    a === "execute-autonomously" ? 3 : a === "execute-with-approval" ? 2 : a === "recommend" ? 1 : 0;
  return verdicts
    .filter((v) => v.physical)
    .sort((a, b) => rank(b.row.authority) - rank(a.row.authority) || (a.row.id < b.row.id ? -1 : 1));
}

export interface StageCount {
  stage: ModelStage;
  count: number;
}

/** The portfolio across the model lifecycle, concept → retired. */
export function byStage(rows: readonly AiRow[]): StageCount[] {
  return MODEL_STAGES.map((stage) => ({ stage, count: rows.filter((r) => r.stage === stage).length }));
}

export interface AiSummary {
  models: number;
  live: number;
  physical: number;
  /** Physical rows at an acting rung — the ones a safety case is mandatory for. */
  actingOnMachines: number;
  refused: number;
  needsAttention: number;
}

export function summariseAi(rows: readonly AiRow[]): AiSummary {
  const verdicts = evaluate(rows);
  return {
    models: rows.length,
    live: rows.filter((r) => r.stage === "live").length,
    physical: verdicts.filter((v) => v.physical).length,
    actingOnMachines: verdicts.filter(
      (v) => v.physical && (v.row.authority === "execute-with-approval" || v.row.authority === "execute-autonomously"),
    ).length,
    refused: refusals(verdicts).length,
    needsAttention: rows.filter((r) => r.needsAttention).length,
  };
}
