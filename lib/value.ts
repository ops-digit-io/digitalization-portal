/**
 * Value model — confidence states and value categories
 * (`docs/07-value-model.md §7.2, §7.3`).
 *
 * Extensibility seam: value categories are data. Adding a category is a table
 * entry. The `eurAllowed` flag is load-bearing — `risk_compliance` never carries
 * a euro figure and is never summed into portfolio value (§7.3).
 */

import { type Confidence, type Stage, STAGES } from "./types.js";

export interface ConfidenceStateDef {
  id: Confidence;
  /** Earliest stage this confidence state is permitted. */
  permittedFrom: Stage;
}

export const CONFIDENCE_STATE_DEFS: readonly ConfidenceStateDef[] = [
  { id: "hypothesis", permittedFrom: "S1" },
  { id: "indicative", permittedFrom: "S3" },
  { id: "committed", permittedFrom: "S5" },
  { id: "realized", permittedFrom: "S8" },
] as const;

export function confidencePermittedFrom(confidence: Confidence): Stage | undefined {
  return CONFIDENCE_STATE_DEFS.find((c) => c.id === confidence)?.permittedFrom;
}

/**
 * True if `confidence` is permitted at `stage`. The critical case is
 * `committed` before S5, which is forbidden (§7.2) — the single most important
 * enforcement in the value model.
 */
export function confidencePermittedAtStage(confidence: Confidence, stage: Stage): boolean {
  const from = confidencePermittedFrom(confidence);
  if (!from) return false;
  return STAGES.indexOf(stage) >= STAGES.indexOf(from);
}

export interface ValueCategoryDef {
  id: string;
  label: string;
  computation: string;
  /** False for risk_compliance: qualitative only, never a euro figure (§7.3). */
  eurAllowed: boolean;
  /** Included in portfolio value aggregation (§7.9). */
  aggregable: boolean;
}

export const VALUE_CATEGORIES: readonly ValueCategoryDef[] = [
  { id: "quality_cost", label: "Quality cost", computation: "quantity avoided × unit cost", eurAllowed: true, aggregable: true },
  { id: "availability", label: "Availability", computation: "hours recovered × contribution per hour", eurAllowed: true, aggregable: true },
  { id: "labour_effort", label: "Labour effort", computation: "hours avoided × loaded rate", eurAllowed: true, aggregable: true },
  { id: "material_energy_yield", label: "Material and energy yield", computation: "quantity saved × unit price", eurAllowed: true, aggregable: true },
  { id: "working_capital", label: "Working capital", computation: "capital released × cost of capital", eurAllowed: true, aggregable: true },
  { id: "risk_compliance", label: "Risk and compliance", computation: "qualitative", eurAllowed: false, aggregable: false },
  { id: "revenue", label: "Revenue", computation: "incremental revenue × margin", eurAllowed: true, aggregable: true },
] as const;

export function valueCategory(id: string): ValueCategoryDef | undefined {
  return VALUE_CATEGORIES.find((c) => c.id === id.toLowerCase().replace(/\s+/g, "_"));
}
