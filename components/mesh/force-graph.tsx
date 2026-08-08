"use client";

/**
 * The context mesh as a live force-directed graph (D3), not a static picture.
 *
 * The `/mesh` page reshapes the corpus server-side (filter / focus) and hands this
 * component the resulting slice as plain data. Everything interactive happens here,
 * in the browser:
 *   · a physics simulation lays the graph out — connected things pull together, the
 *     rest pushes apart, so structure emerges instead of being authored;
 *   · drag a node to pin it, double-click to release; scroll to zoom, drag the
 *     background to pan;
 *   · hover a node to isolate its neighbourhood (everything else dims);
 *   · click a node to re-focus the whole view on it — that round-trips to the server,
 *     which recomputes the ego graph, so the URL stays the single source of truth.
 *
 * It owns its SVG imperatively (the same bargain the Mermaid component makes): React
 * renders an empty frame, D3 fills it in a layout effect, and the simulation is
 * stopped on cleanup. Node shape and colour come from `KIND_STYLE`, so a persona
 * reads differently from a demand at a glance — the same legend the page prints.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { select } from "d3-selection";
import { zoom, zoomIdentity } from "d3-zoom";
import { drag, type D3DragEvent } from "d3-drag";
import {
  symbol,
  symbolCircle,
  symbolCross,
  symbolDiamond,
  symbolSquare,
  symbolStar,
  symbolTriangle,
  symbolWye,
  type SymbolType,
} from "d3-shape";
import { KIND_STYLE, type GraphData } from "@/lib/mesh-view";
import type { ReferenceKind } from "@/lib/references";
import { useTheme } from "@/components/providers";

/** A distinct glyph per kind, paired with the colour the legend already shows. */
const KIND_SYMBOL: Record<ReferenceKind, SymbolType> = {
  demand: symbolCircle,
  requirement: symbolSquare,
  process: symbolDiamond,
  persona: symbolTriangle,
  champion: symbolStar,
  skill: symbolWye,
  playbook: symbolCross,
};

type SimNode = GraphData["nodes"][number] & SimulationNodeDatum;
type SimLink = SimulationLinkDatum<SimNode> & { relation?: string; authored: boolean };

const HEIGHT = 520;
const radiusOf = (degree: number): number => 7 + Math.min(4, Math.sqrt(degree)) * 3;

export function MeshForceGraph({ data, focus }: { data: GraphData; focus?: string }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    const svgEl = svgRef.current;
    const wrapEl = wrapRef.current;
    if (!svgEl || !wrapEl) return;

    const width = Math.max(320, wrapEl.clientWidth);
    const height = HEIGHT;

    // Colours from the live theme, so the frame reads in light and dark. Kind colours
    // stay fixed (they are categorical accents, chosen to hold on either ground).
    const css = getComputedStyle(document.documentElement);
    const cssVar = (name: string, fallback: string): string => {
      const raw = css.getPropertyValue(name).trim();
      return raw ? `hsl(${raw})` : fallback;
    };
    const lineColor = cssVar("--muted-foreground", "#71717a");
    const textColor = cssVar("--foreground", "#111827");
    const haloColor = cssVar("--background", "#ffffff");
    const focusColor = cssVar("--info", "#2563eb");

    // Fresh nodes/links each run — d3 mutates them (x/y, and link endpoints become
    // node objects), so we never hand it the props' arrays.
    const nodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
    const links: SimLink[] = data.links.map((l) => ({ source: l.source, target: l.target, relation: l.relation, authored: l.authored }));

    const adjacency = new Map<string, Set<string>>();
    for (const n of nodes) adjacency.set(n.id, new Set());
    for (const l of links) {
      adjacency.get(l.source as string)?.add(l.target as string);
      adjacency.get(l.target as string)?.add(l.source as string);
    }

    const svg = select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").attr("height", height);

    const defs = svg.append("defs");
    for (const [id, color] of [["arrow", lineColor], ["arrow-focus", focusColor]] as const) {
      defs
        .append("marker")
        .attr("id", id)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-4L9,0L0,4")
        .attr("fill", color);
    }

    const root = svg.append("g");

    const link = root
      .append("g")
      .attr("fill", "none")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", lineColor)
      .attr("stroke-width", 1.4)
      .attr("stroke-opacity", 0.55)
      .attr("stroke-dasharray", (d) => (d.authored ? null : "4 3"))
      .attr("marker-end", "url(#arrow)");

    const linkLabel = root
      .append("g")
      .selectAll("text")
      .data(links.filter((l) => l.relation))
      .join("text")
      .text((d) => d.relation ?? "")
      .attr("font-size", 9)
      .attr("fill", lineColor)
      .attr("text-anchor", "middle")
      .attr("dy", -2)
      .attr("opacity", 0.75)
      .style("pointer-events", "none");

    const node = root
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer");

    // A ring behind the focused node, so it is found without hovering.
    node
      .filter((d) => focus != null && d.id === focus)
      .append("circle")
      .attr("r", (d) => radiusOf(d.degree) + 6)
      .attr("fill", "none")
      .attr("stroke", focusColor)
      .attr("stroke-width", 2);

    node
      .append("path")
      .attr("d", (d) => symbol(KIND_SYMBOL[d.kind], Math.PI * radiusOf(d.degree) ** 2 * 1.7)())
      .attr("fill", (d) => KIND_STYLE[d.kind].color)
      .attr("fill-opacity", 0.85)
      .attr("stroke", haloColor)
      .attr("stroke-width", 1.5);

    node
      .append("text")
      .text((d) => d.label)
      .attr("x", (d) => radiusOf(d.degree) + 4)
      .attr("y", 3)
      .attr("font-size", 10.5)
      .attr("fill", textColor)
      .attr("paint-order", "stroke")
      .attr("stroke", haloColor)
      .attr("stroke-width", 3)
      .attr("stroke-linejoin", "round")
      .style("pointer-events", "none");

    node.append("title").text((d) => `${d.label}\n${KIND_STYLE[d.kind].label} · ${d.degree} link${d.degree === 1 ? "" : "s"}\nclick to focus`);

    // Hover: isolate a node's neighbourhood; everything else recedes.
    const setEmphasis = (activeId: string | null) => {
      node.attr("opacity", (d) => {
        if (!activeId) return 1;
        return d.id === activeId || adjacency.get(activeId)?.has(d.id) ? 1 : 0.12;
      });
      const lit = (l: SimLink) => (l.source as SimNode).id === activeId || (l.target as SimNode).id === activeId;
      link.attr("stroke-opacity", (l) => (!activeId ? 0.55 : lit(l) ? 0.9 : 0.05));
      linkLabel.attr("opacity", (l) => (!activeId ? 0.75 : lit(l) ? 0.9 : 0.05));
    };
    node.on("mouseenter", (_e, d) => setEmphasis(d.id)).on("mouseleave", () => setEmphasis(null));

    const simulation: Simulation<SimNode, SimLink> = forceSimulation<SimNode>(nodes)
      .force("link", forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(80).strength(0.4))
      .force("charge", forceManyBody().strength(-260))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide<SimNode>().radius((d) => radiusOf(d.degree) + 12))
      .force("x", forceX(width / 2).strength(0.05))
      .force("y", forceY(height / 2).strength(0.05));

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);
      linkLabel
        .attr("x", (d) => (((d.source as SimNode).x ?? 0) + ((d.target as SimNode).x ?? 0)) / 2)
        .attr("y", (d) => (((d.source as SimNode).y ?? 0) + ((d.target as SimNode).y ?? 0)) / 2);
      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Drag to pin (release with a double-click). A drag that barely moves is a click —
    // re-focus the whole view on that node, server-side.
    let dragged = false;
    const dragBehavior = drag<SVGGElement, SimNode>()
      .on("start", (event: D3DragEvent<SVGGElement, SimNode, SimNode>, d) => {
        dragged = false;
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event: D3DragEvent<SVGGElement, SimNode, SimNode>, d) => {
        if (Math.hypot(event.dx, event.dy) > 0) dragged = true;
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event: D3DragEvent<SVGGElement, SimNode, SimNode>, d) => {
        if (!event.active) simulation.alphaTarget(0);
        // Not really a drag → treat as a click to re-focus.
        if (!dragged) {
          d.fx = null;
          d.fy = null;
          router.push(`/mesh?focus=${encodeURIComponent(d.id)}`);
        }
      });
    node.call(dragBehavior);
    node.on("dblclick", (_e, d) => {
      d.fx = null;
      d.fy = null;
      simulation.alphaTarget(0.1).restart();
    });

    // Scroll to zoom, drag the background to pan.
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on("zoom", (event) => root.attr("transform", event.transform.toString()));
    svg.call(zoomBehavior).on("dblclick.zoom", null);
    svg.call(zoomBehavior.transform, zoomIdentity);

    return () => {
      simulation.stop();
      svg.selectAll("*").remove();
      svg.on(".zoom", null);
    };
  }, [data, focus, theme, router]);

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        ref={svgRef}
        role="img"
        aria-label={`Context mesh: ${data.nodes.length} nodes, ${data.links.length} relations`}
        className="w-full touch-none select-none"
        style={{ height: HEIGHT }}
      />
      <p className="pointer-events-none absolute bottom-1 right-2 text-[10px] text-muted-foreground">
        drag to pin · double-click to release · scroll to zoom · click to focus
      </p>
    </div>
  );
}
