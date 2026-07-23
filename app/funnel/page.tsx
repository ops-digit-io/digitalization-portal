import Link from "next/link";
import { analyzeFunnel } from "@/lib/analysis/funnel";
import { loadPortfolioRows } from "@/lib/portfolio";
import { Card } from "@/components/ui/card";
import { LaneBadge } from "@/components/portal/badges";
import { FilterBar } from "@/components/portal/filter-bar";
import type { Lane } from "@/lib/types";
import type { RegistryRow } from "@/lib/registry";

export const dynamic = "force-dynamic";

const LANE_LABEL: Record<string, string> = {
  run: "run", regulatory: "regulatory", continuous_improvement: "continuous improvement",
  transform: "transform", innovation: "innovation", data_ai: "data / AI", local: "local",
};

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums" style={tone ? { color: `hsl(var(${tone}))` } : undefined}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

export default async function Funnel({ searchParams }: { searchParams: { lane?: string; plant?: string } }) {
  // Live from the du-demands funnel when the GitHub App is configured, else demo seed.
  const { rows: allRows, now, live, source } = await loadPortfolioRows();
  const lanes = [...new Set(allRows.map((r) => r.lane).filter(Boolean))] as string[];
  const plants = [...new Set(allRows.map((r) => r.plant).filter(Boolean))] as string[];
  const rows: RegistryRow[] = allRows.filter(
    (r) => (!searchParams.lane || r.lane === searchParams.lane) && (!searchParams.plant || r.plant === searchParams.plant),
  );
  const f = analyzeFunnel(rows, { now });
  const maxLane = Math.max(...f.laneBalance.map((x) => x.count), 1);

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Use-case funnel</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Use-case funnel</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${live ? "bg-ok/10 text-ok" : "bg-secondary text-muted-foreground"}`}
              title={live ? `Read live from ${source}` : "Demo seed data — configure the GitHub App to read the live funnel"}
            >
              {live ? `● live · ${source}` : "○ demo data"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Demand narrowing S1→S8 — conversion, drop-off, dwell, and kill rate by gate. A count of demands is not a portfolio; stage progression is.</p>
        </div>
        <FilterBar
          path="/funnel"
          current={searchParams as Record<string, string | undefined>}
          selects={[
            { param: "lane", label: "Lane", options: lanes, labels: LANE_LABEL },
            { param: "plant", label: "Plant", options: plants },
          ]}
        />
      </div>

      {f.flags.map((flag) => (
        <div key={flag} className="mt-4 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/5 px-3 py-2 text-sm">
          <span className="text-warn" aria-hidden>⚠</span><span>{flag}</span>
        </div>
      ))}

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Entered" value={String(f.totalEntered)} />
        <Tile label="Overall conversion" value={`${Math.round(f.overallConversion * 100)}%`} sub="S1 → S8" tone="--ok" />
        <Tile label="Avg step conversion" value={`${Math.round(f.avgStepConversion * 100)}%`} />
        <Tile label="Biggest drop-off" value={f.biggestDrop ? `−${Math.round(f.biggestDrop.pct * 100)}%` : "—"} sub={f.biggestDrop ? `${f.biggestDrop.from} → ${f.biggestDrop.to} · ${f.biggestDrop.lost} lost` : undefined} tone="--warn" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr]">
        {/* Left: the conversion funnel */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Conversion funnel</h2>
          <div>
            {f.stages.map((s, i) => (
              <div key={s.stage}>
                <div className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-right text-xs text-muted-foreground">{s.stage} {s.label}</span>
                  <div className="relative h-9 flex-1 overflow-hidden rounded bg-secondary/50">
                    <div className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center justify-center text-xs font-semibold text-white" style={{ width: `${Math.max(s.pctOfTop * 100, 5)}%`, background: `hsl(var(--stage-${s.stage.toLowerCase()}))` }}>{s.entered}</div>
                  </div>
                  <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{Math.round(s.pctOfTop * 100)}%</span>
                </div>
                {s.conversionToNext !== undefined && (
                  <div className="flex items-center gap-3"><span className="w-28 shrink-0" /><div className="flex-1 py-0.5 text-center"><span className={`text-[11px] ${f.biggestDrop?.from === s.stage ? "font-medium text-warn" : "text-muted-foreground"}`}>↓ {Math.round(s.conversionToNext * 100)}% step conversion{s.entered - (f.stages[i + 1]?.entered ?? 0) > 0 && ` · −${s.entered - (f.stages[i + 1]?.entered ?? 0)} drop-off`}</span></div><span className="w-14 shrink-0" /></div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4 font-medium">Stage</th>
                  <th className="py-2 pr-4 text-right font-medium">Reached</th>
                  <th className="py-2 pr-4 text-right font-medium">% of entry</th>
                  <th className="py-2 pr-4 text-right font-medium">Step conv.</th>
                  <th className="py-2 pr-4 text-right font-medium">Drop-off</th>
                  <th className="py-2 pr-4 text-right font-medium">Avg dwell</th>
                  <th className="py-2 text-right font-medium">Stopped here</th>
                </tr>
              </thead>
              <tbody>
                {f.stages.map((s) => (
                  <tr key={s.stage} className="border-b last:border-0">
                    <td className="py-1.5 pr-4">{s.stage} {s.label}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{s.entered}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{Math.round(s.pctOfTop * 100)}%</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{s.stepConversion !== undefined ? `${Math.round(s.stepConversion * 100)}%` : "—"}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums text-muted-foreground">{s.dropFromPrev ? `−${s.dropFromPrev}` : "—"}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums text-muted-foreground">{s.dwellDays !== undefined ? `${s.dwellDays}d` : "—"}</td>
                    <td className="py-1.5 text-right text-xs text-muted-foreground">
                      {s.killed > 0 && <span className="text-destructive">{s.killed} killed </span>}
                      {s.parked > 0 && <span>{s.parked} parked </span>}
                      {s.killed === 0 && s.parked === 0 && "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right: gate kills + lane balance */}
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Kill rate by gate</h2>
            <div className="grid grid-cols-4 gap-2">
              {f.gateKills.map((g) => {
                const isG4 = g.gate === "G4";
                const pct = Math.round(g.rate * 100);
                return (
                  <div key={g.gate} className={`rounded-lg border p-2 text-center ${isG4 ? "border-foreground/30" : ""}`}>
                    <div className="text-xs font-medium">{g.gate}{isG4 && " ★"}</div>
                    <div className={`mt-1 text-base font-semibold tabular-nums ${isG4 && pct === 0 ? "text-warn" : ""}`}>{pct}%</div>
                    <div className="text-[10px] text-muted-foreground">{g.killed}/{g.reached}</div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">G4 (POC proven/stop) is the health gate — a healthy funnel kills a non-zero share here.</p>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Lane balance</h2>
            <div className="space-y-1.5">
              {f.laneBalance.map((l) => (
                <div key={l.lane} className="flex items-center gap-3">
                  <span className="w-36 shrink-0"><LaneBadge lane={l.lane as Lane} /></span>
                  <div className="h-3 flex-1 rounded bg-secondary"><div className="h-3 rounded bg-info" style={{ width: `${(l.count / maxLane) * 100}%` }} /></div>
                  <span className="w-6 text-right text-xs tabular-nums">{l.count}</span>
                </div>
              ))}
              {f.laneBalance.length === 0 && <p className="text-sm text-muted-foreground">No use cases match the filter.</p>}
            </div>
          </Card>

          <Card className="p-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><div className="text-xs uppercase text-muted-foreground">Active</div><div className="text-xl font-semibold text-info">{f.activeTotal}</div></div>
              <div><div className="text-xs uppercase text-muted-foreground">Killed</div><div className="text-xl font-semibold text-destructive">{f.killedTotal}</div></div>
              <div><div className="text-xs uppercase text-muted-foreground">Parked</div><div className="text-xl font-semibold text-muted-foreground">{f.parkedTotal}</div></div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
