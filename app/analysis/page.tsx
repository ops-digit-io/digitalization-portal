import Link from "next/link";
import { analyzePortfolio, HORIZON_WEEKS, type Horizon } from "@/lib/analysis/portfolio";
import { loadPortfolioRows } from "@/lib/portfolio";
import { Card } from "@/components/ui/card";
import { getT, type TFn } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const EUR = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const TEAM_MIN = 1;
const TEAM_MAX = 8;
const DEFAULT_TEAM = 3;
const TEAM_CHOICES = [2, 3, 4, 5, 6];

const laneLabel = (k: string, t: TFn) =>
  k === "—" ? t("analysis.unassigned", "Unassigned") : k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

export default async function AnalysisPage({ searchParams }: { searchParams: { horizon?: string; team?: string } }) {
  const t = getT();
  const horizon: Horizon = searchParams.horizon === "year" ? "year" : "quarter";
  const horizonWeeks = HORIZON_WEEKS[horizon];
  const team = Math.min(TEAM_MAX, Math.max(TEAM_MIN, Math.round(Number(searchParams.team)) || DEFAULT_TEAM));
  const capacity = team * horizonWeeks;
  const qs = (o: { horizon?: Horizon; team?: number }) =>
    `/analysis?horizon=${o.horizon ?? horizon}&team=${o.team ?? team}`;

  // Real funnel — active demands only. No seed; a thin funnel analyses thin.
  const { rows } = await loadPortfolioRows();
  const active = rows.filter((r) => r.status !== "killed" && r.status !== "parked");
  const a = analyzePortfolio(active, { horizon, parallelism: team, capacityPersonWeeks: capacity });

  const maxWorkload = Math.max(...a.timeline.map((t) => t.workloadPersonWeeks), 1);
  const maxValue = Math.max(...a.timeline.map((t) => t.valueRunRate), 1);
  const plan = a.plan;
  const deferredSet = new Set(plan?.deferred ?? []);

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("analysis.title", "Implementation analysis")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("analysis.workloadAcross", "Workload vs. business value across")} {a.totals.count} {t("analysis.activeUseCasesNext", "active use cases, next")} {horizon}.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Team size — the planning lever that drives schedule and capacity. */}
          <div className="inline-flex items-center gap-1 rounded-md border p-0.5 text-sm">
            <span className="px-2 text-xs text-muted-foreground">{t("analysis.team", "Team")}</span>
            {TEAM_CHOICES.map((n) => (
              <Link
                key={n}
                href={qs({ team: n })}
                className={`rounded px-2 py-1 tabular-nums ${n === team ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {n}
              </Link>
            ))}
          </div>
          <div className="inline-flex rounded-md border p-0.5 text-sm">
            {(["quarter", "year"] as const).map((h) => (
              <Link
                key={h}
                href={qs({ horizon: h })}
                className={`rounded px-3 py-1 ${h === horizon ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {h === "quarter" ? t("analysis.quarter", "Quarter") : t("analysis.year", "Year")}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label={t("analysis.tile.workload", "Workload")} value={`${a.totals.totalEffortWeeks} pw`} sub={t("analysis.personWeeksRemaining", "person-weeks remaining")} />
        <Tile label={t("analysis.tile.valueLanding", "Value landing")} value={EUR(a.totals.totalHorizonValue)} sub={`${t("analysis.withinThe", "within the")} ${horizon}`} />
        <Tile label={t("analysis.tile.goesLive", "Goes live")} value={`${a.totals.landingCount}/${a.totals.count}`} sub={t("analysis.useCasesInHorizon", "use cases in horizon")} />
        <Tile
          label={t("analysis.tile.capacity", "Capacity")}
          value={a.capacity?.feasible ? t("analysis.fits", "Fits") : t("analysis.over", "Over")}
          sub={`${Math.round((a.capacity?.utilization ?? 0) * 100)}% ${t("analysis.of", "of")} ${capacity} pw (${team} ppl)`}
        />
      </div>

      {/* Concrete plan: what to keep and what to defer to fit capacity. */}
      {plan && !plan.feasible && (
        <Card className="mt-3 border-warn/40 bg-warn/5 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">
              <span className="text-warn" aria-hidden>⚠</span> {t("analysis.overCapacityBy", "Over capacity by")} {a.capacity?.overCommitmentWeeks} pw — {t("analysis.recommendedPlan", "recommended plan")}
            </h2>
            <span className="text-xs text-muted-foreground">
              {t("analysis.greedyByValue", "greedy by value per effort")} · {team} {t("analysis.peopleOverThe", "people over the")} {horizon}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("analysis.keep", "Keep")}</div>
              <div className="mt-0.5 text-lg font-semibold tabular-nums">{plan.inPlan.length} {t("analysis.useCasesUnit", "use cases")}</div>
              <div className="text-xs text-ok">{EUR(plan.valueCaptured)} {t("analysis.captured", "captured")} · {plan.effortUsed} pw</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("analysis.defer", "Defer")}</div>
              <div className="mt-0.5 text-lg font-semibold tabular-nums">{plan.deferred.length} {t("analysis.useCasesUnit", "use cases")}</div>
              <div className="text-xs text-muted-foreground">{EUR(plan.valueDeferred)} {t("analysis.notLandingThis", "not landing this")} {horizon}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("analysis.or", "Or")}</div>
              <div className="mt-0.5 text-sm">
                {t("analysis.growTheTeam", "Grow the team:")} {" "}
                <Link href={qs({ team: Math.min(TEAM_MAX, team + 1) })} className="font-medium underline">{t("analysis.try", "try")} {Math.min(TEAM_MAX, team + 1)} {t("analysis.people", "people")}</Link>
                {" "}{t("analysis.toSeeIfItFits", "to see if it fits.")}
              </div>
            </div>
          </div>
          {plan.deferred.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("analysis.deferredLabel", "Deferred:")} {plan.deferred.join(", ")}. {t("analysis.deferredExplain", "These are the lowest value-per-effort items; deferring them costs the least landed value.")}
            </p>
          )}
        </Card>
      )}
      {plan && plan.feasible && a.totals.count > 0 && (
        <div className="mt-3 rounded-lg border border-ok/40 bg-ok/5 px-3 py-2 text-sm">
          <span className="text-ok" aria-hidden>✓</span> {t("analysis.wholePortfolioFits", "The whole active portfolio fits")} {team} {t("analysis.peopleOverThe", "people over the")} {horizon} ({a.totals.totalEffortWeeks} {t("analysis.of", "of")} {capacity} pw).
        </div>
      )}

      {/* Workload vs value over time */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">{t("analysis.workloadOverThe", "Workload over the")} {horizon}</h2>
          <div className="space-y-2">
            {a.timeline.map((t) => (
              <div key={t.label} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">{t.label}</span>
                <div className="h-4 flex-1 rounded bg-secondary">
                  <div className="h-4 rounded bg-info" style={{ width: `${(t.workloadPersonWeeks / maxWorkload) * 100}%` }} />
                </div>
                <span className="w-14 shrink-0 text-right text-xs tabular-nums">{t.workloadPersonWeeks} pw</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">{t("analysis.valueRunRate", "Value run-rate live by period")}</h2>
          <div className="space-y-2">
            {a.timeline.map((t) => (
              <div key={t.label} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">{t.label}</span>
                <div className="h-4 flex-1 rounded bg-secondary">
                  <div className="h-4 rounded bg-ok" style={{ width: `${(t.valueRunRate / maxValue) * 100}%` }} />
                </div>
                <span className="w-20 shrink-0 text-right text-xs tabular-nums">{EUR(t.valueRunRate)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Where the workload and value sit */}
      {a.totals.count > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Breakdown title={t("analysis.byLane", "By lane")} rows={a.byLane.map((g) => ({ ...g, label: laneLabel(g.key, t) }))} t={t} />
          <Breakdown title={t("analysis.byStage", "By stage")} rows={a.byStage.map((g) => ({ ...g, label: g.key }))} t={t} />
        </div>
      )}

      {/* Ranked by value per effort, with the keep/defer decision */}
      <Card className="mt-6 overflow-hidden">
        <div className="border-b px-4 py-3 text-sm font-semibold">{t("analysis.rankedByValue", "Ranked by value per effort")}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b">
                {plan && <th className="px-4 py-2 font-medium">{t("analysis.col.plan", "Plan")}</th>}
                <th className="px-4 py-2 font-medium">{t("uc.useCase", "Use case")}</th>
                <th className="px-4 py-2 font-medium">{t("uc.stage", "Stage")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("analysis.col.effort", "Effort")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("analysis.col.goLive", "Go-live")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("analysis.col.valueIn", "Value in")} {horizon}</th>
                <th className="px-4 py-2 text-right font-medium">€ / pw</th>
              </tr>
            </thead>
            <tbody>
              {a.ranked.length === 0 && (
                <tr><td colSpan={plan ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground">{t("analysis.emptyRanked", "No active demands in the funnel yet.")} <Link href="/intake" className="underline">{t("analysis.captureOne", "Capture one")}</Link> {t("analysis.toSeeAnalysed", "to see it analysed.")}</td></tr>
              )}
              {a.ranked.map((it) => {
                const deferred = deferredSet.has(it.id);
                return (
                  <tr key={it.id} className={`border-b last:border-0 ${deferred ? "opacity-55" : ""}`}>
                    {plan && (
                      <td className="px-4 py-2">
                        {deferred ? (
                          <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[10px] font-medium text-warn">{t("analysis.deferBadge", "defer")}</span>
                        ) : (
                          <span className="rounded-full border border-ok/40 bg-ok/10 px-2 py-0.5 text-[10px] font-medium text-ok">{t("analysis.keepBadge", "keep")}</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2">
                      <Link href={`/uc/${it.id}`} className="hover:underline">
                        <span className="text-muted-foreground">{it.id}</span> {it.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{it.stage ?? "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{it.effortWeeks} pw</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {it.goLiveWeeks === 0 ? t("analysis.live", "live") : `${t("analysis.wk", "wk")} ${it.goLiveWeeks}`}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {it.horizonValue > 0 ? EUR(it.horizonValue) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      {it.valuePerEffort > 0 ? EUR(it.valuePerEffort) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        {t("analysis.footer1", "Effort and value are risk-discounted estimates (basis: stage, level, heat, confidence — see")}{" "}
        <code>lib/analysis/estimate.ts</code>{t("analysis.footer2", "). The plan is a greedy value-per-effort selection within capacity — a transparent heuristic, not a solver. Figures are indicative planning inputs, not committed value.")}
      </p>
    </main>
  );
}

function Breakdown({ title, rows, t }: { title: string; rows: { key: string; label: string; count: number; effortWeeks: number; horizonValue: number }[]; t: TFn }) {
  const maxEffort = Math.max(1, ...rows.map((r) => r.effortWeeks));
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("analysis.nothingToGroup", "Nothing to group yet.")}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-xs" title={r.label}>{r.label}</span>
              <div className="h-4 flex-1 rounded bg-secondary">
                <div className="h-4 rounded bg-violet-500/70" style={{ width: `${(r.effortWeeks / maxEffort) * 100}%` }} />
              </div>
              <span className="w-14 shrink-0 text-right text-xs tabular-nums">{r.effortWeeks} pw</span>
              <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{EUR(r.horizonValue)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
