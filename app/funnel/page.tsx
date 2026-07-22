import Link from "next/link";
import { analyzeFunnel } from "@/lib/analysis/funnel";
import { SEED_ROWS } from "@/lib/seed";
import { Card } from "@/components/ui/card";
import { LaneBadge } from "@/components/portal/badges";

export const dynamic = "force-dynamic";

function Tile({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums" style={tone ? { color: `hsl(var(${tone}))` } : undefined}>{value}</div>
    </Card>
  );
}

export default function Funnel() {
  const f = analyzeFunnel(SEED_ROWS);

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Use-case funnel</span>
      </nav>
      <h1 className="text-lg font-semibold">Use-case funnel</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        How demand narrows S1→S8: how many use cases reached each stage, where they stop,
        stage-to-stage conversion, and kill rate by gate. A count of demands is not a portfolio —
        stage progression is.
      </p>

      {f.flags.map((flag) => (
        <div key={flag} className="mt-4 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/5 px-3 py-2 text-sm">
          <span className="text-warn" aria-hidden>⚠</span>
          <span>{flag}</span>
        </div>
      ))}

      {/* Headline funnel KPIs */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Entered" value={f.totalEntered} />
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Overall conversion</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-ok">{Math.round(f.overallConversion * 100)}%</div>
          <div className="mt-0.5 text-xs text-muted-foreground">S1 → S8</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Avg step conversion</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{Math.round(f.avgStepConversion * 100)}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Biggest drop-off</div>
          {f.biggestDrop ? (
            <>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-warn">−{Math.round(f.biggestDrop.pct * 100)}%</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{f.biggestDrop.from} → {f.biggestDrop.to} · {f.biggestDrop.lost} lost</div>
            </>
          ) : <div className="mt-1 text-2xl font-semibold text-muted-foreground">—</div>}
        </Card>
      </div>

      {/* BI-style funnel: centered narrowing shape + step conversion + drop-off */}
      <Card className="mt-6 p-4">
        <h2 className="mb-4 text-sm font-semibold">Conversion funnel</h2>
        <div className="mx-auto max-w-2xl">
          {f.stages.map((s, i) => {
            const isDrop = f.biggestDrop && f.biggestDrop.to === s.stage;
            return (
              <div key={s.stage}>
                <div className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">{s.stage} {s.label}</span>
                  {/* full width = top count; centered colored fill = this step */}
                  <div className="relative h-9 flex-1 overflow-hidden rounded bg-secondary/50">
                    <div
                      className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center justify-center text-xs font-semibold text-white"
                      style={{ width: `${Math.max(s.pctOfTop * 100, 5)}%`, background: `hsl(var(--stage-${s.stage.toLowerCase()}))` }}
                    >
                      {s.entered}
                    </div>
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{Math.round(s.pctOfTop * 100)}%</span>
                </div>
                {s.conversionToNext !== undefined && (
                  <div className="flex items-center gap-3">
                    <span className="w-24 shrink-0" />
                    <div className="flex-1 py-0.5 text-center">
                      <span className={`text-[11px] ${isDrop && f.stages[i + 1] ? "" : ""}`}>
                        <span className={f.biggestDrop && f.biggestDrop.from === s.stage ? "font-medium text-warn" : "text-muted-foreground"}>
                          ↓ {Math.round(s.conversionToNext * 100)}% step conversion
                          {s.entered - (f.stages[i + 1]?.entered ?? 0) > 0 && ` · −${s.entered - (f.stages[i + 1]?.entered ?? 0)} drop-off`}
                        </span>
                      </span>
                    </div>
                    <span className="w-16 shrink-0" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Per-step table (the analyst cut) */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-4 font-medium">Stage</th>
                <th className="py-2 pr-4 text-right font-medium">Reached</th>
                <th className="py-2 pr-4 text-right font-medium">% of entry</th>
                <th className="py-2 pr-4 text-right font-medium">Step conv.</th>
                <th className="py-2 pr-4 text-right font-medium">Drop-off</th>
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

      {/* Kill rate by gate */}
      <Card className="mt-4 p-4">
        <h2 className="mb-3 text-sm font-semibold">Kill rate by gate</h2>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {f.gateKills.map((g) => {
            const isG4 = g.gate === "G4";
            const pct = Math.round(g.rate * 100);
            return (
              <div key={g.gate} className={`rounded-lg border p-2 text-center ${isG4 ? "border-foreground/30" : ""}`}>
                <div className="text-xs font-medium">{g.gate}{isG4 && " ★"}</div>
                <div className={`mt-1 text-lg font-semibold tabular-nums ${isG4 && pct === 0 ? "text-warn" : ""}`}>{pct}%</div>
                <div className="text-[10px] text-muted-foreground">{g.killed}/{g.reached}</div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          G4 (POC proven/stop) is the health gate — a healthy funnel kills a non-zero share here.
        </p>
      </Card>

      {/* Lane balance */}
      <Card className="mt-4 p-4">
        <h2 className="mb-3 text-sm font-semibold">Lane balance</h2>
        <div className="space-y-1.5">
          {f.laneBalance.map((l) => (
            <div key={l.lane} className="flex items-center gap-3">
              <span className="w-40 shrink-0"><LaneBadge lane={l.lane} /></span>
              <div className="h-3 flex-1 rounded bg-secondary">
                <div className="h-3 rounded bg-info" style={{ width: `${(l.count / Math.max(...f.laneBalance.map((x) => x.count), 1)) * 100}%` }} />
              </div>
              <span className="w-8 text-right text-xs tabular-nums">{l.count}</span>
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
