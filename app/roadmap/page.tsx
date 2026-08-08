import Link from "next/link";
import { loadPortfolioRows } from "@/lib/portfolio";
import { getSession } from "@/lib/auth/current";
import { assembleBoard } from "@/lib/board";
import { GateTimeline, type GateNode } from "@/components/portal/gate-timeline";
import { Card } from "@/components/ui/card";
import { STAGES, GATES, type Stage } from "@/lib/types";

export const dynamic = "force-dynamic";

const STAGE_LABEL: Record<Stage, string> = {
  S1: "Demand", S2: "Shaping", S3: "Assess", S4: "POC", S5: "Pilot", S6: "Scale", S7: "Rollout", S8: "Steady ops",
};
const GATE_LABEL: Record<string, string> = {
  G1: "Intake accepted", G2: "Prioritized", G3: "Business case", G4: "POC proven/stop",
  G5: "Pilot proven", G6: "Scale readiness", G7: "Rollout complete",
};

/**
 * Derive the gate ladder from a case's stage — the roadmap shows lifecycle
 * position, and stage is its source of truth. A case in Sn has passed G1..G(n-1)
 * and is working toward Gn (its exit gate); S8 has passed them all.
 */
function gatesForStage(stage: Stage): GateNode[] {
  const n = STAGES.indexOf(stage) + 1; // S1 → 1
  return GATES.map((g, i) => {
    const idx = i + 1;
    const state = idx < n ? "passed" : idx === n && n <= 7 ? "open" : "pending";
    return { id: g, label: GATE_LABEL[g] ?? g, state };
  });
}

/**
 * Roadmap — the portfolio against the gate ladder, grouped by stage as milestones.
 * Reuses the funnel read model and the GateTimeline element from the use-case page.
 */
export default async function RoadmapPage() {
  const session = await getSession();
  const { rows, now, live, source } = await loadPortfolioRows();
  const board = assembleBoard(rows, session, now, {});
  const active = board.cards.filter((c) => (c.status ?? "active") === "active" && c.stage);

  const byStage = STAGES.map((s) => ({
    stage: s,
    label: STAGE_LABEL[s],
    cards: active.filter((c) => c.stage === s),
  })).filter((g) => g.cards.length > 0);

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Roadmap</span>
      </nav>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">Roadmap</h1>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${live ? "bg-ok/10 text-ok" : "bg-secondary text-muted-foreground"}`}
          title={live ? `Read live from ${source}` : `Read from the ${source}`}
        >
          {live ? `● live · ${source}` : `○ ${source}`}
        </span>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Every active use case against the seven-gate ladder, grouped by stage. Milestones are stages; each case shows how far it has moved and the gate it is working toward.
      </p>

      {byStage.length === 0 ? (
        <Card className="mt-6 p-10 text-center text-sm text-muted-foreground">
          No active use cases on the roadmap yet.
        </Card>
      ) : (
        <div className="mt-6 space-y-6">
          {byStage.map((g) => (
            <section key={g.stage}>
              <h2 className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
                <span className="tabular-nums">{g.stage}</span>
                <span>{g.label}</span>
                <span className="text-xs font-normal text-muted-foreground">({g.cards.length})</span>
              </h2>
              <Card className="divide-y p-0">
                {g.cards.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <Link href={`/uc/${c.id}`} className="text-sm font-medium hover:underline">{c.title}</Link>
                      <div className="font-mono text-xs text-muted-foreground">{c.id}</div>
                    </div>
                    <GateTimeline gates={gatesForStage(c.stage as Stage)} />
                  </div>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
