import Link from "next/link";
import { loadPortfolioRows } from "@/lib/portfolio";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getT } from "@/lib/i18n-server";
import type { RegistryRow } from "@/lib/registry";

export const dynamic = "force-dynamic";

const EUR = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

/** Bucket portfolio value by confidence layer (docs/07-value-model.md §7.9). */
function layers(rows: readonly RegistryRow[]) {
  const inStage = (r: RegistryRow, s: string[]) => (r.stage ? s.includes(r.stage) : false);
  const pipeline = rows.filter((r) => inStage(r, ["S3", "S4"])).reduce((a, r) => a + (r.valueProjected ?? 0), 0);
  const committed = rows.filter((r) => inStage(r, ["S5", "S6", "S7"])).reduce((a, r) => a + (r.valueProjected ?? 0), 0);
  const realized = rows.filter((r) => inStage(r, ["S8"])).reduce((a, r) => a + (r.valueRealized ?? 0), 0);
  return { pipeline, committed, realized };
}

export default async function ValueCockpit() {
  const t = getT();
  // Real funnel; value comes from actual business-case.md artifacts, not seed.
  const { rows } = await loadPortfolioRows();
  const l = layers(rows);
  const portfolio = l.committed + l.realized; // headline = committed + realized ONLY
  const s8 = rows.filter((r) => r.stage === "S8");

  const cards = [
    { label: t("value.card.pipeline", "Pipeline"), sub: t("value.card.pipelineSub", "indicative · S3–S4"), value: l.pipeline, tone: "--info", note: t("value.card.pipelineNote", "Not counted as expected value.") },
    { label: t("value.card.committed", "Committed"), sub: t("value.card.committedSub", "pilot-measured · S5–S7"), value: l.committed, tone: "--warn", note: t("value.card.enterNote", "Enters portfolio value.") },
    { label: t("value.card.realized", "Realized"), sub: t("value.card.realizedSub", "measured in operation · S8"), value: l.realized, tone: "--ok", note: t("value.card.enterNote", "Enters portfolio value.") },
  ];

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("nav.home", "Home")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{t("value.title", "Value Cockpit")}</span>
      </nav>
      <h1 className="text-lg font-semibold">{t("value.title", "Value Cockpit")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("value.intro", "Pipeline, committed, and realized are different objects and are never summed into one headline. Portfolio value is")}{" "}
        <strong>{t("value.introStrong", "committed + realized only")}</strong> (§7.9).
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: `hsl(var(${c.tone}))` }} aria-hidden />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</span>
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{EUR(c.value)}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{c.sub}</div>
            <div className="mt-2 text-xs text-muted-foreground">{c.note}</div>
          </Card>
        ))}
      </div>

      <Card className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 p-4">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{t("value.portfolioLabel", "Portfolio value (committed + realized)")}</span>
        <span className="text-xl font-semibold tabular-nums">{EUR(portfolio)}</span>
        <span className="text-xs text-muted-foreground">
          {t("value.pipelineOf", "Pipeline of")} {EUR(l.pipeline)} {t("value.shownSeparately", "shown separately, not added.")}
        </span>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b px-4 py-3 text-sm font-semibold">{t("value.tableTitle", "Realized vs. business case (S8)")}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b">
                <th className="px-4 py-2 font-medium">{t("uc.useCase", "Use case")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("value.col.projected", "Projected")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("value.card.realized", "Realized")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("value.col.variance", "Variance")}</th>
              </tr>
            </thead>
            <tbody>
              {s8.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">{t("value.emptyS8", "No use cases in steady operations yet.")}</td></tr>
              )}
              {s8.map((r) => {
                const proj = r.valueProjected ?? 0;
                const real = r.valueRealized ?? 0;
                const variance = proj ? Math.round(((real - proj) / proj) * 100) : 0;
                const good = variance >= -10;
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-2"><Link href={`/uc/${r.id}`} className="hover:underline"><span className="text-muted-foreground">{r.id}</span> {r.title}</Link></td>
                    <td className="px-4 py-2 text-right tabular-nums">{EUR(proj)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{EUR(real)}</td>
                    <td className="px-4 py-2 text-right">
                      <Badge variant="outline" className="tabular-nums" style={{ color: `hsl(var(${good ? "--ok" : "--warn"}))` }}>
                        {variance > 0 ? "+" : ""}{variance}%
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
