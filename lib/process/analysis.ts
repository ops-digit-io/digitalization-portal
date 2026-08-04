/**
 * The analysis AGENT: reads a process diagnosis and disassembles it into distinct
 * demands for the demand funnel (du-demands). No prompt to copy — the agent runs
 * `getProvider().complete` with a `propose_demands` tool, governed by the
 * git-stored `process-analysis` playbook. A deterministic proposer derives sensible
 * demands from the profile so it also works with no model key (offline).
 */

import { type ToolSpec } from "../agent/provider";
import { resolveProvider } from "../model-settings";
import { recordUsage } from "../usage-meter";
import { loadGoverning, stripFrontmatter } from "../agent/governing";
import { composeSystemPrompt, governedBy, resolveGovernance } from "../agent/compose";
import { agentPrompt } from "./prompts";
import { render } from "./render";
import { buildDemand, classifyDemand, EMPTY_ANSWERS, type DemandAnswers } from "../demand";
import { saveNewDemand } from "../demands-store";
import { addReference } from "../references";
import type { Lane } from "../types";
import * as store from "./store";
import { profileFrom } from "./profile";
import { readSection } from "./store";
import * as C from "./content";
import type { Locale } from "../i18n";

const LANES: Lane[] = ["run", "regulatory", "continuous_improvement", "transform", "innovation", "data_ai", "local"];

/**
 * Text for the derived demands. It lives here rather than in the UI dictionary
 * because it is not chrome: these strings are written into the demand record in
 * du-demands and outlive the screen that produced them.
 */
const SEED = {
  en: {
    spoke: {
      title: "Appoint the spoke",
      problem: "No named owner with authority to change, and no champion — without a spoke there is no intake (K8.1 at level 1).",
    },
    measurability: {
      title: "Make the process measurable (harvestable timestamps)",
      problem: "The main latencies cannot be evidenced. Open up exhaust data or set up a sample collection (branch 1b). This is the enabler that has to come before any optimisation.",
    },
    interfaces: {
      title: "Open up interface access",
      problem: "The data of the systems involved cannot be extracted (no API, no export). Create or negotiate access (branch 1b) — through compounding this also pays into every other process on the same system.",
    },
    weak: (id: string, label: string, score: number, question: string) => ({
      title: `Improve ${label} (${id})`,
      problem: `Dimension ${id} “${label}” stands at ${score.toFixed(1)} (the dimension asks: ${question}). Take the smallest independently valuable cut first.`,
    }),
  },
  de: {
    spoke: {
      title: "Spoke-Minimum besetzen",
      problem: "Kein benannter Verantwortlicher mit Änderungsbefugnis und kein Champion — ohne Spoke keine Aufnahme (K8.1 auf S1).",
    },
    measurability: {
      title: "Messbarkeit herstellen (Timestamps farmbar machen)",
      problem: "Die Hauptlatenzen sind nicht belegbar. Exhaust-Daten erschließen oder eine Stichproben-Erhebung aufsetzen (Zweig 1b). Enabler vor jeder Optimierung.",
    },
    interfaces: {
      title: "Interface-Zugang schaffen",
      problem: "Die Daten der beteiligten Systeme sind nicht ausleitbar (kein API, kein Export). Zugang schaffen oder verhandeln (Zweig 1b) — zahlt per Compounding auf jeden weiteren Prozess am selben System ein.",
    },
    weak: (id: string, label: string, score: number, question: string) => ({
      title: `${label} verbessern (${id})`,
      problem: `Dimension ${id} „${label}“ steht bei ${score.toFixed(1).replace(".", ",")} (Kernfrage: ${question}). Kleinsten unabhängig wertvollen Schnitt zuerst.`,
    }),
  },
} as const;

/** Short, language-neutral note of which finding produced a demand. */
const basisKo = (id: string) => `Knock-out ${id}`;
const basisDim = (id: string, score: number) => `Dimension ${id} = ${score.toFixed(1)}`;

export interface DemandProposal {
  title: string;
  problem: string;
  lane?: Lane;
  domain?: string;
  basis?: string; // welcher Befund der Diagnose
}

// -------------------------------------------------- deterministic proposer
/** Baseline demands derived directly from the profile — the offline fallback and
 *  the seed the live model refines. Enabler-before-optimisation is honoured. */
export function deterministicDemands(
  profile: ReturnType<typeof profileFrom>,
  locale: Locale = "en",
): DemandProposal[] {
  const t = SEED[locale === "de" ? "de" : "en"];
  const out: DemandProposal[] = [];
  const ko = (id: string) => profile.knockOuts.find((k) => k.id === id);

  // Nothing assessed: every criterion stands at level 1 by convention (§1.3), so
  // any "finding" here would be an artefact of the convention, not of the process.
  // Proposing demands off that would put fiction into the demand funnel.
  if (profile.ratedCount === 0) return [];

  // No spoke is the one finding that stops everything else (§5, intake knock-out).
  if (ko("K8.1")?.state === "fail") {
    out.push({ ...t.spoke, lane: "transform", basis: basisKo("K8.1") });
    return out;
  }

  if ((ko("K5.1")?.level ?? 5) <= 2) {
    out.push({ ...t.measurability, lane: "data_ai", basis: basisKo("K5.1") });
  }
  if ((ko("K2.2")?.level ?? 5) <= 2) {
    out.push({ ...t.interfaces, lane: "data_ai", basis: basisKo("K2.2") });
  }

  // An optimisation knock-out AT LEVEL 1 makes every optimisation statement
  // worthless (§6.2), and the catalogue allows exactly one intervention in that
  // case: build the enabler, then re-score (§5, "einzige zulässige Intervention").
  // So we stop here rather than piling improvement demands on top of it.
  if (ko("K5.1")?.state === "fail" || ko("K2.2")?.state === "fail") return out;

  // Otherwise: the weakest dimensions → targeted improvement demands.
  const weak = profile.dimensions
    .filter((d) => d.score < 3)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);
  for (const d of weak) {
    const dt = C.dimText(locale, d.id);
    out.push({
      ...t.weak(d.id, dt.label, d.score, dt.question),
      lane: d.id === "D2" || d.id === "D5" ? "data_ai" : "continuous_improvement",
      basis: basisDim(d.id, d.score),
    });
  }
  return out;
}

/** The library playbook that governs the pre-funnel's demand split. */
export const ANALYSIS_PLAYBOOK = "process-analysis";

// ---------------------------------------------------------- the agent
const proposeTool: ToolSpec = {
  name: "propose_demands",
  description: "Liefert die Liste der aus der Diagnose abgeleiteten Bedarfe.",
  input_schema: {
    type: "object",
    properties: {
      demands: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            problem: { type: "string" },
            lane: { type: "string", enum: LANES },
            domain: { type: "string" },
            basis: { type: "string" },
          },
          required: ["title", "problem"],
        },
      },
    },
    required: ["demands"],
  },
};

async function diagnosisFacts(slug: string): Promise<{ summary: string; meta: store.EngagementMeta; profile: ReturnType<typeof profileFrom> }> {
  const [m, r] = await Promise.all([store.meta(slug), store.ratings(slug)]);
  const profile = profileFrom(m, r);
  const dims = profile.dimensions.map((d) => `${d.id} ${d.label}: ${d.score ?? "—"}`).join("; ");
  const kos = profile.knockOuts.map((k) => `${k.id} ${k.label}: ${k.level ? "S" + k.level : "—"} (${k.state})`).join("; ");
  // A couple of narrative artefacts that carry the findings, if present.
  const [diagnose, increment, flow] = await Promise.all([
    readSection(slug, "diagnosis"),
    readSection(slug, "increment"),
    readSection(slug, "flow"),
  ]);
  const summary = [
    `Prozess: ${m!.title} · Anflug: ${m!.anflug} · Status: ${profile.status} (${profile.reason})`,
    `Dimensionen: ${dims}`,
    `Knock-outs: ${kos}`,
    profile.directions.length ? `Richtungsvektor: ${profile.directions.join(" | ")}` : "",
    m!.branch ? `Gewählter Zweig: ${m!.branch}${m!.riskClass ? ` · Risikoklasse ${m!.riskClass}` : ""}` : "",
    diagnose.trim() ? `\n[Diagnosis & Branch]\n${diagnose.slice(0, 1200)}` : "",
    increment.trim() ? `\n[Value Increment & Velocity]\n${increment.slice(0, 800)}` : "",
    flow.trim() ? `\n[Flow, Friction & Latency]\n${flow.slice(0, 800)}` : "",
  ].filter(Boolean).join("\n");
  return { summary, meta: m!, profile };
}

/**
 * Run the agent (or the deterministic fallback) and return proposed demands.
 * Nothing is written here — creation is a separate, confirmed step.
 * `assessed` is false when no criterion has been rated yet, in which case there
 * is deliberately nothing to propose (see deterministicDemands).
 */
export async function analyse(
  slug: string,
  locale: Locale = "en",
): Promise<{ demands: DemandProposal[]; live: boolean; assessed: boolean; governance?: ReturnType<typeof governedBy> }> {
  const { summary, profile } = await diagnosisFacts(slug);
  const seed = deterministicDemands(profile, locale);
  const assessed = profile.ratedCount > 0;
  if (!assessed) return { demands: [], live: false, assessed };

  const provider = await resolveProvider();
  const speak = locale === "de" ? "Antworte auf Deutsch." : "Respond in English.";
  // The pre-funnel's demand split runs on the composed library like every other
  // agent: the playbook names `demand-splitting`, which itself composes
  // `evidence-standards` and `usecase-archetypes`. Missing governance is stated
  // in the prompt rather than silently replaced by a one-line fallback.
  const g = await resolveGovernance(ANALYSIS_PLAYBOOK).catch(() => null);
  const system = g
    ? composeSystemPrompt(
        "You are the Intake Analyst of the pre-funnel. You disassemble a finished process diagnosis into distinct, shippable demands.",
        g,
      )
    : "You are the Intake Analyst. Split the diagnosis into individual demands and call propose_demands.";

  // The ```facts block lets the offline provider echo the deterministic seed;
  // a live model refines/expands it against the diagnosis.
  const user = render(await agentPrompt("analysis-user"), {
    speak,
    summary,
    facts: JSON.stringify({ demands: seed }),
  });

  try {
    // `speak` is already in the user turn. Appending it to the system prompt as
    // well made the composed governance prefix differ per locale, so every
    // German run missed the cache the English runs had just written — for a
    // sentence the model had already read.
    const res = await provider.complete({
      system,
      messages: [{ role: "user", content: user }],
      tools: [proposeTool],
      toolChoice: { type: "tool", name: proposeTool.name },
      // Room for the reasoning AND the list of demands. Below this the demands
      // are what get cut, and a cut list falls silently back to the seed.
      maxTokens: 8000,
    });
    await recordUsage({ feature: "process.analysis", provider: provider.name, model: provider.model, usage: res.usage });
    const raw = (res.toolCalls[0]?.input as { demands?: DemandProposal[] } | undefined)?.demands;
    const demands = Array.isArray(raw) && raw.length ? raw : seed;
    return { demands: demands.map(normalise), live: provider.live, assessed, ...(g ? { governance: governedBy(g) } : {}) };
  } catch {
    return { demands: seed.map(normalise), live: false, assessed, ...(g ? { governance: governedBy(g) } : {}) };
  }
}

function normalise(d: DemandProposal): DemandProposal {
  const lane = d.lane && LANES.includes(d.lane) ? d.lane : undefined;
  return { title: String(d.title || "").trim(), problem: String(d.problem || "").trim(), ...(lane ? { lane } : {}), ...(d.domain ? { domain: String(d.domain) } : {}), ...(d.basis ? { basis: String(d.basis) } : {}) };
}

// ------------------------------------------------ create demands in du-demands
export interface CreatedDemand {
  id: string;
  title: string;
  host: string;
  path: string;
}

/** Create the selected demands in the demand funnel and record them on the engagement. */
export async function createDemands(
  slug: string,
  proposals: DemandProposal[],
  now: string,
  locale: Locale = "en",
): Promise<CreatedDemand[]> {
  const de = locale === "de";
  /** Provenance line on the demand: which diagnosis, and which finding in it. */
  const pain = (title: string, basis?: string) =>
    de
      ? basis
        ? `Befund der Prozessdiagnose „${title}“: ${basis}`
        : `Aus der Prozessdiagnose „${title}“.`
      : basis
        ? `Finding from the process diagnosis “${title}”: ${basis}`
        : `From the process diagnosis “${title}”.`;
  const m = (await store.meta(slug))!;
  const createdOn = now.slice(0, 10);
  const year = Number(now.slice(0, 4)) || new Date().getFullYear();
  const created: CreatedDemand[] = [];

  for (const p of proposals) {
    if (!p.title.trim()) continue;
    const answers: DemandAnswers = {
      ...EMPTY_ANSWERS,
      title: p.title.trim(),
      problem: p.problem.trim(),
      currentPain: pain(m.title, p.basis),
      desiredOutcome: p.title.trim(),
      affectedProcess: m.title,
      plant: m.unit || "ALL",
      ...(p.domain ? { domain: p.domain } : {}),
      requester: m.owner || "",
    };
    const lane = p.lane ?? classifyDemand(answers).lane;
    // Record the origin as a REFERENCE, not only as the prose line above. The
    // engagement already lists what it was cut into; without this the demand had
    // no way back — a reader landing on it could see it came from "a process
    // diagnosis" and had no way to reach the diagnosis, and nor did any code.
    const { id, result } = await saveNewDemand(year, (uid) =>
      addReference(buildDemand({ id: uid, createdOn, lane }, answers), {
        kind: "process",
        id: m.slug,
        note: de ? `Aus der Prozessdiagnose „${m.title}" herausgeschnitten.` : `Cut out of the process diagnosis “${m.title}”.`,
      }),
    );
    created.push({ id, title: p.title.trim(), host: result.host, path: result.path });
  }

  const demands = [...(m.demands ?? []), ...created.map((c) => ({ id: c.id, title: c.title, at: now }))];
  await store.writeMeta(slug, { demands }, now);
  return created;
}
