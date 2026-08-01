import Link from "next/link";
import { listDemands, readArtifact } from "@/lib/demands-store";
import { simulateBusinessCase } from "@/lib/businesscase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const EUR = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export default async function SimulateIndex() {
  const t = getT();
  // Real funnel — only cases that actually have a business-case.md, no seed.
  const demands = await listDemands();
  const withBc = demands.filter((d) => d.artifacts.includes("business-case"));
  const items = await Promise.all(
    withBc.map(async (d) => {
      const bc = (await readArtifact(d.id, "business-case")) ?? "";
      const { simulation } = simulateBusinessCase(bc);
      return { id: d.id, title: d.title, simulation };
    }),
  );

  return (
    <main className="mx-auto max-w-[900px] px-4 py-6">
      <h1 className="text-lg font-semibold">{t("simulate.title", "Business Case Simulation")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("simulate.intro", "Value bands and assumption sensitivity for use cases with a business case. Figures are indicative — never committed.")}
      </p>

      <div className="mt-5 space-y-2">
        {items.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {t("simulate.empty1", "No business cases yet. A")} <span className="font-mono">business-case.md</span> {t("simulate.empty2", "is drafted from G2 onward — until a demand has one, there is nothing to simulate.")}
          </Card>
        )}
        {items.map((it) => (
          <Link key={it.id} href={`/uc/${it.id}/simulate`}>
            <Card className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:border-foreground/20">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">{it.id}</div>
                <div className="truncate font-medium">{it.title}</div>
              </div>
              <div className="text-right text-sm">
                <div className="tabular-nums">
                  {EUR(it.simulation.p10)} <span className="text-muted-foreground">→</span> {EUR(it.simulation.p90)}
                </div>
                <div className="text-xs text-muted-foreground">{t("simulate.p10ToBase", "P10 → base")}</div>
              </div>
              <Badge variant="secondary" className="font-normal">{t("sim.indicative", "indicative")}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
