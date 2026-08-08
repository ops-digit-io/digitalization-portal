import Link from "next/link";
import { loadPortfolioRows } from "@/lib/portfolio";
import { orderBacklog } from "@/lib/funnel/backlog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeatDot, LaneBadge, LevelBadge } from "@/components/portal/badges";
import type { Lane } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Backlog — the S2 (shaping) queue, prioritized. Reuses the funnel read model
 * (loadPortfolioRows) and the pure `orderBacklog` ranker (heat, then age), so a
 * lead sees the hottest, longest-waiting shaping cases first — the ones to pull
 * into assessment next.
 */
export default async function BacklogPage() {
  const { rows, now, live, source } = await loadPortfolioRows();
  const backlog = orderBacklog(rows, now);

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Backlog</span>
      </nav>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">Backlog</h1>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${live ? "bg-ok/10 text-ok" : "bg-secondary text-muted-foreground"}`}
          title={live ? `Read live from ${source}` : `Read from the ${source}`}
        >
          {live ? `● live · ${source}` : `○ ${source}`}
        </span>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Cases in shaping (S2), ranked by opportunity then wait — the shortlist to pull into assessment next. Prioritization is a lead&apos;s call; this orders the queue, it doesn&apos;t decide it.
      </p>

      {backlog.length === 0 ? (
        <Card className="mt-6 p-10 text-center text-sm text-muted-foreground">
          Nothing in shaping right now. Cases land here once triaged into S2.
        </Card>
      ) : (
        <Card className="mt-5 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b">
                <th className="px-4 py-2.5 font-medium">#</th>
                <th className="px-4 py-2.5 font-medium">Demand</th>
                <th className="px-4 py-2.5 font-medium">Lane</th>
                <th className="px-4 py-2.5 font-medium">Plant</th>
                <th className="px-4 py-2.5 font-medium">Heat</th>
                <th className="px-4 py-2.5 font-medium">Waiting</th>
              </tr>
            </thead>
            <tbody>
              {backlog.map(({ row, daysInStage, rank }) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-secondary/30">
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{rank}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/uc/${row.id}`} className="font-medium hover:underline">{row.title}</Link>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-muted-foreground">{row.id}</span>
                      {row.level && <LevelBadge level={row.level} />}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">{row.lane ? <LaneBadge lane={row.lane as Lane} /> : "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.plant ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {row.heat ? (
                      <span className="inline-flex items-center gap-1.5"><HeatDot heat={row.heat} /><span className="text-muted-foreground">{row.heat}</span></span>
                    ) : (
                      <Badge variant="outline" className="font-normal text-muted-foreground">unrated</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                    {daysInStage !== undefined ? `${daysInStage}d` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}
