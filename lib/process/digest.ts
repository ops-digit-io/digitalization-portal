/**
 * The engagement digest — the one-screen answer to "what is going on with this
 * process". Ported from the source tool's `backend/services/digest.js`.
 *
 * It is DERIVED, like the advisory layer, and it says so on the page. The
 * alternative was to parse the tool inventory and friction tables straight out of
 * the section markdown. That was rejected deliberately: a parser looks identical
 * when it works and when it silently returns nothing, and the moment a coach
 * renames a column from "Steps it serves" to "Steps served" the dashboard goes
 * quietly empty while every artefact underneath is still perfect. A derived
 * summary that is labelled as derived is honest about the same uncertainty
 * instead of hiding it behind a table.
 *
 * Stored as JSON next to the sections so it diffs and survives, and regenerated
 * on demand rather than on every read — nobody wants a model call behind a page
 * load.
 */

import { SECTIONS } from "./sections";
import * as store from "./store";
import * as llm from "./llm";
import { agentPrompt } from "./prompts";
import { render } from "./render";

export interface Score {
  value: number;
  basis: string;
}
export interface DigestTool {
  name: string;
  role?: string;
  velocityOfChange?: string;
  velocityNote?: string;
  criticalityOfTouch?: string;
  criticalityNote?: string;
  demandOfTouch?: string;
  demandNote?: string;
}
export interface FrictionItem {
  where?: string;
  what?: string;
  evidence?: string;
  cost?: string;
}
export interface DependencyItem {
  process?: string;
  how?: string;
}
export interface Digest {
  processStatement: string;
  processScore?: Score;
  technologyStatement?: string;
  technologyScore?: Score;
  tools?: DigestTool[];
  friction?: { actual?: FrictionItem[]; potential?: FrictionItem[]; prunable?: FrictionItem[] };
  dependencies?: { influences?: DependencyItem[]; influencedBy?: DependencyItem[] };
  confidence?: string;
  basedOn?: string[];
  gaps?: string[];
  generatedAt?: string;
  model?: string | null;
  provider?: string;
}


export async function buildPrompt(slug: string): Promise<string> {
  const m = (await store.meta(slug))!;
  const parts: string[] = [];
  for (const s of [...SECTIONS].sort((a, b) => a.order - b.order)) {
    const c = (await store.readSection(slug, s.key)).trim();
    if (c) parts.push(`<section key="${s.key}" label="${s.label}">\n${c}\n</section>`);
  }
  const [tpl, shape] = await Promise.all([agentPrompt("digest"), agentPrompt("digest-shape")]);
  const head = render(tpl, {
    title: m.title,
    owner: m.owner || "(not recorded)",
    unit: m.unit || "(not recorded)",
    shape,
  });
  return `${head}

<anamnesis>
${parts.join("\n\n") || "(nothing filled in yet)"}
</anamnesis>`;
}

/** Pulls the JSON out of a reply that may or may not be fenced. */
export function extractJson(text: string): Record<string, unknown> | null {
  const fenced = String(text).match(/```(?:json)?\s*\n([\s\S]*?)```/);
  const raw = fenced?.[1] ?? String(text);
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export class NoDigestError extends Error {
  code = "NO_DIGEST";
  reply: string;
  constructor(reply: string) {
    super("the model did not return a usable digest — nothing was saved");
    this.reply = reply;
  }
}

// --------------------------------------------------------------- paste-back
//
// The panel offers the digest prompt for copying, which is the only route to an
// overview on a deployment with no model key. Without a way back in, that button
// is a dead end: the prompt leaves and the answer can never return. `parseDigest`
// is that way back — the same JSON `generate` would have stored, arriving by hand.
//
// It is a whitelist, not a cast. Text pasted from outside the portal is external
// content (constraint #5) and is never trusted into the store as-is: every field
// is read individually, anything unrecognised is dropped, and a score that is not
// a number in 0–100 does not become one.

const str = (v: unknown): string | undefined => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? undefined : s;
};
const strList = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const out = v.map(str).filter((s): s is string => s !== undefined);
  return out.length ? out : undefined;
};

/**
 * A score survives only with a usable number; the basis rides along if present.
 *
 * Deliberately stricter than `Number()`: null, "", [] and false all coerce to 0,
 * and a dial reading 0 is a claim about the process, not the absence of one. Only
 * a real number, or a string that is entirely a number, counts.
 */
function score(v: unknown): Score | undefined {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return undefined;
  const raw = (v as { value?: unknown }).value;
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return undefined;
  return { value: Math.round(Math.max(0, Math.min(100, n))), basis: str((v as { basis?: unknown }).basis) ?? "" };
}

function tools(v: unknown): DigestTool[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
    .map((t) => ({
      name: str(t.name) ?? "",
      role: str(t.role),
      velocityOfChange: str(t.velocityOfChange),
      velocityNote: str(t.velocityNote),
      criticalityOfTouch: str(t.criticalityOfTouch),
      criticalityNote: str(t.criticalityNote),
      demandOfTouch: str(t.demandOfTouch),
      demandNote: str(t.demandNote),
    }))
    // A row with no tool name names nothing — it would render as an empty line
    // in the matrix and read as a tool the coach forgot to fill in.
    .filter((t) => t.name !== "");
  return out.length ? out : undefined;
}

function frictionItems(v: unknown): FrictionItem[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
    .map((f) => ({ where: str(f.where), what: str(f.what), evidence: str(f.evidence), cost: str(f.cost) }))
    .filter((f) => f.where !== undefined || f.what !== undefined);
  return out.length ? out : undefined;
}

function dependencyItems(v: unknown): DependencyItem[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .filter((d): d is Record<string, unknown> => typeof d === "object" && d !== null)
    .map((d) => ({ process: str(d.process), how: str(d.how) }))
    .filter((d) => d.process !== undefined);
  return out.length ? out : undefined;
}

/** Drop a group whose every branch came back empty, so the panel skips it. */
function group<T>(entries: [string, T | undefined][]): Record<string, T> | undefined {
  const kept = entries.filter((e): e is [string, T] => e[1] !== undefined);
  return kept.length ? Object.fromEntries(kept) : undefined;
}

export type ParsedDigest = { ok: true; digest: Digest } | { ok: false; reason: string };

/**
 * Read a digest that came from outside the portal — either the whole model reply
 * (fenced or not, via `extractJson`) or the parsed object. `processStatement` is
 * required for exactly the reason `generate` requires it: without the sentence the
 * scores describe, two numbers on a dial are an assertion with no subject.
 */
export function parseDigest(input: unknown): ParsedDigest {
  const data = typeof input === "string" ? extractJson(input) : input;
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, reason: "no JSON object found — paste the model's reply, or just the JSON it contains" };
  }
  const d = data as Record<string, unknown>;
  const processStatement = str(d.processStatement);
  if (!processStatement) {
    return { ok: false, reason: "processStatement is missing — that JSON is not a digest for this engagement" };
  }

  const f = (d.friction ?? {}) as Record<string, unknown>;
  const dep = (d.dependencies ?? {}) as Record<string, unknown>;

  const digest: Digest = { processStatement };

  const processScore = score(d.processScore);
  if (processScore) digest.processScore = processScore;
  const technologyStatement = str(d.technologyStatement);
  if (technologyStatement) digest.technologyStatement = technologyStatement;
  const technologyScore = score(d.technologyScore);
  if (technologyScore) digest.technologyScore = technologyScore;

  const toolRows = tools(d.tools);
  if (toolRows) digest.tools = toolRows;

  const confidence = str(d.confidence);
  if (confidence) digest.confidence = confidence;
  const basedOn = strList(d.basedOn);
  if (basedOn) digest.basedOn = basedOn;
  const gaps = strList(d.gaps);
  if (gaps) digest.gaps = gaps;

  const friction = group<FrictionItem[]>([
    ["actual", frictionItems(f.actual)],
    ["potential", frictionItems(f.potential)],
    ["prunable", frictionItems(f.prunable)],
  ]);
  if (friction) digest.friction = friction;

  const dependencies = group<DependencyItem[]>([
    ["influences", dependencyItems(dep.influences)],
    ["influencedBy", dependencyItems(dep.influencedBy)],
  ]);
  if (dependencies) digest.dependencies = dependencies;

  return { ok: true, digest };
}

export async function generate(slug: string, now: string): Promise<Digest> {
  const out = await llm.chat(await buildPrompt(slug), [{ role: "user", content: "Produce the digest now." }], { maxTokens: 9000, feature: "process.digest" });
  const data = extractJson(out.text);
  if (!data || !data.processStatement) throw new NoDigestError(out.text.slice(0, 500));
  return store.writeDigest(slug, { ...(data as unknown as Digest), model: out.model, provider: out.provider }, now);
}
