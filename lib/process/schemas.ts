/**
 * What "good" looks like per section — the grader's rule set, ported verbatim
 * from the source tool's `backend/config/schemas/`.
 *
 * The JSON files are byte-identical copies. They are the contract between this
 * portal and the diagnostic tool they came from, so they are never edited here:
 * a rule change belongs upstream, then gets copied down again.
 */
import businessCase from "./schemas/business-case.json";
import costOfChange from "./schemas/cost-of-change.json";
import diagnosis from "./schemas/diagnosis.json";
import diagnostics from "./schemas/diagnostics.json";
import flow from "./schemas/flow.json";
import increment from "./schemas/increment.json";
import iteration from "./schemas/iteration.json";
import knowledge from "./schemas/knowledge.json";
import kpi from "./schemas/kpi.json";
import literacy from "./schemas/literacy.json";
import mapping from "./schemas/mapping.json";
import profile from "./schemas/profile.json";
import purpose from "./schemas/purpose.json";
import toolchain from "./schemas/toolchain.json";

/**
 * The five rule types the grader knows how to evaluate. Widened with `string`
 * on purpose: a schema authored upstream may carry a type this build has not
 * learned yet, and the grader reports that as `invalid` rather than crashing.
 */
export type RuleType =
  | "heading"
  | "field"
  | "table"
  | "minWords"
  | "noPlaceholder"
  | (string & {});

export interface SchemaRule {
  type: RuleType;
  /** Regex source, in the schemas' `(?i)` / `(?i:…)` inline-flag dialect. */
  pattern?: string;
  weight: number;
  /** `table` rules only: the smallest table that satisfies the rule. */
  minRows?: number;
  /** `minWords` rules only: the word count the prose must reach. */
  count?: number;
  /** Any field a newer upstream schema adds stays addressable. */
  [k: string]: unknown;
}

export interface SectionSchema {
  sectionKey: string;
  label: string;
  required: SchemaRule[];
  excellence: SchemaRule[];
  /** keep any extra source fields addressable */
  [k: string]: unknown;
}

export const SCHEMAS: Record<string, SectionSchema> = {
  "business-case": businessCase as SectionSchema,
  "cost-of-change": costOfChange as SectionSchema,
  diagnosis: diagnosis as SectionSchema,
  diagnostics: diagnostics as SectionSchema,
  flow: flow as SectionSchema,
  increment: increment as SectionSchema,
  iteration: iteration as SectionSchema,
  knowledge: knowledge as SectionSchema,
  kpi: kpi as SectionSchema,
  literacy: literacy as SectionSchema,
  mapping: mapping as SectionSchema,
  profile: profile as SectionSchema,
  purpose: purpose as SectionSchema,
  toolchain: toolchain as SectionSchema,
};

/** Every section key that has a schema, in file order. */
export const SCHEMA_KEYS: readonly string[] = Object.keys(SCHEMAS);

export function schemaOf(key: string): SectionSchema | undefined {
  return SCHEMAS[key];
}
