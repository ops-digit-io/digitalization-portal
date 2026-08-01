/**
 * The Champions Analyst — an agentic reading of the hub-and-spoke network,
 * governed entirely from the library (`playbooks/champions-analysis.md`, its
 * skills, and `contracts/champions.md`).
 *
 * The shape mirrors the process funnel's analysis agent, for the same reason: a
 * DETERMINISTIC floor produces the actions that follow mechanically from the
 * coverage arithmetic, and the model — when a key is configured — refines and
 * extends them under the playbook. So the analysis always returns results. With
 * no key it returns fewer, duller, and completely honest ones; it never returns
 * nothing and calls that an answer.
 *
 * The facts handed to the model are computed here, not by it. Coverage is
 * arithmetic and is already right; the agent's value is in what it means and who
 * to ask. The contract forbids it from contradicting the numbers.
 */

import { getProvider, type ToolSpec } from "./agent/provider.js";
import { composeSystemPrompt, governedBy, resolveGovernance } from "./agent/compose.js";
import {
  buildCoverage, buildLoads, findCandidates, isActive,
  type Champion, type ChampionLoad, type CoverageReport, type EngagementRef,
} from "./champions.js";

export const CHAMPIONS_PLAYBOOK = "champions-analysis";
export const CHAMPIONS_CONTRACT = "champions";

/** One thing somebody can do this week. An action with no target is an observation. */
export interface NetworkAction {
  /** What is wrong, one sentence, with its basis named. */
  finding: string;
  /** Who to approach — a person the portal can see, or the role that must nominate. */
  approach: string;
  /** The specific commitment to ask for. */
  ask: string;
  /** What is blocked until it happens; "" when nothing is blocked yet. */
  blocked: string;
  /** Which records this rests on — plant/domain cells, engagement slugs, ids. */
  basis: string;
  kind: "uncovered" | "no-decider" | "single-point" | "capacity" | "hub-carrying" | "register-thin";
}

export interface ChampionsAnalysis {
  actions: NetworkAction[];
  /** True when a live model refined the deterministic floor. */
  live: boolean;
  /** What governed the run — playbook, skills, contract, and any missing pieces. */
  governance: ReturnType<typeof governedBy>;
  /** The arithmetic the actions rest on, echoed so a reader can check them. */
  coverage: CoverageReport;
  loads: ChampionLoad[];
  generatedAt: string;
}

export interface AnalysisInput {
  champions: Champion[];
  plants: string[];
  domains: string[];
  engagements: EngagementRef[];
  demandRequesters: string[];
}

const norm = (s: string): string => s.trim().toLowerCase();

// ── the deterministic floor ───────────────────────────────────────────────────

/**
 * The actions that follow mechanically from the coverage map. These are the ones
 * nobody should need a model to produce — and precisely because they are
 * mechanical, they are also the ones a model must not get wrong, so they are
 * computed rather than asked for.
 *
 * Ordered by how completely work is stopped: a plant where nothing can be raised
 * outranks a domain missing a second name.
 */
export function deterministicActions(input: AnalysisInput, on: string): NetworkAction[] {
  const { champions, plants, domains, engagements } = input;
  const coverage = buildCoverage(champions, plants, domains, on);
  const active = champions.filter((c) => isActive(c, on));
  const candidates = findCandidates(champions, engagements, input.demandRequesters);
  const out: NetworkAction[] = [];

  // 0. A thin register is a finding about the REGISTER. Say so before anything else,
  //    or three facts get dressed up as an assessment of the organisation.
  if (active.length === 0) {
    out.push({
      kind: "register-thin",
      finding:
        plants.length === 0
          ? "No plants are configured, so coverage cannot be computed at all."
          : `Nobody is registered, so all ${coverage.cells.length} plant × domain cells read as uncovered. This describes the register, not the organisation.`,
      approach: candidates.length
        ? `Start with the people the portal can already see doing the work: ${candidates.slice(0, 5).map((c) => c.name).join(", ")}.`
        : "The Digital Unit — nobody in the portal is visibly carrying local work yet.",
      ask: "Confirm who already acts as spoke or champion in each area and record them.",
      blocked: "Every coverage reading below, until the register reflects reality.",
      basis: `register: 0 active · candidates: ${candidates.length}`,
    });
  }

  // 1. Uncovered plants — nothing can be raised there at all.
  const byPlant = new Map<string, string[]>();
  for (const g of coverage.gaps) byPlant.set(g.plant, [...(byPlant.get(g.plant) ?? []), g.domain]);
  for (const [plant, missing] of byPlant) {
    const whole = missing.length === domains.length;
    if (!whole && active.length === 0) continue; // already covered by the thin-register action
    out.push({
      kind: "uncovered",
      finding: whole
        ? `${plant} has nobody in any domain — nothing can be raised there, so its silence elsewhere in the portal is an artefact of this register, not a sign that all is well.`
        : `${plant} has nobody for ${missing.join(", ")}.`,
      approach: `The ${plant} site lead.`,
      ask: whole
        ? `Nominate at least one spoke for ${plant} who can decide a process change.`
        : `Name someone for ${missing.join(", ")} at ${plant}.`,
      blocked: "Intake from this area.",
      basis: `coverage: ${plant} × ${missing.join(", ")}`,
    });
  }

  // 2. Can carry, cannot decide. Where an engagement is already running, this is a
  //    stall with a date on it rather than a theoretical gap.
  const spokelessPlants = [...new Set(coverage.spokeless.map((c) => c.plant))];
  for (const plant of spokelessPlants) {
    const cells = coverage.spokeless.filter((c) => c.plant === plant);
    out.push({
      kind: "no-decider",
      finding: `${plant} has someone to carry the work (${cells[0]!.covered.length} registered) but no spoke, so nothing there can be approved.`,
      approach: `The registered champion(s) at ${plant}.`,
      ask: "Name the person in the business who can decide a change, and record them as spoke.",
      blocked: "Any gate that needs an owner's decision.",
      basis: `coverage: ${plant} × ${cells.map((c) => c.domain).join(", ")}`,
    });
  }

  // 3. Single points — a structural risk that belongs to the hub, not a criticism.
  for (const c of active) {
    const covered = coverage.cells.filter((cell) => cell.covered.includes(c.id));
    const soleCells = covered.filter((cell) => cell.covered.length === 1);
    if (soleCells.length >= 2 && soleCells.length === covered.length) {
      out.push({
        kind: "single-point",
        finding: `${c.name} is the only cover for ${soleCells.length} cell(s); those go dark if they step back.`,
        approach: `${c.name}${c.email ? ` (${c.email})` : ""}.`,
        ask: "Agree a second name for the same area, even a partial one.",
        blocked: "",
        basis: `coverage: ${soleCells.map((x) => `${x.plant}/${x.domain}`).join(", ")}`,
      });
    }
  }

  // 4. Capacity conflicts — stated capacity against counted load. The most
  //    actionable line on the page: a commitment the hub made and has not honoured.
  const loads = buildLoads(active, engagements, input.demandRequesters);
  for (const l of loads) {
    const c = active.find((x) => x.id === l.championId)!;
    const carrying = l.engagementsOwned + l.engagementsChampioned;
    if (carrying >= 2 && c.capacity.trim() !== "") {
      out.push({
        kind: "capacity",
        finding: `${c.name} states "${c.capacity}" and is carrying ${carrying} engagement(s): ${l.carrying.join(", ")}.`,
        approach: `${c.name}${c.email ? ` (${c.email})` : ""}.`,
        ask: "Decide together what to hand over, or agree the next engagement in this area waits.",
        blocked: "",
        basis: `load: ${c.id} · engagements ${carrying}`,
      });
    }
  }

  // 5. The hub doing local work — the operating model failing in miniature.
  for (const c of active.filter((x) => x.role === "hub")) {
    const keys = [norm(c.email), norm(c.name)].filter((k) => k !== "");
    const local = engagements.filter((e) => keys.includes(norm(e.owner)) || keys.includes(norm(e.champion)));
    if (local.length > 0) {
      out.push({
        kind: "hub-carrying",
        finding: `${c.name} is a hub role but is named on ${local.length} engagement(s): ${local.map((e) => e.title).join(", ")}. The centre is doing what the network was meant to do.`,
        approach: `${c.name}${c.email ? ` (${c.email})` : ""}.`,
        ask: "Identify a local spoke or champion to hand each of these to.",
        blocked: "",
        basis: `engagements: ${local.map((e) => e.slug).join(", ")}`,
      });
    }
  }

  return out;
}

// ── the agent ─────────────────────────────────────────────────────────────────

const proposeTool: ToolSpec = {
  name: "propose_network_actions",
  description:
    "Return the actions that close the network's holes. Each action is addressed to somebody and names the records it rests on.",
  input_schema: {
    type: "object",
    properties: {
      actions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["uncovered", "no-decider", "single-point", "capacity", "hub-carrying", "register-thin"] },
            finding: { type: "string", description: "What is wrong, one sentence, with the basis named." },
            approach: { type: "string", description: "Who to approach — a person the portal can see, or the role that must nominate." },
            ask: { type: "string", description: "The specific commitment to ask for." },
            blocked: { type: "string", description: "What is blocked until it happens; empty when nothing is." },
            basis: { type: "string", description: "The records this rests on: cells, engagement slugs, ids." },
          },
          required: ["kind", "finding", "approach", "ask", "basis"],
        },
      },
    },
    required: ["actions"],
  },
};

/** The facts block. Computed here so the model interprets rather than calculates. */
export function buildFacts(input: AnalysisInput, on: string): string {
  const coverage = buildCoverage(input.champions, input.plants, input.domains, on);
  const active = input.champions.filter((c) => isActive(c, on));
  const loads = buildLoads(active, input.engagements, input.demandRequesters);
  const candidates = findCandidates(input.champions, input.engagements, input.demandRequesters);

  const lines = [
    `## Register (${active.length} active of ${input.champions.length})`,
    ...(active.length
      ? active.map((c) => {
          const l = loads.find((x) => x.championId === c.id);
          return `- ${c.id} ${c.name} · ${c.role} · plants: ${c.plants.join(", ") || "all"} · domains: ${c.domains.join(", ") || "all"} · stated capacity: ${c.capacity || "not recorded"} · owns ${l?.engagementsOwned ?? 0}, champions ${l?.engagementsChampioned ?? 0}, raised ${l?.demandsRaised ?? 0}`;
        })
      : ["- (nobody registered)"]),
    "",
    `## Coverage (${coverage.cells.length - coverage.gaps.length}/${coverage.cells.length} cells covered, ${coverage.plantsCovered}/${coverage.plantsTotal} plants)`,
    `- uncovered cells: ${coverage.gaps.map((g) => `${g.plant}/${g.domain}`).join(", ") || "none"}`,
    `- covered but no spoke: ${coverage.spokeless.map((g) => `${g.plant}/${g.domain}`).join(", ") || "none"}`,
    "",
    `## Engagements in flight (${input.engagements.length})`,
    ...(input.engagements.length
      ? input.engagements.map((e) => `- ${e.slug} "${e.title}" · owner: ${e.owner || "not recorded"} · champion: ${e.champion || "not recorded"}`)
      : ["- (none)"]),
    "",
    `## Doing the work but not registered (${candidates.length})`,
    ...(candidates.length ? candidates.map((c) => `- ${c.name} — seen as ${c.seenAs.join(", ")}`) : ["- (none)"]),
  ];
  return lines.join("\n");
}

/**
 * Run the analysis. Always returns actions: the deterministic floor is computed
 * first and handed to the model as a starting point, so a model failure, a missing
 * key, or governance that will not load degrades to fewer and duller actions rather
 * than to an empty page.
 */
export async function analyseNetwork(input: AnalysisInput, now: string): Promise<ChampionsAnalysis> {
  const on = now.slice(0, 10);
  const floor = deterministicActions(input, on);
  const coverage = buildCoverage(input.champions, input.plants, input.domains, on);
  const loads = buildLoads(input.champions.filter((c) => isActive(c, on)), input.engagements, input.demandRequesters);

  const g = await resolveGovernance(CHAMPIONS_PLAYBOOK, { contract: CHAMPIONS_CONTRACT });
  const base: ChampionsAnalysis = {
    actions: floor,
    live: false,
    governance: governedBy(g),
    coverage,
    loads,
    generatedAt: now,
  };

  const provider = getProvider();
  if (!provider.live) return base;

  const system = composeSystemPrompt(
    "You are the Champions Analyst inside the Digitalization Portal. You read the hub-and-spoke register against the work the portal is carrying and return actions that close the network's holes.",
    g,
  );
  const user = [
    "Here is everything the portal knows about the network. Read it and call propose_network_actions.",
    "The deterministic floor below is already correct — keep what holds, sharpen the wording, add what only a reader of the engagements would notice, and drop nothing that names a real hole.",
    "",
    buildFacts(input, on),
    "",
    "```facts",
    JSON.stringify({ actions: floor }),
    "```",
  ].join("\n");

  try {
    // This call has exactly one acceptable shape of answer, so the tool is
    // forced: a prose reply here would cost a full call and yield no actions.
    const res = await provider.complete({
      system,
      messages: [{ role: "user", content: user }],
      tools: [proposeTool],
      toolChoice: { type: "tool", name: proposeTool.name },
      maxTokens: 3000,
    });
    const raw = (res.toolCalls[0]?.input as { actions?: NetworkAction[] } | undefined)?.actions;
    const actions = Array.isArray(raw) ? raw.filter((a) => a && String(a.finding ?? "").trim() !== "") : [];
    // An empty or unusable tool call must not blank the page: the floor stands.
    if (actions.length === 0) return base;
    return { ...base, actions: actions.map(normaliseAction), live: true };
  } catch {
    return base;
  }
}

/** Keep the shape honest whatever the model returned. */
function normaliseAction(a: NetworkAction): NetworkAction {
  const s = (v: unknown): string => String(v ?? "").trim();
  const kinds: NetworkAction["kind"][] = ["uncovered", "no-decider", "single-point", "capacity", "hub-carrying", "register-thin"];
  return {
    kind: kinds.includes(a.kind) ? a.kind : "uncovered",
    finding: s(a.finding),
    approach: s(a.approach),
    ask: s(a.ask),
    blocked: s(a.blocked),
    basis: s(a.basis),
  };
}
