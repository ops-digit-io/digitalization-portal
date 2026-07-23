/**
 * Business-case parsing (`docs/03-data-model.md §3.6`) — reads the facts Feature 1
 * needs out of `business-case.md`: confidence, whether the baseline is verified,
 * the annual gross figure and its category, and the assumptions table with which
 * assumptions have been tested. Never throws.
 *
 * Assumption sensitivity is not stated in the document, so we infer a default: an
 * untested assumption is treated as materially load-bearing. The agent can
 * override these when it reasons about the case; this gives an honest baseline.
 */

import { parseFirstTable } from "./markdown.js";
import { matchEnumLoose } from "./enums.js";
import type { Confidence } from "./types.js";
import type { Assumption, SimulationInput, SimulationOutput } from "./simulation.js";
import { runValueSimulation } from "./simulation.js";

export interface BusinessCaseFacts {
  confidence?: Confidence;
  baselineVerified?: boolean;
  annualGross?: number;
  category?: string;
  assumptions: Assumption[];
}

/** Split markdown into a map of `## H2` (and `### H3`) section → body text. */
function sections(markdown: string): Map<string, string> {
  const map = new Map<string, string>();
  const parts = (markdown ?? "").split(/\n(?=#{2,3}\s)/);
  for (const part of parts) {
    const m = /^(#{2,3})\s+(.+)/.exec(part.trim());
    if (m && m[2]) map.set(m[2].trim().toLowerCase(), part);
  }
  return map;
}

function firstNumber(text: string | undefined): number | undefined {
  if (!text) return undefined;
  // Grab a currency-ish number: "EUR 180,000" / "180.000 €" / "142000".
  const m = /(?:eur|€)?\s*([\d][\d.,]*\d|\d)/i.exec(text);
  if (!m || !m[1]) return undefined;
  const cleaned = m[1].replace(/[.,](?=\d{3}\b)/g, "").replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

const DEFAULT_UNTESTED_SENSITIVITY = 0.35;
const DEFAULT_TESTED_SENSITIVITY = 0.05;

export function parseBusinessCase(markdown: string): BusinessCaseFacts {
  const facts: BusinessCaseFacts = { assumptions: [] };
  try {
    const secs = sections(markdown);

    // Confidence from ## State.
    const state = secs.get("state") ?? "";
    const confMatch = /confidence[:*\s]+([a-z]+)/i.exec(state.replace(/\*/g, ""));
    if (confMatch) {
      const c = matchEnumLoose<Confidence>(confMatch[1], ["hypothesis", "indicative", "committed", "realized"]);
      if (c) facts.confidence = c;
    }

    // Baseline verified.
    const baseline = secs.get("baseline") ?? "";
    const verMatch = /verified[.*:\s]+([a-z]+)/i.exec(baseline.replace(/\*/g, ""));
    if (verMatch) facts.baselineVerified = /^yes$/i.test(verMatch[1] ?? "");

    // Value section: annual gross + category.
    const value = secs.get("value") ?? "";
    const grossMatch = /annual gross[.*:\s]+([^\n]+)/i.exec(value.replace(/\*/g, ""));
    facts.annualGross = firstNumber(grossMatch?.[1]);
    const catMatch = /category[.*:\s]+([^\n.]+)/i.exec(value.replace(/\*/g, ""));
    if (catMatch && catMatch[1]) facts.category = catMatch[1].trim();

    // Assumptions table (### Assumptions, or the first table under ## Value).
    const assumptionsSec = secs.get("assumptions") ?? value;
    const table = parseFirstTable(assumptionsSec);
    if (table) {
      for (const cells of table.rows) {
        const name = (cells[0] ?? "").replace(/\*/g, "").trim();
        if (!name || /^assumption$/i.test(name)) continue;
        const testedCell = (cells[1] ?? "").replace(/\*/g, "").trim();
        const tested = /^yes$/i.test(testedCell);
        facts.assumptions.push({
          name,
          tested,
          sensitivity: tested ? DEFAULT_TESTED_SENSITIVITY : DEFAULT_UNTESTED_SENSITIVITY,
        });
      }
    }
  } catch {
    return facts;
  }
  return facts;
}

/** Build a simulation input from parsed facts (with an override for the base figure). */
export function toSimulationInput(facts: BusinessCaseFacts, baseOverride?: number): SimulationInput {
  return {
    baseAnnualGross: baseOverride ?? facts.annualGross ?? 0,
    assumptions: facts.assumptions,
  };
}

/** Parse a business case and run the value simulation in one step. */
export function simulateBusinessCase(markdown: string, baseOverride?: number): {
  facts: BusinessCaseFacts;
  simulation: SimulationOutput;
} {
  const facts = parseBusinessCase(markdown);
  const simulation = runValueSimulation(toSimulationInput(facts, baseOverride));
  return { facts, simulation };
}
