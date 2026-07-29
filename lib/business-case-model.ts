/**
 * Business-case MODEL — the durable, structured representation of a `business-case.md`.
 *
 * The document on disk stays markdown (constraint #4: every artifact is git-native and
 * human-reviewable), but the app never patches that text with regexes. Instead:
 *
 *     markdown ──parse (CommonMark+GFM AST)──▶ BusinessCaseModel ──render──▶ markdown
 *
 * Parsing walks a real AST (`mdast-util-from-markdown` + the GFM table extension), so
 * it is tolerant of everything valid markdown allows — extra spaces, reordered fields,
 * differently-aligned tables, bold or not — which is exactly what an open input surface
 * (a human editing in GitHub, or a live agent) produces. Editing mutates the typed
 * model and re-renders canonical markdown; there is no find-and-replace on the source.
 *
 * Sections the model doesn't recognise are preserved verbatim (sliced from the source
 * by AST offsets, never re-synthesised), so a re-render never drops content it didn't
 * understand.
 */

import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { toString } from "mdast-util-to-string";
import type { Confidence } from "./types.js";

export interface BCAssumption {
  name: string;
  tested: boolean;
  source: string;
}

export interface BusinessCaseModel {
  /** The full H1 text, e.g. "Business case · UC-2026-0300 · Predictive scrap alerts". */
  heading: string;
  /** The intro blockquote (without the leading "> "), if present. */
  intro?: string;
  confidence: Confidence;
  version: number;
  reviewHorizonWeeks?: number;
  baseline: { metric: string; value: string; verified: boolean; note: string };
  value: { category: string; annualGross?: number; basis: string };
  assumptions: BCAssumption[];
  cost: { buildEstimate?: string; annualRunEstimate?: string };
  openQuestions: string[];
  changeLog: string[];
  /** Unrecognised top-level `##` sections, kept verbatim (heading text + raw source). */
  extraSections: { heading: string; raw: string }[];
}

// ── small text helpers (operate on already-extracted strings, never on raw markdown) ─

/** Strip a trailing "." or ":" and surrounding space from a field label. */
function normalizeLabel(label: string): string {
  let s = label.trim();
  while (s.endsWith(".") || s.endsWith(":")) s = s.slice(0, -1).trim();
  return s.toLowerCase();
}

/** Extract the first currency-ish integer from a value string ("EUR 250,000" → 250000). */
export function parseEuro(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const m = /(?:eur|€)?\s*([\d][\d.,]*\d|\d)/i.exec(text);
  if (!m || !m[1]) return undefined;
  const cleaned = m[1].replace(/[.,](?=\d{3}\b)/g, "").replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

function firstWord(text: string): string {
  return text.trim().split(/\s+/)[0] ?? "";
}

function parseConfidence(text: string): Confidence {
  const w = firstWord(text).toLowerCase();
  return (["hypothesis", "indicative", "committed", "realized"] as const).includes(w as Confidence)
    ? (w as Confidence)
    : "indicative";
}

// ── AST helpers ─────────────────────────────────────────────────────────────────

type Node = { type: string; depth?: number; children?: Node[]; position?: { start: { offset?: number }; end: { offset?: number } } };

function parseTree(markdown: string): Node {
  return fromMarkdown(markdown, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] }) as unknown as Node;
}

/** Bold-labelled fields in a paragraph: `**Metric.** foo \n **Value.** bar` → {metric:"foo", value:"bar"}. */
function labeledFields(paragraph: Node): Map<string, string> {
  const out = new Map<string, string>();
  let label: string | null = null;
  let buf: string[] = [];
  for (const child of paragraph.children ?? []) {
    if (child.type === "strong") {
      if (label !== null) out.set(label, buf.join("").trim());
      label = normalizeLabel(toString(child as never));
      buf = [];
    } else {
      buf.push(toString(child as never));
    }
  }
  if (label !== null) out.set(label, buf.join("").trim());
  return out;
}

/** Rows of the first table under a node list, as trimmed cell arrays (header included). */
function tableRows(node: Node): string[][] {
  return (node.children ?? []).map((row) => (row.children ?? []).map((cell) => toString(cell as never).trim()));
}

/** List items as trimmed strings. */
function listItems(node: Node): string[] {
  return (node.children ?? []).map((li) => toString(li as never).trim()).filter((s) => s.length > 0);
}

interface Section {
  name: string;      // lowercased heading text
  headingText: string;
  nodes: Node[];
  startOffset: number;
  endOffset: number;
}

const KNOWN = new Set(["state", "baseline", "value", "cost", "open questions", "change log"]);

/**
 * Parse `business-case.md` into a structured model. Never throws; missing pieces fall
 * back to safe defaults (a draft is always at least `indicative`).
 */
export function parseBusinessCaseModel(markdown: string): BusinessCaseModel {
  const model: BusinessCaseModel = {
    heading: "Business case",
    confidence: "indicative",
    version: 1,
    baseline: { metric: "", value: "", verified: false, note: "" },
    value: { category: "", basis: "" },
    assumptions: [],
    cost: {},
    openQuestions: [],
    changeLog: [],
    extraSections: [],
  };

  let tree: Node;
  try {
    tree = parseTree(markdown);
  } catch {
    return model;
  }
  const top = tree.children ?? [];

  // Split into: the pre-first-##-heading preamble (H1 + intro) and the ## sections.
  const sections: Section[] = [];
  const preamble: Node[] = [];
  let cur: Section | undefined;
  for (const node of top) {
    if (node.type === "heading" && node.depth === 2) {
      if (cur) { cur.endOffset = node.position?.start.offset ?? cur.endOffset; sections.push(cur); }
      const headingText = toString(node as never).trim();
      cur = { name: headingText.toLowerCase(), headingText, nodes: [], startOffset: node.position?.start.offset ?? 0, endOffset: markdown.length };
    } else if (cur) {
      cur.nodes.push(node);
    } else {
      preamble.push(node);
    }
  }
  if (cur) sections.push(cur);

  // Preamble: the H1 heading text and the intro blockquote.
  for (const node of preamble) {
    if (node.type === "heading" && node.depth === 1) model.heading = toString(node as never).trim();
    else if (node.type === "blockquote") model.intro = toString(node as never).trim();
  }

  for (const sec of sections) {
    switch (sec.name) {
      case "state": {
        const list = sec.nodes.find((n) => n.type === "list");
        const fields = new Map<string, string>();
        for (const li of list?.children ?? []) {
          const para = (li.children ?? []).find((n) => n.type === "paragraph") ?? li;
          for (const [k, v] of labeledFields(para)) fields.set(k, v);
        }
        if (fields.has("confidence")) model.confidence = parseConfidence(fields.get("confidence")!);
        if (fields.has("version")) { const n = parseInt(firstWord(fields.get("version")!), 10); if (Number.isFinite(n)) model.version = n; }
        if (fields.has("review horizon")) { const n = parseInt(firstWord(fields.get("review horizon")!), 10); if (Number.isFinite(n)) model.reviewHorizonWeeks = n; }
        break;
      }
      case "baseline": {
        const para = sec.nodes.find((n) => n.type === "paragraph");
        if (para) {
          const f = labeledFields(para);
          model.baseline.metric = f.get("metric") ?? "";
          model.baseline.value = f.get("value") ?? "";
          const verifiedText = f.get("verified") ?? "No";
          model.baseline.verified = firstWord(verifiedText).toLowerCase() === "yes";
          // The note is the text after the "Yes/No —" lead.
          const dash = verifiedText.indexOf("—");
          model.baseline.note = dash >= 0 ? verifiedText.slice(dash + 1).trim() : "";
        }
        break;
      }
      case "value": {
        const para = sec.nodes.find((n) => n.type === "paragraph");
        if (para) {
          const f = labeledFields(para);
          model.value.category = f.get("category") ?? "";
          model.value.basis = f.get("basis") ?? "";
          const grossText = f.get("annual gross") ?? "";
          if (!/to be quantified/i.test(grossText)) {
            const n = parseEuro(grossText);
            if (n !== undefined) model.value.annualGross = n;
          }
        }
        // The Assumptions table lives under the `### Assumptions` subheading, i.e. the
        // first table in this section.
        const table = sec.nodes.find((n) => n.type === "table");
        if (table) {
          const rows = tableRows(table);
          for (const cells of rows.slice(1)) {
            const name = (cells[0] ?? "").trim();
            if (!name || /^assumption$/i.test(name)) continue;
            model.assumptions.push({
              name,
              tested: (cells[1] ?? "").trim().toLowerCase() === "yes",
              source: (cells[2] ?? "").trim() || "—",
            });
          }
        }
        break;
      }
      case "cost": {
        const table = sec.nodes.find((n) => n.type === "table");
        if (table) {
          for (const cells of tableRows(table)) {
            const label = (cells[0] ?? "").trim().toLowerCase();
            const val = (cells[1] ?? "").trim();
            if (!val || val === "|") continue;
            if (/build/.test(label)) model.cost.buildEstimate = val;
            else if (/run/.test(label)) model.cost.annualRunEstimate = val;
          }
        }
        break;
      }
      case "open questions": {
        const list = sec.nodes.find((n) => n.type === "list");
        model.openQuestions = list ? listItems(list).filter((q) => !/^_?none_?$/i.test(q)) : [];
        break;
      }
      case "change log": {
        const list = sec.nodes.find((n) => n.type === "list");
        model.changeLog = list ? listItems(list) : [];
        break;
      }
      default: {
        // Preserve verbatim, sliced from the source by offsets — never re-synthesised.
        const raw = markdown.slice(sec.startOffset, sec.endOffset).replace(/\s+$/, "");
        if (raw.trim().length > 0) model.extraSections.push({ heading: sec.headingText, raw });
      }
    }
  }

  return model;
}

// ── canonical renderer (model → markdown) ────────────────────────────────────────

function grossLine(v: BusinessCaseModel["value"]): string {
  return v.annualGross !== undefined
    ? `EUR ${v.annualGross.toLocaleString("en-US")}`
    : "To be quantified — a verified baseline is required.";
}

function verifiedLine(b: BusinessCaseModel["baseline"]): string {
  return b.verified ? "**Verified.** Yes — baseline confirmed." : `**Verified.** No — ${b.note || "a verified baseline is required before G5."}`;
}

/**
 * Render a `business-case.md` from the model. Deterministic — the same model always
 * yields identical bytes — and a fixed section order. `parseBusinessCaseModel` is its
 * inverse for canonical documents.
 */
export function renderBusinessCaseModel(model: BusinessCaseModel): string {
  const assumptionRows = model.assumptions.length > 0
    ? model.assumptions.map((a) => `| ${a.name} | ${a.tested ? "Yes" : "No"} | ${a.source} |`).join("\n")
    : "| _none captured_ | No | — |";
  const openQuestions = model.openQuestions.length > 0 ? model.openQuestions.map((q) => `- ${q}`).join("\n") : "- _none_";

  const out: string[] = [];
  out.push(`# ${model.heading}`);
  out.push("");
  if (model.intro) { out.push(`> ${model.intro}`); out.push(""); }
  out.push("## State", "");
  out.push(`- **Confidence:** ${model.confidence}`);
  out.push(`- **Version:** ${model.version}`);
  if (model.reviewHorizonWeeks !== undefined) out.push(`- **Review horizon:** ${model.reviewHorizonWeeks} weeks`);
  out.push("");
  out.push("## Baseline", "");
  out.push(`**Metric.** ${model.baseline.metric}`);
  out.push(`**Value.** ${model.baseline.value}`);
  out.push(verifiedLine(model.baseline));
  out.push("");
  out.push("## Value", "");
  out.push(`**Category.** ${model.value.category}`);
  out.push(`**Annual gross.** ${grossLine(model.value)}`);
  out.push(`**Basis.** ${model.value.basis}`);
  out.push("");
  out.push("### Assumptions", "");
  out.push("| Assumption | Tested | Source |");
  out.push("|---|---|---|");
  out.push(assumptionRows);
  out.push("");
  out.push("## Cost", "");
  out.push("| | |");
  out.push("|---|---|");
  out.push(`| Build estimate | ${model.cost.buildEstimate ?? "To be estimated"} |`);
  out.push(`| Annual run estimate | ${model.cost.annualRunEstimate ?? "To be estimated"} |`);
  out.push("");
  out.push("## Open questions", "");
  out.push(openQuestions);
  for (const extra of model.extraSections) {
    out.push("");
    out.push(extra.raw);
  }
  if (model.changeLog.length > 0) {
    out.push("");
    out.push("## Change log", "");
    out.push(model.changeLog.map((l) => (l.startsWith("-") ? l : `- ${l}`)).join("\n"));
  }
  return out.join("\n") + "\n";
}

// ── model-level edits (mutate the structure, then the caller re-renders) ──────────

export interface BusinessCaseValuePatch {
  annualGross?: number | null;
  buildEstimate?: string;
  annualRunEstimate?: string;
  baselineVerified?: boolean;
}

/** Apply a value/cost/verified patch to the model. Pure — returns a new model. */
export function applyValuePatch(model: BusinessCaseModel, patch: BusinessCaseValuePatch): BusinessCaseModel {
  const next: BusinessCaseModel = { ...model, value: { ...model.value }, cost: { ...model.cost }, baseline: { ...model.baseline } };
  if (patch.annualGross !== undefined) {
    if (patch.annualGross === null || !Number.isFinite(patch.annualGross) || patch.annualGross <= 0) delete next.value.annualGross;
    else next.value.annualGross = Math.round(patch.annualGross);
  }
  if (patch.buildEstimate !== undefined) next.cost.buildEstimate = patch.buildEstimate.trim() || undefined;
  if (patch.annualRunEstimate !== undefined) next.cost.annualRunEstimate = patch.annualRunEstimate.trim() || undefined;
  if (patch.baselineVerified !== undefined) next.baseline.verified = patch.baselineVerified;
  return next;
}

/** Mark the assumption at `index` (table order) tested/untested. Pure. */
export function applyAssumptionTested(model: BusinessCaseModel, index: number, tested: boolean): BusinessCaseModel {
  if (index < 0 || index >= model.assumptions.length) return model;
  const assumptions = model.assumptions.map((a, i) => (i === index ? { ...a, tested } : a));
  return { ...model, assumptions };
}

/** Append a dated line to the change log. Pure. */
export function appendChangeLog(model: BusinessCaseModel, entry: { actor: string; date: string; summary: string }): BusinessCaseModel {
  const line = `${entry.date} — ${entry.summary.trim()} (${entry.actor})`;
  return { ...model, changeLog: [...model.changeLog, line] };
}
