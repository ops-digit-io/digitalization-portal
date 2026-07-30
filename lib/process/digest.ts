/**
 * The engagement digest — the one-screen answer to "what is going on with this
 * process". Ported verbatim from PDT's `digest.js`. DERIVED, and labelled as such.
 *
 * It carries the technology/tools matrix (velocity × criticality × demand), the
 * friction split (actual / potential / prunable), and the dependency chain in both
 * directions — the three things the process funnel exists to surface before a
 * demand is ever raised.
 */

import { ordered } from "./sections";
import * as store from "./store";
import * as llm from "./llm";

const FILE = "digest.json";

export async function read(slug: string): Promise<unknown | null> {
  const raw = await store.readFileRaw(slug, FILE);
  if (raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function write(slug: string, data: Record<string, unknown>, now: string): Promise<unknown | null> {
  await store.writeFileRaw(slug, FILE, JSON.stringify({ ...data, generatedAt: now }, null, 2), now, `Update digest on ${store.slugify(slug)}`);
  return read(slug);
}

const SHAPE = `{
  "processStatement": "two or three sentences: what this process is for and how well it does it today",
  "processScore": { "value": 0-100, "basis": "one sentence naming what drove the number" },
  "technologyStatement": "two or three sentences: what the process runs on and how well that stack serves it",
  "technologyScore": { "value": 0-100, "basis": "one sentence" },
  "tools": [
    {
      "name": "EIP",
      "role": "what it does in this process",
      "velocityOfChange": "high | medium | low",
      "velocityNote": "why — who owns it and how long a change takes",
      "criticalityOfTouch": "high | medium | low",
      "criticalityNote": "what breaks downstream if this is changed badly",
      "demandOfTouch": "high | medium | low",
      "demandNote": "how much this tool is actually asking to be changed"
    }
  ],
  "friction": {
    "actual":    [{ "where": "step or boundary", "what": "what happens", "evidence": "what in the anamnesis says so" }],
    "potential": [{ "where": "...", "what": "what would start hurting, and under what condition" }],
    "prunable":  [{ "where": "...", "what": "what could be removed outright", "cost": "what removing it would cost" }]
  },
  "dependencies": {
    "influences":   [{ "process": "name", "how": "what this process hands them, and what breaks for them if it changes" }],
    "influencedBy": [{ "process": "name", "how": "what they hand this process, and what breaks here if it changes" }]
  },
  "confidence": "high | medium | low",
  "basedOn": ["section keys actually read"],
  "gaps": ["what was missing and therefore left thin"]
}`;

export async function buildPrompt(slug: string): Promise<string> {
  const m = (await store.meta(slug))!;
  const parts: string[] = [];
  for (const s of ordered()) {
    const c = (await store.read(slug, s.key)).trim();
    if (c) parts.push(`<section key="${s.key}" label="${s.label}">\n${c}\n</section>`);
  }

  return `You are producing the one-screen digest of a process diagnosis at OESL Automotive.

Engagement: ${m.title}
Process owner: ${m.owner || "(not recorded)"}
Unit: ${m.unit || "(not recorded)"}

WHAT THIS IS
A derived summary of the anamnesis below, for the top of the engagement page. It is read
before anything else, so it has to be true to the material and honest where the material
is thin. It is not a place to be encouraging.

THE TWO SCORES ARE DIFFERENT QUESTIONS. Do not let them converge.
- processScore: how well the process achieves what it exists for, and how ready it is to
  be improved — clarity of purpose, measurability, organisational readiness.
- technologyScore: how well the stack underneath serves the process — coverage, breaks,
  extractability, how much of the work happens outside the systems of record.
A process can be well run on a terrible stack, and a clean stack can carry a process
nobody has ever defined. If both your numbers land within five points of each other,
you have probably scored the same thing twice — go back and separate them.

VELOCITY, CRITICALITY, DEMAND — per tool, and they are independent:
- velocityOfChange: how fast a change to this tool can actually ship. A corporate system
  owned by central IT is low however good the idea is.
- criticalityOfTouch: what breaks elsewhere if it is changed badly.
- demandOfTouch: how loudly this tool is asking to be changed, on the evidence.
The interesting tools are the ones where demand is high and velocity is low, because that
is where the frustration in the organisation actually comes from.

FRICTION in three buckets:
- actual: friction the anamnesis evidences today.
- potential: friction that is not hurting yet but will under a named condition.
- prunable: steps or artefacts that could be removed outright — with what removing them
  would cost, because "just delete it" is not an analysis.

COMPLETENESS — the first version of this digest listed one tool where the toolchain
section named four, which makes the matrix worse than useless: a reader takes an
incomplete list for a complete one. So: walk the toolchain section line by line and
emit ONE ENTRY PER TOOL it names, including the spreadsheets and the mail client.
A spreadsheet everyone depends on is a tool. Email carrying purchase orders is a tool.
Do not summarise the inventory, do not merge two tools into one row, and do not drop a
tool because it is unglamorous — those are usually the interesting ones.

The same applies to friction: harvest every friction point the anamnesis evidences,
not a representative sample.

RULES
- Use only what is in the anamnesis. Do not invent tools, numbers, or neighbouring
  processes. If dependencies were never discussed, return empty lists and say so in gaps.
- Every friction entry in "actual" needs its evidence named. If you cannot name it, it
  belongs in "potential".
- Where the material is thin, lower the confidence and say what is missing. A confident
  digest over four filled sections is a lie about the state of the work.

Return ONLY a single JSON object, no prose around it, in exactly this shape:
${SHAPE}

<anamnesis>
${parts.join("\n\n") || "(nothing filled in yet)"}
</anamnesis>`;
}

/** Pulls the JSON out of a reply that may or may not be fenced. */
function extractJson(text: string): Record<string, unknown> | null {
  const fenced = String(text).match(/```(?:json)?\s*\n([\s\S]*?)```/);
  const raw = fenced ? fenced[1]! : String(text);
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function generate(slug: string, now: string): Promise<unknown | null> {
  const out = await llm.chat(await buildPrompt(slug), [{ role: "user", content: "Produce the digest now." }], { maxTokens: 9000 });
  const data = extractJson(out.text);
  if (!data || !data.processStatement) {
    const e = new Error("the model did not return a usable digest — nothing was saved") as Error & { code?: string; reply?: string };
    e.code = "NO_DIGEST";
    e.reply = out.text.slice(0, 500);
    throw e;
  }
  return write(slug, { ...data, model: out.model, provider: out.provider }, now);
}
