import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { loadCorpus } from "@/lib/mesh-corpus";
import { buildGraph, duplicateClusters, orphans, toGraphJson, toMermaid } from "@/lib/mesh-graph";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The whole context mesh as data — nodes, edges and the integrity findings.
 *
 * `/api/mesh` answers "what is next to this one artifact?" and is bounded for a page
 * render. This reads the ENTIRE corpus, so it is a reporting endpoint rather than
 * something a page should call on every view: a graph database loading the portal's
 * relations, a diagram in a review deck, an agent that needs the shape of the
 * portfolio rather than one neighbourhood.
 *
 * `?format=mermaid` returns a diagram instead of JSON.
 *
 * Always a derivative. The markdown corpus stays the system of record, and nothing
 * reads this back in — an export that could be re-imported would be a second source
 * of truth, which is exactly what keeping references in the documents avoids.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!can(session, "view_board")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.floor(limitParam) : undefined;

  const { docs, counts } = await loadCorpus(limit ? { limit } : {});
  const graph = buildGraph(docs);

  if (url.searchParams.get("format") === "mermaid") {
    const maxEdges = Number(url.searchParams.get("maxEdges"));
    return new NextResponse(toMermaid(graph, Number.isFinite(maxEdges) && maxEdges > 0 ? { maxEdges } : {}), {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return NextResponse.json({
    ...toGraphJson(graph),
    counts,
    sound: graph.sound,
    issues: graph.issues,
    duplicateClusters: duplicateClusters(graph).map((c) => c.map((r) => `${r.kind}:${r.id}`)),
    orphans: orphans(graph).map((n) => `${n.kind}:${n.id}`),
  });
}
