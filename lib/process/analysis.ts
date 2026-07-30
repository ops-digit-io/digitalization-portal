/**
 * The analysis AGENT: reads a process diagnosis and disassembles it into distinct
 * demands for the demand funnel (du-demands). No prompt to copy — the agent runs
 * `getProvider().complete` with a `propose_demands` tool, governed by the
 * git-stored `process-analysis` playbook. A deterministic proposer derives sensible
 * demands from the profile so it also works with no model key (offline).
 */

import { getProvider, type ToolSpec } from "../agent/provider";
import { loadGoverning, stripFrontmatter } from "../agent/governing";
import { buildDemand, classifyDemand, EMPTY_ANSWERS, type DemandAnswers } from "../demand";
import { saveNewDemand } from "../demands-store";
import type { Lane } from "../types";
import { DIMENSIONS } from "./criteria";
import * as store from "./store";
import { profileFrom } from "./profile";
import { readArtefact } from "./store";

const LANES: Lane[] = ["run", "regulatory", "continuous_improvement", "transform", "innovation", "data_ai", "local"];

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
export function deterministicDemands(profile: ReturnType<typeof profileFrom>): DemandProposal[] {
  const out: DemandProposal[] = [];
  const ko = (id: string) => profile.knockOuts.find((k) => k.id === id);

  if (ko("K8.1")?.state === "fail") {
    out.push({ title: "Spoke-Minimum besetzen", problem: "Kein benannter Verantwortlicher mit Änderungsbefugnis / Champion — ohne Spoke keine Aufnahme (K8.1 = S1).", lane: "transform", basis: "Knock-out K8.1" });
    return out; // nichts anderes, bis der Spoke steht
  }
  if ((ko("K5.1")?.level ?? 5) <= 2) {
    out.push({ title: "Messbarkeit herstellen (Timestamps farmbar machen)", problem: "Hauptlatenzen sind nicht belegbar; Exhaust-Daten erschließen oder Stichproben-Erhebung aufsetzen (Zweig 1b). Enabler vor jeder Optimierung.", lane: "data_ai", basis: "Knock-out/Schwäche K5.1" });
  }
  if ((ko("K2.2")?.level ?? 5) <= 2) {
    out.push({ title: "Interface-Zugang schaffen", problem: "Die Daten der beteiligten Systeme sind nicht ausleitbar (kein API/Export). Zugang schaffen oder verhandeln (Zweig 1b) — zahlt per Compounding auf weitere Prozesse ein.", lane: "data_ai", basis: "Knock-out/Schwäche K2.2" });
  }

  // Weakest assessed dimensions → gezielte Verbesserungsbedarfe.
  const weak = profile.dimensions
    .filter((d) => d.score !== null && d.score < 3)
    .sort((a, b) => (a.score ?? 5) - (b.score ?? 5))
    .slice(0, 2);
  for (const d of weak) {
    const def = DIMENSIONS.find((x) => x.id === d.id);
    out.push({
      title: `${d.label} verbessern (${d.id})`,
      problem: `Dimension ${d.id} „${d.label}" bei ${d.score} (Frage: ${def?.question ?? ""}). Kleinsten unabhängig wertvollen Schnitt zuerst.`,
      lane: d.id === "D2" || d.id === "D5" ? "data_ai" : "continuous_improvement",
      basis: `Dimension ${d.id} = ${d.score}`,
    });
  }
  return out;
}

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
  const [diagnose, hypothese, friktion] = await Promise.all([
    readArtefact(slug, "a3-diagnose"),
    readArtefact(slug, "a3-hypothese"),
    readArtefact(slug, "a1-friktionsliste"),
  ]);
  const summary = [
    `Prozess: ${m!.title} · Anflug: ${m!.anflug} · Status: ${profile.status} (${profile.reason})`,
    `Dimensionen: ${dims}`,
    `Knock-outs: ${kos}`,
    profile.directions.length ? `Richtungsvektor: ${profile.directions.join(" | ")}` : "",
    m!.branch ? `Gewählter Zweig: ${m!.branch}${m!.riskClass ? ` · Risikoklasse ${m!.riskClass}` : ""}` : "",
    diagnose.trim() ? `\n[Diagnose-Entscheid]\n${diagnose.slice(0, 1200)}` : "",
    hypothese.trim() ? `\n[Interventionshypothese]\n${hypothese.slice(0, 800)}` : "",
    friktion.trim() ? `\n[Friktionsliste]\n${friktion.slice(0, 800)}` : "",
  ].filter(Boolean).join("\n");
  return { summary, meta: m!, profile };
}

/** Run the agent (or the deterministic fallback) and return proposed demands. */
export async function analyse(slug: string): Promise<{ demands: DemandProposal[]; live: boolean }> {
  const { summary, profile } = await diagnosisFacts(slug);
  const seed = deterministicDemands(profile);
  const provider = getProvider();

  const system = (await loadGoverning("playbook", "process-analysis").then(stripFrontmatter).catch(() => "")) ||
    "Du bist ein Intake-Analyst. Zerlege die Diagnose in einzelne Bedarfe und rufe propose_demands auf.";

  // The ```facts block lets the offline provider echo the deterministic seed;
  // a live model refines/expands it against the diagnosis.
  const user = `Hier ist die Diagnose. Zerlege sie in einzelne, umsetzbare Bedarfe und rufe propose_demands auf.\n\n${summary}\n\n\`\`\`facts\n${JSON.stringify({ demands: seed })}\n\`\`\``;

  try {
    const res = await provider.complete({ system, messages: [{ role: "user", content: user }], tools: [proposeTool], maxTokens: 3000 });
    const raw = (res.toolCalls[0]?.input as { demands?: DemandProposal[] } | undefined)?.demands;
    const demands = Array.isArray(raw) && raw.length ? raw : seed;
    return { demands: demands.map(normalise), live: provider.live };
  } catch {
    return { demands: seed.map(normalise), live: false };
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
export async function createDemands(slug: string, proposals: DemandProposal[], now: string): Promise<CreatedDemand[]> {
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
      currentPain: p.basis ? `Befund der Prozessdiagnose „${m.title}": ${p.basis}` : `Aus der Prozessdiagnose „${m.title}".`,
      desiredOutcome: p.title.trim(),
      affectedProcess: m.title,
      plant: m.unit || "ALL",
      ...(p.domain ? { domain: p.domain } : {}),
      requester: m.owner || "",
    };
    const lane = p.lane ?? classifyDemand(answers).lane;
    const { id, result } = await saveNewDemand(year, (uid) => buildDemand({ id: uid, createdOn, lane }, answers));
    created.push({ id, title: p.title.trim(), host: result.host, path: result.path });
  }

  const demands = [...(m.demands ?? []), ...created.map((c) => ({ id: c.id, title: c.title, at: now }))];
  await store.writeMeta(slug, { demands }, now);
  return created;
}
