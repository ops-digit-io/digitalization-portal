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

export async function generate(slug: string, now: string): Promise<Digest> {
  const out = await llm.chat(await buildPrompt(slug), [{ role: "user", content: "Produce the digest now." }], { maxTokens: 9000, feature: "process.digest" });
  const data = extractJson(out.text);
  if (!data || !data.processStatement) throw new NoDigestError(out.text.slice(0, 500));
  return store.writeDigest(slug, { ...(data as unknown as Digest), model: out.model, provider: out.provider }, now);
}
