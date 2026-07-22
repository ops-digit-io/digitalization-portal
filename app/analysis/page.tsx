import Link from "next/link";
import { analyzePortfolio, HORIZON_WEEKS, type Horizon } from "@/lib/analysis/portfolio";
import { SEED_ROWS } from "@/lib/seed";
import { Card } from "@/components/ui/card";

const EUR = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const TEAM_SIZE = 3; // demo assumption: three parallel workstreams

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

export default function AnalysisPage({ searchParams }: { searchParams: { horizon?: string } }) {
  const horizon: Horizon = searchParams.horizon === "year" ? "year" : "quarter";
  const horizonWeeks = HORIZON_WEEKS[horizon];
  const capacity = TEAM_SIZE * horizonWeeks;
  const a = analyzePortfolio(SEED_ROWS, {
    horizon,
    parallelism: TEAM_SIZE,
    capacityPersonWeeks: capacity,
  });

  const maxWorkload = Math.max(...a.timeline.map((t) => t.workloadPersonWeeks), 1);
  const maxValue = Math.max(...a.timeline.map((t) => t.valueRunRate), 1);

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold">Implementation analysis</h1>
          <p className="text-sm text-muted-foreground">
            Workload vs. business value across {a.totals.count} active use cases, next {horizon}.
          </p>
        </div>
        <div className="ml-auto inline-flex rounded-md border p-0.5 text-sm">
          {(["quarter", "year"] as const).map((h) => (
            <Link
              key={h}
              href={`/analysis?horizon=${h}`}
              className={`rounded px-3 py-1 ${h === horizon ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {h === "quarter" ? "Quarter" : "Year"}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Workload" value={`${a.totals.totalEffortWeeks} pw`} sub="person-weeks remaining" />
        <Tile label="Value landing" value={EUR(a.totals.totalHorizonValue)} sub={`within the ${horizon}`} />
        <Tile label="Goes live" value={`${a.totals.landingCount}/${a.totals.count}`} sub="use cases in horizon" />
        <Tile
          label="Capacity"
          value={a.capacity?.feasible ? "Fits" : "Over"}
          sub={`${Math.round((a.capacity?.utilization ?? 0) * 100)}% of ${capacity} pw (${TEAM_SIZE} ppl)`}
        />
      </div>

      {a.capacity && !a.capacity.feasible && (
        <div className="mt-3 rounded-lg border border-warn/40 bg-warn/5 px-3 py-2 text-sm">
          <span className="text-warn" aria-hidden>⚠</span> Over capacity by{" "}
          {a.capacity.overCommitmentWeeks} person-weeks — sequence or drop the lowest value-per-effort items.
        </div>
      )}

      {/* Workload vs value over time */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Workload over the {horizon}</h2>
          <div className="space-y-2">
            {a.timeline.map((t) => (
              <div key={t.label} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">{t.label}</span>
                <div className="h-4 flex-1 rounded bg-secondary">
                  <div
                    className="h-4 rounded bg-info"
                    style={{ width: `${(t.workloadPersonWeeks / maxWorkload) * 100}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-xs tabular-nums">{t.workloadPersonWeeks} pw</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Value run-rate live by period</h2>
          <div className="space-y-2">
            {a.timeline.map((t) => (
              <div key={t.label} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">{t.label}</span>
                <div className="h-4 flex-1 rounded bg-secondary">
                  <div
                    className="h-4 rounded bg-ok"
                    style={{ width: `${(t.valueRunRate / maxValue) * 100}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-xs tabular-nums">{EUR(t.valueRunRate)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Ranked by value per effort */}
      <Card className="mt-6 overflow-hidden">
        <div className="border-b px-4 py-3 text-sm font-semibold">Ranked by value per effort</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b">
                <th className="px-4 py-2 font-medium">Use case</th>
                <th className="px-4 py-2 font-medium">Stage</th>
                <th className="px-4 py-2 text-right font-medium">Effort</th>
                <th className="px-4 py-2 text-right font-medium">Go-live</th>
                <th className="px-4 py-2 text-right font-medium">Value in {horizon}</th>
                <th className="px-4 py-2 text-right font-medium">€ / pw</th>
              </tr>
            </thead>
            <tbody>
              {a.ranked.map((it) => (
                <tr key={it.id} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <Link href={`/uc/${it.id}`} className="hover:underline">
                      <span className="text-muted-foreground">{it.id}</span> {it.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{it.stage ?? "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{it.effortWeeks} pw</td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                    {it.goLiveWeeks === 0 ? "live" : `wk ${it.goLiveWeeks}`}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {it.horizonValue > 0 ? EUR(it.horizonValue) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">
                    {it.valuePerEffort > 0 ? EUR(it.valuePerEffort) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Effort and value are risk-discounted estimates (basis: stage, level, heat, confidence — see{" "}
        <code>lib/analysis/estimate.ts</code>). Figures are indicative planning inputs, not committed value.
      </p>
    </main>
  );
}
