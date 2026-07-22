import { LAUNCHPAD, type TileKpi } from "@/lib/launchpad";
import { LaunchTile } from "@/components/portal/tile";
import { assembleBoard } from "@/lib/board";
import { analyzePortfolio } from "@/lib/analysis/portfolio";
import { SEED_ROWS, SEED_BUSINESS_CASE, DEMO_SESSION, DEMO_NOW } from "@/lib/seed";

const EUR0 = (n: number) =>
  new Intl.NumberFormat("de-DE", { notation: "compact", style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function computeKpis(): Record<string, TileKpi> {
  const board = assembleBoard(SEED_ROWS, DEMO_SESSION, DEMO_NOW);
  const active = Object.values(board.columns).flat().length;
  const q = analyzePortfolio(SEED_ROWS, { horizon: "quarter", parallelism: 3 });
  const y = analyzePortfolio(SEED_ROWS, { horizon: "year", parallelism: 3 });
  const realized = SEED_ROWS.reduce((s, r) => s + (r.valueRealized ?? 0), 0);
  const simCandidates = Object.keys(SEED_BUSINESS_CASE).length;

  return {
    board: { value: String(active), label: "active" },
    attention: { value: String(board.needsAttention.length), label: "to review", tone: "warn" },
    analysis: { value: `${q.totals.totalEffortWeeks}`, label: "pw / quarter" },
    value: { value: EUR0(y.totals.totalHorizonValue), label: "lands / year" },
    simulate: { value: String(simCandidates), label: "cases" },
    review: { value: EUR0(realized), label: "realized" },
    poc: { value: String(SEED_ROWS.length), label: "buildable" },
    handovers: { value: "0", label: "open" },
  };
}

export default function Launchpad() {
  const kpis = computeKpis();

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Digital Unit Portal</h1>
        <p className="text-sm text-muted-foreground">
          Your front door to change demand — capture, analyse, decide, and build. Pick a tool.
        </p>
      </div>

      <div className="space-y-8">
        {LAUNCHPAD.map((group) => (
          <section key={group.category}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.category}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {group.tiles.map((tile) => (
                <LaunchTile key={tile.id} tile={tile} kpi={kpis[tile.id]} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
