import Link from "next/link";
import { SEED_ROWS, SEED_BUSINESS_CASE } from "@/lib/seed";
import { simulateBusinessCase } from "@/lib/businesscase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const EUR = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export default function SimulateIndex() {
  const ids = Object.keys(SEED_BUSINESS_CASE);
  return (
    <main className="mx-auto max-w-[900px] px-4 py-6">
      <h1 className="text-lg font-semibold">Business Case Simulation</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Value bands and assumption sensitivity for use cases with a business case.
        Figures are indicative — never committed.
      </p>

      <div className="mt-5 space-y-2">
        {ids.map((id) => {
          const row = SEED_ROWS.find((r) => r.id === id);
          const { simulation } = simulateBusinessCase(SEED_BUSINESS_CASE[id]!);
          return (
            <Link key={id} href={`/uc/${id}/simulate`}>
              <Card className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:border-foreground/20">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground">{id}</div>
                  <div className="truncate font-medium">{row?.title ?? id}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="tabular-nums">
                    {EUR(simulation.p10)} <span className="text-muted-foreground">→</span> {EUR(simulation.p90)}
                  </div>
                  <div className="text-xs text-muted-foreground">P10 → base</div>
                </div>
                <Badge variant="secondary" className="font-normal">indicative</Badge>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
