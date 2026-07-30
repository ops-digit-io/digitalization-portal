/**
 * Advisory artefacts: storage, prompt assembly, and the accept/reject ledger.
 * Same construction as PDT's `advisor.js`. An advisory pass gets the WHOLE
 * anamnesis, not just what came before it — a problem cluster you can see inside
 * one section is not a cluster.
 *
 * Now async: artefacts and the decision ledger are stored via the git-backed
 * store, and the advisory prompts + tool playbook load from the playbook registry.
 */

import { ordered as sectionsOrdered } from "./sections";
import { byKey as advByKey } from "./advisory";
import * as store from "./store";
import { advisoryTemplate } from "./assets";
import { shared, advisoryPrompt, playbook } from "./prompts";

const DECISIONS = "decisions.json";

export interface Decision {
  advisoryKey: string;
  proposalId: string;
  title: string;
  verdict: "accepted" | "rejected" | "deferred";
  reason: string;
  at: string;
  supersedes: string | null;
}

export async function read(slug: string, key: string): Promise<string> {
  const a = advByKey[key];
  if (!a) throw new Error(`unknown advisory item ${key}`);
  return (await store.readFileRaw(slug, a.file)) ?? "";
}

export async function write(slug: string, key: string, content: string, now: string): Promise<{ changed: boolean }> {
  const a = advByKey[key];
  if (!a) throw new Error(`unknown advisory item ${key}`);
  const prev = await store.readFileRaw(slug, a.file);
  if (prev === content) return { changed: false };
  await store.writeFileRaw(slug, a.file, content, now, `Update advisory ${key} on ${store.slugify(slug)}`);
  return { changed: true };
}

// ------------------------------------------------------------ decisions
export async function decisions(slug: string): Promise<Decision[]> {
  const raw = await store.readFileRaw(slug, DECISIONS);
  if (raw === undefined) return [];
  try {
    return JSON.parse(raw) as Decision[];
  } catch {
    return [];
  }
}

/** Records a verdict on one proposal. A rejection without a reason is refused at
 *  the route — a proposal that quietly disappears teaches nobody anything. */
export async function decide(
  slug: string,
  input: { advisoryKey: string; proposalId: string; title?: string; verdict: Decision["verdict"]; reason?: string },
  now: string,
): Promise<Decision> {
  const all = await decisions(slug);
  const i = all.findIndex((d) => d.advisoryKey === input.advisoryKey && d.proposalId === input.proposalId);
  const entry: Decision = {
    advisoryKey: input.advisoryKey,
    proposalId: input.proposalId,
    title: String(input.title || ""),
    verdict: input.verdict,
    reason: String(input.reason || ""),
    at: now,
    supersedes: i >= 0 ? all[i]!.at : null,
  };
  if (i >= 0) all[i] = entry;
  else all.push(entry);
  await store.writeFileRaw(slug, DECISIONS, JSON.stringify(all, null, 2), now, `Record advisory verdict on ${store.slugify(slug)}`);
  return entry;
}

// --------------------------------------------------------------- prompts
/** The complete anamnesis, for advisory passes that must see everything at once. */
export async function fullAnamnesis(slug: string): Promise<string> {
  const parts: string[] = [];
  for (const s of sectionsOrdered()) {
    const c = (await store.read(slug, s.key)).trim();
    if (!c) continue;
    parts.push(`<section key="${s.key}" label="${s.label}">\n${c}\n</section>`);
  }
  return parts.join("\n\n");
}

export async function build(slug: string, key: string): Promise<string> {
  const a = advByKey[key];
  if (!a) throw new Error(`unknown advisory item ${key}`);
  const m = (await store.meta(slug))!;

  const filledFlags = await Promise.all(sectionsOrdered().map(async (s) => ((await store.read(slug, s.key)).trim() ? s.key : null)));
  const filled = filledFlags.filter((k): k is string => k !== null);
  const missing = a.needs.filter((k) => !filled.includes(k));

  const [existing, prior, sharedText, guidance, anamnesis, book] = await Promise.all([
    read(slug, key),
    decisions(slug).then((all) => all.filter((d) => d.advisoryKey === key)),
    shared(),
    advisoryPrompt(key),
    fullAnamnesis(slug),
    key === "target-tech" || key === "improvements" ? playbook() : Promise.resolve(""),
  ]);

  return [
    `You are running the advisory pass "${a.label}" on a process diagnosis for OESL Automotive.

Engagement: ${m.title}
Process owner: ${m.owner || "(not recorded)"}
Unit / cost centre: ${m.unit || "(not recorded)"}
Today's date: ${new Date().toISOString().slice(0, 10)}

Purpose of this pass: ${a.description}

OUTPUT DISCIPLINE
The template contains instructions addressed to YOU — blockquotes telling you how to fill it,
bracketed hints, and example rows. None of that belongs in the finished artefact. Strip it.
What you hand back must read as a finished document to someone who has never seen the template.

Concretely: no square-bracket placeholders; no "fill every placeholder" lines; no example table
rows left with their brackets in. Where something is genuinely not established, write
"not established" and say what would establish it. Delete table rows you have nothing to put in
rather than leaving them empty. Copy the headings and field labels exactly — those are read by
a machine.

THE MOST IMPORTANT RULE OF THIS LAYER
What you produce is a PROPOSAL, not a finding. The anamnesis below is established
reality — a named person put their name to it. Your output is derived, and it will
sometimes be wrong. Mark every proposal as a proposal, give each one a stable id so
a verdict can be attached to it, and never restate a proposal as if the process
owner had said it.`,
    sharedText,
    missing.length
      ? `<caution>\nThese sections this pass depends on are still empty: ${missing.join(", ")}.\nSay so in your output and keep the affected proposals explicitly provisional.\n</caution>`
      : "",
    `<guidance>\n${guidance || "(no advisory prompt in the registry yet)"}\n</guidance>`,
    `<target-template>\n${advisoryTemplate(key) || "(no template on disk yet)"}\n</target-template>`,
    book
      ? `<tool-playbook>\nThis is the organisation's tool playbook. Propose from it by preference. If you\npropose something outside it, say why the playbook does not cover the case.\n\n${book}\n</tool-playbook>`
      : "",
    `<anamnesis>\n${anamnesis || "(nothing filled in yet)"}\n</anamnesis>`,
    prior.length
      ? `<prior-verdicts>\nProposals already decided on. Do not re-propose a rejected one unless something\nin the anamnesis has changed; if you do, say what changed.\n\n${prior
          .map((d) => `- [${d.verdict}] ${d.proposalId}: ${d.title} — ${d.reason}`)
          .join("\n")}\n</prior-verdicts>`
      : "",
    existing.trim()
      ? `<existing-output>\nThis pass has run before. Build on it; do not silently drop proposals that are\nstill valid.\n\n${existing}\n</existing-output>`
      : "",
    `Produce the complete artefact in a single fenced markdown block, following the target
template exactly, so it can be saved verbatim.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
