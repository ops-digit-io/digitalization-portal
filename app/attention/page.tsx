import Link from "next/link";
import { assembleBoard } from "@/lib/board";
import { loadPortfolioRows } from "@/lib/portfolio";
import { getSession } from "@/lib/auth/current";
import { Card } from "@/components/ui/card";
import { UseCaseCard } from "@/components/portal/use-case-card";

export const dynamic = "force-dynamic";

/**
 * Needs Attention — the queue the launchpad promises. Two kinds of "attention",
 * from the same board pipeline every other view uses:
 *   - **Unreadable:** a demand whose `## State` couldn't be parsed (`needsAttention`).
 *   - **Stalled:** an active case sitting past the stall threshold (`STALL_DAYS=30`).
 * Read-only triage aid — each card links to the use case where actions live.
 */
export default async function AttentionPage() {
  const session = await getSession();
  const { rows, now, live, source } = await loadPortfolioRows();
  const board = assembleBoard(rows, session, now, {});

  const unreadable = board.needsAttention;
  const stalled = board.cards
    .filter((c) => c.stalled)
    .sort((a, b) => (b.daysInStage ?? 0) - (a.daysInStage ?? 0));

  const nothing = unreadable.length === 0 && stalled.length === 0;

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Needs attention</span>
      </nav>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">Needs attention</h1>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${live ? "bg-ok/10 text-ok" : "bg-secondary text-muted-foreground"}`}
          title={live ? `Read live from ${source}` : `Read from the ${source}`}
        >
          {live ? `● live · ${source}` : `○ ${source}`}
        </span>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Everything the Digital Unit should look at now — cases whose state can&apos;t be read, and active cases stalled past 30 days in stage.
      </p>

      {nothing ? (
        <Card className="mt-6 p-10 text-center text-sm text-muted-foreground">
          Nothing needs attention — no unreadable state and nothing stalled. 🎉
        </Card>
      ) : (
        <div className="mt-6 space-y-8">
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <span className="text-destructive" aria-hidden>⚠</span>
              Unreadable state
              <span className="text-xs font-normal text-muted-foreground">({unreadable.length})</span>
            </h2>
            {unreadable.length === 0 ? (
              <p className="text-sm text-muted-foreground">None — every case&apos;s state parses cleanly.</p>
            ) : (
              <>
                <p className="mb-3 text-xs text-muted-foreground">
                  The <span className="font-mono">## State</span> section couldn&apos;t be parsed. Open each and fix the format.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {unreadable.map((c) => <UseCaseCard key={c.id} card={c} />)}
                </div>
              </>
            )}
          </section>

          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <span className="text-warn" aria-hidden>⏱</span>
              Stalled · over 30 days in stage
              <span className="text-xs font-normal text-muted-foreground">({stalled.length})</span>
            </h2>
            {stalled.length === 0 ? (
              <p className="text-sm text-muted-foreground">None — nothing is sitting past the stall threshold.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stalled.map((c) => <UseCaseCard key={c.id} card={c} />)}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
