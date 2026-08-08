import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadCorpusCached } from "@/lib/mesh-corpus";
import { buildGraph, orphans, duplicateClusters, type MeshIssue } from "@/lib/mesh-graph";
import { meshGaps, blastRadius } from "@/lib/mesh-insights";
import { filterGraph, egoGraph, toGraphData, KIND_STYLE, type MeshView } from "@/lib/mesh-view";
import { referenceHref, referenceKind, RELATIONS, type ReferenceKind, type Relation } from "@/lib/references";
import { MeshForceGraph } from "@/components/mesh/force-graph";
import type { MeshRef } from "@/lib/mesh";

export const dynamic = "force-dynamic";

type Params = { kind?: string; relation?: string; source?: string; focus?: string; depth?: string; q?: string };

/** A /mesh URL from the current params plus an override (drops empties). */
function meshHref(current: Params, patch: Partial<Params>): string {
  const m: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...current, ...patch })) if (v) m[k] = v as string;
  const qs = new URLSearchParams(m).toString();
  return qs ? `/mesh?${qs}` : "/mesh";
}

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

export default async function MeshPage({ searchParams }: { searchParams: Params }) {
  const { docs, counts } = await loadCorpusCached();
  const graph = buildGraph(docs);
  const errors = graph.issues.filter((i) => i.severity === "error");
  const warnings = graph.issues.filter((i) => i.severity === "warning");
  const clusters = duplicateClusters(graph);
  const loose = orphans(graph);
  const gaps = meshGaps(graph);
  const authored = graph.edges.filter((e) => e.source === "authored").length;

  // View controls (server-driven, like the board): filter by kind / relation /
  // source, or focus one artifact's neighbourhood to a chosen depth.
  const focus = searchParams.focus?.trim() || undefined;
  const depth = Math.min(3, Math.max(1, Number.parseInt(searchParams.depth ?? "1", 10) || 1));
  const fKind = KIND_STYLE[searchParams.kind as ReferenceKind] ? (searchParams.kind as ReferenceKind) : undefined;
  const fRelation = (RELATIONS as readonly string[]).includes(searchParams.relation ?? "") ? (searchParams.relation as Relation) : undefined;
  const fSource = searchParams.source === "authored" || searchParams.source === "derived" ? searchParams.source : undefined;

  const anyFilter = Boolean(fKind || fRelation || fSource);
  let view: MeshView;
  if (focus) {
    view = egoGraph(graph, focus, depth);
  } else if (!anyFilter) {
    // The whole graph, isolated nodes included — a single item you cannot see is a
    // single item you cannot navigate to.
    view = { nodes: graph.nodes, edges: graph.edges };
  } else {
    view = filterGraph(graph, {
      ...(fKind ? { kinds: new Set([fKind]) } : {}),
      ...(fRelation ? { relations: new Set([fRelation]) } : {}),
      ...(fSource ? { sources: new Set([fSource]) } : {}),
    });
    // Filtering to a kind should show every artifact of that kind, isolated or not —
    // that is how you reach one specific playbook or skill.
    if (fKind) {
      const have = new Set(view.nodes.map((n) => `${n.kind}:${n.id.toLowerCase()}`));
      for (const n of graph.nodes) {
        if (n.kind === fKind && !have.has(`${n.kind}:${n.id.toLowerCase()}`)) view.nodes.push(n);
      }
    }
  }
  const graphData = view.nodes.length > 0 ? toGraphData(view) : null;
  const focusNode = focus ? graph.nodes.find((n) => `${n.kind}:${n.id}`.toLowerCase() === focus.toLowerCase()) : undefined;
  const blast = focusNode ? blastRadius(graph, `${focusNode.kind}:${focusNode.id}`) : [];
  const kindsInGraph = [...new Set(graph.nodes.map((n) => n.kind))].sort();
  const relationsPresent = RELATIONS.filter((r) => graph.edges.some((e) => e.relation === r));
  const filtered = Boolean(fKind || fRelation || fSource || focus);

  // Search: find a node by id or title, jump to its neighbourhood. Server-driven.
  const q = searchParams.q?.trim() || undefined;
  const matches = q
    ? graph.nodes
        .filter((n) => n.id.toLowerCase().includes(q.toLowerCase()) || (n.title ?? "").toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => b.in + b.out - (a.in + a.out))
        .slice(0, 15)
    : [];

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
        <Tile label="Unconnected" value={loose.length} sub={`${gaps.length} with gaps`} />
      </div>

      {graph.nodes.length > 0 && (
        <section className="mt-5">
          <form method="get" action="/mesh" className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Find an artifact by id or title…"
              className="w-72 max-w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            />
            <button type="submit" className="rounded-md border px-3 py-1.5 text-sm hover:border-foreground/40">Search</button>
            {q && <Link href="/mesh" className="text-xs text-muted-foreground hover:text-foreground">clear</Link>}
          </form>
          {q && (
            <Card className="mt-2 divide-y">
              {matches.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">Nothing matches “{q}”.</div>
              ) : (
                matches.map((n) => (
                  <div key={`${n.kind}:${n.id}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-2.5">
                    <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: KIND_STYLE[n.kind].color }} aria-hidden />
                    <RefLink r={n} label={n.title ?? n.id} />
                    <span className="text-xs text-muted-foreground">{referenceKind(n.kind)?.label ?? n.kind}</span>
                    <Link href={meshHref({}, { focus: `${n.kind}:${n.id}` })} className="ml-auto text-xs text-info hover:underline">⊙ focus</Link>
                  </div>
                ))
              )}
            </Card>
          )}
        </section>
      )}

      {graph.nodes.length === 0 && (
        <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">
          Nothing captured yet — the mesh fills as demands are taken in.{" "}
          <Link href="/intake" className="underline hover:text-foreground">Capture a demand</Link>.
        </Card>
      )}

      {graph.nodes.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">The graph</h2>
            {filtered && (
              <Link href="/mesh" className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground">
                ↺ whole graph
              </Link>
            )}
          </div>

          {focusNode ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-info/40 bg-info/5 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Focused on</span>
              <span className="font-medium">{focusNode.title ?? focusNode.id}</span>
              <span className="font-mono text-xs text-muted-foreground">{focusNode.id}</span>
              <span className="ml-2 text-xs text-muted-foreground">neighbourhood · depth {depth}</span>
              {blast.length > 0 && (
                <span className="text-xs" style={{ color: "hsl(var(--warn))" }} title={blast.map((n) => n.id).join(", ")}>
                  · {blast.length} affected if killed
                </span>
              )}
              <span className="ml-auto flex items-center gap-1">
                {depth > 1 && <Link href={meshHref(searchParams, { depth: String(depth - 1) })} className="rounded border px-1.5 text-xs hover:border-foreground/40">− depth</Link>}
                {depth < 3 && <Link href={meshHref(searchParams, { depth: String(depth + 1) })} className="rounded border px-1.5 text-xs hover:border-foreground/40">+ depth</Link>}
              </span>
            </div>
          ) : (
            <div className="mb-3 space-y-1.5">
              {/* Filter by kind */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="w-16 text-muted-foreground">Kind</span>
                <Link href={meshHref(searchParams, { kind: undefined })} className={`rounded-md border px-2 py-0.5 ${!fKind ? "bg-foreground text-background" : "hover:border-foreground/40"}`}>all</Link>
                {kindsInGraph.map((k) => (
                  <Link key={k} href={meshHref(searchParams, { kind: fKind === k ? undefined : k })} className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 ${fKind === k ? "bg-foreground text-background" : "hover:border-foreground/40"}`}>
                    <span className="inline-block size-2 rounded-full" style={{ background: KIND_STYLE[k].color }} aria-hidden />
                    {KIND_STYLE[k].label}
                  </Link>
                ))}
              </div>
              {/* Filter by relation + source */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="w-16 text-muted-foreground">Relation</span>
                <Link href={meshHref(searchParams, { relation: undefined })} className={`rounded-md border px-2 py-0.5 ${!fRelation ? "bg-foreground text-background" : "hover:border-foreground/40"}`}>all</Link>
                {relationsPresent.map((r) => (
                  <Link key={r} href={meshHref(searchParams, { relation: fRelation === r ? undefined : r })} className={`rounded-md border px-2 py-0.5 ${fRelation === r ? "bg-foreground text-background" : "hover:border-foreground/40"}`}>{r}</Link>
                ))}
                <span className="ml-3 text-muted-foreground">Edge</span>
                {(["authored", "derived"] as const).map((s) => (
                  <Link key={s} href={meshHref(searchParams, { source: fSource === s ? undefined : s })} className={`rounded-md border px-2 py-0.5 ${fSource === s ? "bg-foreground text-background" : "hover:border-foreground/40"}`}>{s}</Link>
                ))}
              </div>
            </div>
          )}

          {graphData ? (
            <Card className="overflow-hidden p-2">
              <MeshForceGraph data={graphData} {...(focus ? { focus: focus.toLowerCase() } : {})} />
            </Card>
          ) : (
            <Card className="p-8 text-center text-sm text-muted-foreground">Nothing matches this view. <Link href="/mesh" className="underline">Show the whole graph.</Link></Card>
          )}

          {/* Legend */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {kindsInGraph.map((k) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className="inline-block size-2.5 rounded-full" style={{ background: KIND_STYLE[k].color }} aria-hidden />
                {KIND_STYLE[k].label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1">
              <svg width="22" height="6" aria-hidden className="overflow-visible"><line x1="0" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="1.4" /></svg>
              authored
            </span>
            <span className="inline-flex items-center gap-1">
              <svg width="22" height="6" aria-hidden className="overflow-visible"><line x1="0" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 3" /></svg>
              derived (from state)
            </span>
          </div>
        </section>
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

      {gaps.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-1 text-sm font-semibold">Gaps — demands the mesh cannot fully place</h2>
          <p className="mb-2 max-w-3xl text-xs text-muted-foreground">
            Not an error: the graph is sound. These demands simply have no edge to a{" "}
            <span className="font-medium">champion</span> who carries them or a <span className="font-medium">persona</span>{" "}
            they serve — work for steering, not a broken link.
          </p>
          <Card className="divide-y">
            {gaps.slice(0, 12).map((g) => (
              <div key={`${g.node.kind}:${g.node.id}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3">
                <RefLink r={g.node} label={g.node.title ?? g.node.id} />
                <span className="font-mono text-xs text-muted-foreground">{g.node.id}</span>
                <span className="ml-auto flex gap-1.5">
                  {g.missing.map((k) => (
                    <span key={k} className="rounded-full border px-1.5 text-[10px] uppercase tracking-wide" style={{ color: "hsl(var(--warn))" }}>
                      no {KIND_STYLE[k].label.toLowerCase()}
                    </span>
                  ))}
                </span>
              </div>
            ))}
            {gaps.length > 12 && (
              <div className="p-3 text-xs text-muted-foreground">+ {gaps.length - 12} more with gaps.</div>
            )}
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
                  <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: KIND_STYLE[n.kind].color }} aria-hidden />
                  <RefLink r={n} label={n.title ?? n.id} />
                  <span className="text-xs text-muted-foreground">{referenceKind(n.kind)?.label ?? n.kind}</span>
                  <Link href={meshHref({}, { focus: `${n.kind}:${n.id}` })} className="text-xs text-info hover:underline" title="Focus the graph on this artifact's neighbourhood">⊙ focus</Link>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {n.in} in · {n.out} out
                  </span>
                </div>
              ))}
          </Card>
        </section>
      )}

      {loose.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-1 text-sm font-semibold">Unconnected — {loose.length}</h2>
          <p className="mb-2 max-w-3xl text-xs text-muted-foreground">
            Single items nothing links yet. They still appear in the graph (drifting at the edge), and are listed here so
            you can open any one directly — a skill no playbook runs, a demand nobody has related.
          </p>
          <Card className="divide-y">
            {loose.slice(0, 60).map((n) => (
              <div key={`${n.kind}:${n.id}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-2.5">
                <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: KIND_STYLE[n.kind].color }} aria-hidden />
                <RefLink r={n} label={n.title ?? n.id} />
                <span className="text-xs text-muted-foreground">{referenceKind(n.kind)?.label ?? n.kind}</span>
                <Link href={meshHref({}, { focus: `${n.kind}:${n.id}` })} className="ml-auto text-xs text-info hover:underline">⊙ focus</Link>
              </div>
            ))}
            {loose.length > 60 && <div className="p-2.5 text-xs text-muted-foreground">+ {loose.length - 60} more.</div>}
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
