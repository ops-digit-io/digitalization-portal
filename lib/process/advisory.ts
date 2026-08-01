/**
 * The advisory layer — everything that sits ABOVE the anamnesis. Ported from the
 * source tool's `backend/config/advisory.js` and `backend/services/advisor.js`.
 *
 * The separation from sections.ts is the important construction decision here.
 *
 * A section artefact is ESTABLISHED REALITY: a named human said it, and their name
 * is on the engagement. High trust, low volume, slow to change.
 * An advisory artefact is DERIVED PROPOSAL: a machine (or a consultant) worked it
 * out from that reality. Useful, cheap to produce, and wrong often enough that it
 * must never be mistaken for the first kind.
 *
 * If both were written into the same files, then in three months nobody could tell
 * what the process owner said from what a model suggested. They are therefore
 * separate artefacts, separately stored, separately rendered, and every proposal
 * carries an explicit verdict — accepted or rejected, with a reason.
 *
 * A rejected proposal with a reason is the most valuable line in the document when
 * the same idea comes back a year later.
 */

import { SECTIONS } from "./sections";
import * as store from "./store";
import { shared, advisoryPrompt, playbook, agentPrompt } from "./prompts";
import { render } from "./render";
import { advisoryTemplate, MISSING_TEMPLATE } from "./templates";

export interface AdvisoryItem {
  key: string;
  label: string;
  order: number;
  file: string;
  icon: string;
  description: string;
  /** Sections this pass stands on — advisory over a half-empty anamnesis is nonsense. */
  needs: string[];
}

export const ADVISORY: AdvisoryItem[] = [
  {
    key: "challenge",
    label: "Challenge",
    order: 1,
    file: "A1-challenge.md",
    icon: "?",
    description:
      "Critical questions back at the anamnesis: what is missing, what is evidenced too " +
      "softly, what should additionally be tracked — and what would happen if this " +
      "sub-process did not exist at all.",
    needs: ["profile", "purpose", "mapping", "flow"],
    // Deliberately runs early: challenging an assessment is cheap before the
    // business case is built on it and expensive afterwards.
  },
  {
    key: "clusters",
    label: "Problem clusters",
    order: 2,
    file: "A2-clusters.md",
    icon: "▣",
    description:
      "The findings from all sections, clustered and ranked by severity, in one place. " +
      "Individual findings scattered across fourteen artefacts hide the pattern.",
    needs: ["mapping", "toolchain", "flow", "diagnostics"],
  },
  {
    key: "improvements",
    label: "Improvement ideas",
    order: 3,
    file: "A3-improvements.md",
    icon: "↑",
    description:
      "Proposals for the process itself, for the KPI design, and for KPI calibration — " +
      "each with its trade-off stated, not just its upside.",
    needs: ["flow", "kpi", "diagnostics"],
  },
  {
    key: "target-tech",
    label: "Target technology map",
    order: 4,
    file: "A4-target-tech.md",
    icon: "→",
    description:
      "Today → transition or quick win → target technology, per process step, justified " +
      "against the tool playbook and restricted to assets the organisation already " +
      "trusts and can operate.",
    needs: ["toolchain", "literacy", "cost-of-change"],
  },
];

export const advisoryByKey: Record<string, AdvisoryItem> = Object.fromEntries(ADVISORY.map((a) => [a.key, a]));

export function advisoryOrdered(): AdvisoryItem[] {
  return [...ADVISORY].sort((a, b) => a.order - b.order);
}

/**
 * Advisory work on a half-empty anamnesis produces confident nonsense, so each
 * item declares which sections it needs. Not a hard block — the unit may want a
 * challenge pass early — but the UI says what the proposal is standing on.
 */
export function readiness(a: AdvisoryItem, filledKeys: string[]): { ready: boolean; missing: string[] } {
  const have = new Set(filledKeys);
  const missing = a.needs.filter((k) => !have.has(k));
  return { ready: missing.length === 0, missing };
}

// ------------------------------------------------------------------ verdicts
export type Verdict = "accepted" | "rejected" | "deferred";
export interface Decision {
  advisoryKey: string;
  proposalId: string;
  title: string;
  verdict: Verdict;
  reason: string;
  at: string;
  supersedes: string | null;
}

/**
 * Records a verdict on one proposal. A rejection without a reason is refused at
 * the route — a proposal that quietly disappears teaches nobody anything.
 */
export async function decide(
  slug: string,
  input: { advisoryKey: string; proposalId: string; title?: string; verdict: Verdict; reason?: string },
  now: string,
): Promise<Decision> {
  const all = await store.readDecisions(slug);
  const i = all.findIndex((d) => d.advisoryKey === input.advisoryKey && d.proposalId === input.proposalId);
  const entry: Decision = {
    advisoryKey: input.advisoryKey,
    proposalId: input.proposalId,
    title: String(input.title || ""),
    verdict: input.verdict,
    reason: String(input.reason || ""),
    at: now,
    supersedes: i >= 0 ? (all[i]!.at ?? null) : null,
  };
  if (i >= 0) all[i] = entry;
  else all.push(entry);
  await store.writeDecisions(slug, all, now);
  return entry;
}

// ------------------------------------------------------------------- prompt
/** The pass's target document shape, from `du-templates`. */
async function template(key: string): Promise<string> {
  return advisoryTemplate(key);
}

/** The complete anamnesis, for advisory passes that must see everything at once. */
export async function fullAnamnesis(slug: string): Promise<string> {
  const parts: string[] = [];
  for (const s of [...SECTIONS].sort((a, b) => a.order - b.order)) {
    const c = (await store.readSection(slug, s.key)).trim();
    if (!c) continue;
    parts.push(`<section key="${s.key}" label="${s.label}">\n${c}\n</section>`);
  }
  return parts.join("\n\n");
}

export async function build(slug: string, key: string): Promise<string> {
  const a = advisoryByKey[key];
  if (!a) throw new Error(`unknown advisory item ${key}`);
  const m = (await store.meta(slug))!;
  const filled = store.filledOf(m);
  const missing = a.needs.filter((k) => !filled.includes(k));
  const [existing, prior, sharedText, guidance, targetTemplate, anamnesis, book, headTpl] = await Promise.all([
    store.readAdvisory(slug, key),
    store.readDecisions(slug),
    shared(),
    advisoryPrompt(key),
    template(key),
    fullAnamnesis(slug),
    key === "target-tech" || key === "improvements" ? playbook() : Promise.resolve(""),
    agentPrompt("advisory"),
  ]);
  const mine = prior.filter((d) => d.advisoryKey === key);

  return [
    render(headTpl, {
      passLabel: a.label,
      title: m.title,
      owner: m.owner || "(not recorded)",
      unit: m.unit || "(not recorded)",
      today: new Date().toISOString().slice(0, 10),
      description: a.description,
    }),
    sharedText,
    missing.length
      ? `<caution>\nThese sections this pass depends on are still empty: ${missing.join(", ")}.\nSay so in your output and keep the affected proposals explicitly provisional.\n</caution>`
      : "",
    `<guidance>\n${guidance || "(no advisory prompt on disk yet)"}\n</guidance>`,
    `<target-template>\n${targetTemplate || MISSING_TEMPLATE}\n</target-template>`,
    book
      ? `<tool-playbook>\nThis is the organisation's tool playbook. Propose from it by preference. If you\npropose something outside it, say why the playbook does not cover the case.\n\n${book}\n</tool-playbook>`
      : "",
    `<anamnesis>\n${anamnesis || "(nothing filled in yet)"}\n</anamnesis>`,
    mine.length
      ? `<prior-verdicts>\nProposals already decided on. Do not re-propose a rejected one unless something\nin the anamnesis has changed; if you do, say what changed.\n\n${mine
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
