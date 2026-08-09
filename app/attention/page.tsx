import Link from "next/link";
import { assembleBoard } from "@/lib/board";
import { loadPortfolioRows } from "@/lib/portfolio";
import { getSession } from "@/lib/auth/current";
import { Card } from "@/components/ui/card";
import { UseCaseCard } from "@/components/portal/use-case-card";
import { loadCorpusCached } from "@/lib/mesh-corpus";
import { buildGraph, orphans, duplicateClusters } from "@/lib/mesh-graph";
import { referenceHref } from "@/lib/references";

export const dynamic = "force-dynamic";

/** Work artifacts worth surfacing when they connect to nothing (tools/personas are sparse by design). */
const ORPHAN_KINDS = new Set(["demand", "requirement", "repo"]);

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

  // Context gaps from the derived mesh: work captured twice (duplicate clusters) and
  // work connected to nothing (orphans). Best-effort — a corpus read that fails leaves
  // this section empty rather than failing the page.
  const graph = await loadCorpusCached().then((c) => buildGraph(c.docs)).catch(() => null);
  const dupeClusters = graph ? duplicateClusters(graph).slice(0, 20) : [];
  const orphanNodes = graph ? orphans(graph).filter((n) => ORPHAN_KINDS.has(n.kind)).slice(0, 30) : [];

  const nothing =
    unreadable.length === 0 && stalled.length === 0 && dupeClusters.length === 0 && orphanNodes.length === 0;

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
        Everything the Digital Unit should look at now — cases whose state can&apos;t be read, active cases stalled past 30 days in stage, and context gaps the mesh surfaces (duplicates and unlinked work).
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

          {(dupeClusters.length > 0 || orphanNodes.length > 0) && (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <span aria-hidden>🕸</span>
                Context gaps
                <span className="text-xs font-normal text-muted-foreground">
                  ({dupeClusters.length + orphanNodes.length})
                </span>
              </h2>
              <p className="mb-3 text-xs text-muted-foreground">
                From the context mesh — work captured more than once, and work linked to nothing. A derived view, so treat it as a prompt to check, not a verdict.
              </p>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {dupeClusters.length > 0 && (
                  <Card className="p-4">
                    <div className="text-xs font-medium">Possible duplicates ({dupeClusters.length})</div>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {dupeClusters.map((cluster, i) => (
                        <li key={i} className="flex flex-wrap items-center gap-x-1.5">
                          {cluster.map((ref, j) => (
                            <span key={`${ref.kind}:${ref.id}`}>
                              <Link href={referenceHref({ ...ref, note: "" }) || "#"} className="underline hover:text-foreground">{ref.id}</Link>
                              {j < cluster.length - 1 && <span className="mx-1 text-muted-foreground" aria-hidden>≈</span>}
                            </span>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
                {orphanNodes.length > 0 && (
                  <Card className="p-4">
                    <div className="text-xs font-medium">Unlinked work ({orphanNodes.length})</div>
                    <p className="mt-1 text-[11px] text-muted-foreground">Connected to nothing — no champion, persona, process, or related work.</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {orphanNodes.map((n) => (
                        <li key={`${n.kind}:${n.id}`}>
                          <Link href={referenceHref({ kind: n.kind, id: n.id, note: "" }) || "#"} className="underline hover:text-foreground">
                            {n.id}
                          </Link>
                          {n.title && n.title !== n.id && <span className="text-muted-foreground"> — {n.title}</span>}
                          <span className="ml-1 text-[11px] text-muted-foreground">({n.kind})</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
