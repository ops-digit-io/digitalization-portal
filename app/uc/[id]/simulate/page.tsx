import Link from "next/link";
import { notFound } from "next/navigation";
import { simulateBusinessCase } from "@/lib/businesscase";
import { readDemand, readArtifact } from "@/lib/demands-store";
import { parseUseCase } from "@/lib/parse";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const EUR = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export default async function SimulatePage({ params }: { params: { id: string } }) {
  const t = getT();
  // Real business case for this demand, from the funnel — no seed.
  const bc = await readArtifact(params.id, "business-case");
  if (!bc) notFound();
  const md = await readDemand(params.id);
  const title = (md ? parseUseCase(md).title?.replace(/^UC-\d{4}-\d+\s*·\s*/, "") : undefined) ?? params.id;
  const row = { title };

  const { facts, simulation } = simulateBusinessCase(bc);
  const max = Math.max(simulation.p90, 1);
  const band = [
    { label: t("sim.bandP10", "P10 · downside"), value: simulation.p10, tone: "bg-destructive/70" },
    { label: t("sim.bandP50", "P50 · expected"), value: simulation.p50, tone: "bg-info" },
    { label: t("sim.bandP90", "P90 · base case"), value: simulation.p90, tone: "bg-ok" },
  ];
  const maxImpact = Math.max(...simulation.drivers.map((d) => d.impact), 1);

  return (
    <main className="mx-auto max-w-[900px] px-4 py-6">
      <nav className="mb-3 text-sm text-muted-foreground">
        <Link href="/board" className="hover:text-foreground">{t("nav.portfolio", "Portfolio")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href={`/uc/${params.id}`} className="hover:text-foreground">{params.id}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{t("sim.breadcrumb", "Simulation")}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{t("sim.title", "Business case simulation")}</h1>
        <Badge variant="secondary" className="font-normal">{t("sim.indicative", "indicative")}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {row.title} {t("sim.introDash", "— value band over the assumptions in")} <code>business-case.md</code>{t("sim.introRest", ". The assistant drafts this; a figure here is never committed.")}
      </p>

      <Card className="mt-5 p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("sim.valueBand", "Value band (annual gross)")}</h2>
        <div className="space-y-2.5">
          {band.map((b) => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-muted-foreground">{b.label}</span>
              <div className="h-5 flex-1 rounded bg-secondary">
                <div className={`h-5 rounded ${b.tone}`} style={{ width: `${(b.value / max) * 100}%` }} />
              </div>
              <span className="w-24 shrink-0 text-right text-sm font-medium tabular-nums">{EUR(b.value)}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("sim.spreadNote", "Downside compounds the untested assumptions; the base case assumes all hold. Spread")} {EUR(simulation.p90 - simulation.p10)} {t("sim.betweenP10P90", "between P10 and P90.")}
        </p>
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("sim.tornado", "Assumption sensitivity (tornado)")}</h2>
        <div className="space-y-2">
          {simulation.drivers.map((d) => (
            <div key={d.name} className="flex items-center gap-3">
              <span className="w-64 shrink-0 truncate text-xs" title={d.name}>{d.name}</span>
              <div className="h-4 flex-1 rounded bg-secondary">
                <div
                  className={`h-4 rounded ${d.tested ? "bg-muted-foreground/40" : "bg-warn"}`}
                  style={{ width: `${(d.impact / maxImpact) * 100}%` }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-xs tabular-nums">{EUR(d.impact)}</span>
              <Badge variant="outline" className="w-14 justify-center text-[10px]">
                {d.tested ? t("sim.tested", "tested") : t("sim.untested", "untested")}
              </Badge>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("sim.tornadoNote", "Untested assumptions (amber) are the ones the case rests on. Base figure")}{" "}
          {facts.annualGross ? EUR(facts.annualGross) : t("sim.needsInput", "needs input")} · {t("sim.confidence", "confidence")} {facts.confidence ?? "—"}.
        </p>
      </Card>

      <Card className="mt-4 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("sim.draftSection", "Draft section for the pull request")}</h2>
          <Badge variant="secondary" className="font-normal">{t("sim.draftsOnly", "drafts only, never approves")}</Badge>
        </div>
        <pre className="overflow-x-auto rounded bg-secondary/60 p-3 text-xs leading-relaxed">
{simulation.draftSection}
        </pre>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("sim.appendNote1", "Appending this opens a pull request against")} <code>business-case.md</code>{t("sim.appendNote2", ". A human reviews and merges — the portal never merges.")}
        </p>
      </Card>
    </main>
  );
}
