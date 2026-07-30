/**
 * Advisory artefacts: storage, prompt assembly, and the accept/reject ledger.
 * Ported verbatim from PDT's `advisor.js`. An advisory pass gets the WHOLE
 * anamnesis, not just what came before it — a problem cluster you can see inside
 * one section is not a cluster.
 */

import fs from "node:fs";
import path from "node:path";
import { ordered as sectionsOrdered } from "./sections";
import { byKey as advByKey } from "./advisory";
import * as store from "./store";
import { readIf, shared, advisoryPrompt, advisoryTemplate, playbook } from "./assets";

export interface Decision {
  advisoryKey: string;
  proposalId: string;
  title: string;
  verdict: "accepted" | "rejected" | "deferred";
  reason: string;
  at: string;
  supersedes: string | null;
}

function advPath(slug: string, key: string): string {
  const a = advByKey[key];
  if (!a) throw new Error(`unknown advisory item ${key}`);
  return path.join(path.dirname(store.artefactPath(slug, "profile")), a.file);
}

export function read(slug: string, key: string): string {
  const p = advPath(slug, key);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

export function write(slug: string, key: string, content: string, now: string): { changed: boolean } {
  const p = advPath(slug, key);
  if (fs.existsSync(p)) {
    const prev = fs.readFileSync(p, "utf8");
    if (prev === content) return { changed: false };
    const dir = path.join(path.dirname(p), "history");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${key}.${String(now).replace(/[:.]/g, "-")}.md`), prev);
  }
  fs.writeFileSync(p, content);
  store.writeMeta(slug, {}, now);
  return { changed: true };
}

// ------------------------------------------------------------ decisions
function decisionsPath(slug: string): string {
  return path.join(path.dirname(store.artefactPath(slug, "profile")), "decisions.json");
}

export function decisions(slug: string): Decision[] {
  const p = decisionsPath(slug);
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as Decision[];
  } catch {
    return [];
  }
}

/** Records a verdict on one proposal. A rejection without a reason is refused at
 *  the route — a proposal that quietly disappears teaches nobody anything. */
export function decide(
  slug: string,
  input: { advisoryKey: string; proposalId: string; title?: string; verdict: Decision["verdict"]; reason?: string },
  now: string,
): Decision {
  const all = decisions(slug);
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
  fs.writeFileSync(decisionsPath(slug), JSON.stringify(all, null, 2));
  store.writeMeta(slug, {}, now);
  return entry;
}

// --------------------------------------------------------------- prompts
/** The complete anamnesis, for advisory passes that must see everything at once. */
export function fullAnamnesis(slug: string): string {
  const parts: string[] = [];
  for (const s of sectionsOrdered()) {
    const c = store.read(slug, s.key).trim();
    if (!c) continue;
    parts.push(`<section key="${s.key}" label="${s.label}">\n${c}\n</section>`);
  }
  return parts.join("\n\n");
}

export function build(slug: string, key: string): string {
  const a = advByKey[key];
  if (!a) throw new Error(`unknown advisory item ${key}`);
  const m = store.meta(slug);
  const filled = sectionsOrdered()
    .filter((s) => store.read(slug, s.key).trim())
    .map((s) => s.key);
  const missing = a.needs.filter((k) => !filled.includes(k));
  const existing = read(slug, key);
  const prior = decisions(slug).filter((d) => d.advisoryKey === key);

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
    shared(),
    missing.length
      ? `<caution>\nThese sections this pass depends on are still empty: ${missing.join(", ")}.\nSay so in your output and keep the affected proposals explicitly provisional.\n</caution>`
      : "",
    `<guidance>\n${advisoryPrompt(key) || "(no advisory prompt on disk yet)"}\n</guidance>`,
    `<target-template>\n${advisoryTemplate(key) || "(no template on disk yet)"}\n</target-template>`,
    key === "target-tech" || key === "improvements"
      ? `<tool-playbook>\nThis is the organisation's tool playbook. Propose from it by preference. If you\npropose something outside it, say why the playbook does not cover the case.\n\n${playbook() || "(no playbook on disk yet)"}\n</tool-playbook>`
      : "",
    `<anamnesis>\n${fullAnamnesis(slug) || "(nothing filled in yet)"}\n</anamnesis>`,
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

// `readIf` re-exported so route handlers that render the playbook can reuse it.
export { readIf };
