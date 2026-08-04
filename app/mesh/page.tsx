import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadCorpus } from "@/lib/mesh-corpus";
import { buildGraph, orphans, duplicateClusters, type MeshIssue } from "@/lib/mesh-graph";
import { referenceHref, referenceKind } from "@/lib/references";
import type { MeshRef } from "@/lib/mesh";

export const dynamic = "force-dynamic";

/**
 * The context mesh, seen whole.
 *
 * Every other view of the mesh is local — one artifact's neighbourhood, on that
 * artifact's page. This is the only place the graph is looked at as a graph, and it
 * exists for the two questions a neighbourhood cannot answer:
 *
 *   1. **Is the corpus still readable as a graph?** A `## Related` line that names
 *      nothing records no edge, and from inside the portal that is indistinguishable
 *      from a line nobody wrote. CI fails on it; this is where a human sees it.
 *   2. **What should triage merge?** Duplicate clusters are the reason relations are
 *      typed rather than prose — three demands each flagged against the next are one
 *      cluster of three, not three unrelated pairs.
 *
 * It reads the whole corpus, which is why it is a page you visit and not something
 * on any hot path. `lib/mesh-store.ts` stays the bounded per-page loader.
 */

const SEV_TONE: Record<MeshIssue["severity"], string> = {
  error: "--destructive",
  warning: "--warn",
};

function Tile({ label, value, sub, tone }: { label: string; value: number | string; sub?: string; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums" style={tone ? { color: `hsl(var(${tone}))` } : undefined}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

/** A node, linked to wherever it lives. Ids are shown because they are what you grep. */
function RefLink({ r, label }: { r: MeshRef; label?: string }) {
  const href = referenceHref({ ...r, note: "" });
  return (
    <Link href={href} className="font-mono text-xs hover:underline">
      {label ?? r.id}
    </Link>
  );
}

function IssueRow({ i }: { i: MeshIssue }) {
  return (
    <li className="border-t py-2.5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-2">
        <Badge variant="outline" className="font-mono text-[10px] uppercase" style={{ color: `hsl(var(${SEV_TONE[i.severity]}))` }}>
          {i.code}
        </Badge>
        {i.at.id === "*" ? (
          <span className="font-mono text-xs text-muted-foreground">{i.at.kind}</span>
        ) : (
          <RefLink r={i.at} />
        )}
      </div>
      <p className="mt-1 text-sm leading-snug text-muted-foreground">{i.message}</p>
    </li>
  );
}

export default async function MeshPage() {
  const { docs, counts } = await loadCorpus();
  const graph = buildGraph(docs);
  const errors = graph.issues.filter((i) => i.severity === "error");
  const warnings = graph.issues.filter((i) => i.severity === "warning");
  const clusters = duplicateClusters(graph);
  const loose = orphans(graph);
  const authored = graph.edges.filter((e) => e.source === "authored").length;

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Context Mesh</span>
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Context Mesh</h1>
        <Badge
          variant="outline"
          className="text-[10px] uppercase tracking-wide"
          style={{ color: `hsl(var(${graph.sound ? "--ok" : "--destructive"}))` }}
        >
          {graph.sound ? "sound graph" : "not a sound graph"}
        </Badge>
      </div>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Every artifact and how it relates to the others, read from the markdown itself. Relations live in each
        document&apos;s <code className="font-mono text-xs">## Related</code> section, so the graph is a view of the
        corpus and never a second source of truth.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          label="Nodes"
          value={graph.nodes.length}
          sub={Object.entries(counts).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(" · ") || "nothing captured yet"}
        />
        <Tile label="Edges" value={graph.edges.length} sub={`${authored} authored · ${graph.edges.length - authored} derived`} />
        <Tile label="Errors" value={errors.length} tone={errors.length ? "--destructive" : undefined} sub="break the graph" />
        <Tile label="Unconnected" value={loose.length} sub="no edge either way" />
      </div>

      {graph.nodes.length === 0 && (
        <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">
          Nothing captured yet — the mesh fills as demands are taken in.{" "}
          <Link href="/intake" className="underline hover:text-foreground">Capture a demand</Link>.
        </Card>
      )}

      {clusters.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-1 text-sm font-semibold">Duplicate clusters</h2>
          <p className="mb-2 max-w-3xl text-xs text-muted-foreground">
            Demands flagged as duplicates of one another, grouped. A chain of flags collapses into one cluster, so triage
            merges a group rather than re-deciding the same pair three times.
          </p>
          <Card className="divide-y">
            {clusters.map((c) => (
              <div key={c.map((r) => r.id).join("|")} className="flex flex-wrap items-center gap-x-2 gap-y-1 p-3">
                {c.map((r, idx) => (
                  <span key={r.id} className="flex items-center gap-2">
                    {idx > 0 && <span className="text-muted-foreground" aria-hidden>≡</span>}
                    <RefLink r={r} />
                  </span>
                ))}
                <span className="ml-auto text-xs text-muted-foreground">{c.length} demands</span>
              </div>
            ))}
          </Card>
        </section>
      )}

      {errors.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-1 text-sm font-semibold">Errors — the corpus does not read as a sound graph</h2>
          <p className="mb-2 max-w-3xl text-xs text-muted-foreground">
            Each of these is a relation that is written down but does not connect anything. Fix the{" "}
            <code className="font-mono">## Related</code> line in the named document.
          </p>
          <Card className="p-3">
            <ul>{errors.map((i, n) => <IssueRow key={n} i={i} />)}</ul>
          </Card>
        </section>
      )}

      {warnings.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-1 text-sm font-semibold">Warnings</h2>
          <p className="mb-2 max-w-3xl text-xs text-muted-foreground">
            The graph is readable; these are worth a look rather than a fix.
          </p>
          <Card className="p-3">
            <ul>{warnings.map((i, n) => <IssueRow key={n} i={i} />)}</ul>
          </Card>
        </section>
      )}

      {graph.nodes.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-1 text-sm font-semibold">Most connected</h2>
          <p className="mb-2 max-w-3xl text-xs text-muted-foreground">
            Artifacts the rest of the portfolio leans on. A high inbound count is a case worth reading before deciding
            anything near it.
          </p>
          <Card className="divide-y">
            {[...graph.nodes]
              .filter((n) => n.in + n.out > 0)
              .sort((a, b) => b.in + b.out - (a.in + a.out) || a.id.localeCompare(b.id))
              .slice(0, 12)
              .map((n) => (
                <div key={`${n.kind}:${n.id}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3">
                  <RefLink r={n} label={n.title ?? n.id} />
                  <span className="text-xs text-muted-foreground">{referenceKind(n.kind)?.label ?? n.kind}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {n.in} in · {n.out} out
                  </span>
                </div>
              ))}
          </Card>
        </section>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        The same graph is available as data — <code className="font-mono">/api/mesh/graph</code> for the whole thing,{" "}
        <code className="font-mono">/api/mesh?id=…</code> for one artifact&apos;s neighbourhood, or{" "}
        <code className="font-mono">npm run mesh:check</code> on a checkout.
      </p>
    </main>
  );
}
