import Link from "next/link";
import { listDemands } from "@/lib/demands-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const LANE_LABEL: Record<string, string> = {
  run: "run", regulatory: "regulatory", continuous_improvement: "continuous improvement",
  transform: "transform", innovation: "innovation", data_ai: "data / AI", local: "local", unassigned: "unassigned",
};

export default async function Demands() {
  const demands = await listDemands();

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Demands</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Demands</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Every demand taken in, as a markdown page in the one central intake repo. A demand
            earns its own repository only at the PoC stage. {demands.length} captured.
          </p>
        </div>
        <Link href="/intake" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Capture a demand →
        </Link>
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-2.5 font-medium">Demand</th>
              <th className="px-4 py-2.5 font-medium">Stage</th>
              <th className="px-4 py-2.5 font-medium">Lane</th>
              <th className="px-4 py-2.5 font-medium">Plant</th>
              <th className="px-4 py-2.5 font-medium">Domain</th>
              <th className="px-4 py-2.5 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {demands.map((d) => (
              <tr key={d.id} className="border-b last:border-0 hover:bg-secondary/30">
                <td className="px-4 py-2.5">
                  <Link href={`/uc/${d.id}`} className="font-medium hover:underline">{d.title}</Link>
                  <div className="font-mono text-xs text-muted-foreground">{d.id}</div>
                  {d.needsAttention && <Badge variant="outline" className="mt-1 border-warn/50 font-normal text-warn">needs attention</Badge>}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{d.stage ?? "—"}</td>
                <td className="px-4 py-2.5">{d.lane ? <Badge variant="secondary" className="font-normal text-muted-foreground">{LANE_LABEL[d.lane] ?? d.lane}</Badge> : "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{d.plant ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{d.domain ?? "—"}</td>
                <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{d.created ?? "—"}</td>
              </tr>
            ))}
            {demands.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No demands yet. <Link href="/intake" className="underline">Capture the first one.</Link></td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
