"use client";

/**
 * Renders a ```mermaid fence from an artefact as a diagram.
 *
 * The phase templates ship flowcharts (the as-is and target process), so the
 * artefact is only readable if the diagram actually draws. Three things matter
 * here:
 *   · mermaid is ~1 MB, so it is imported dynamically — the chunk only loads for
 *     a page that actually shows a diagram, and the main bundle is untouched;
 *   · artefacts are edited by hand, so a diagram is regularly half-written and
 *     invalid. That is normal, not an error state: we fall back to the source
 *     text instead of throwing or showing an empty box;
 *   · it follows the portal's light/dark theme, and re-renders when that flips.
 */

import { useEffect, useId, useState } from "react";
import { useTheme } from "@/components/providers";

function Source({ chart }: { chart: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
      <code>{chart}</code>
    </pre>
  );
}

export function Mermaid({ chart }: { chart: string }) {
  const { theme } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // useId is stable across renders and unique per instance; mermaid needs a DOM-safe id.
  const domId = `mmd-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    let cancelled = false;

    /** mermaid renders through a detached node; a failed parse leaves it behind. */
    const sweep = () => {
      for (const id of [domId, `d${domId}`]) document.getElementById(id)?.remove();
    };

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        // Draw in the portal's palette rather than mermaid's lavender default —
        // read live from the CSS variables so light and dark both follow.
        const css = getComputedStyle(document.documentElement);
        const v = (name: string, fallback: string) => {
          const raw = css.getPropertyValue(name).trim();
          return raw ? `hsl(${raw})` : fallback;
        };
        mermaid.initialize({
          startOnLoad: false,
          // Labels come from an editable artefact, so let mermaid sanitise them.
          securityLevel: "strict",
          theme: "base",
          fontFamily: "inherit",
          themeVariables: {
            background: "transparent",
            primaryColor: v("--muted", "#f4f4f5"),
            primaryTextColor: v("--foreground", "#111"),
            primaryBorderColor: v("--border", "#d4d4d8"),
            secondaryColor: v("--secondary", "#f4f4f5"),
            tertiaryColor: v("--muted", "#f4f4f5"),
            lineColor: v("--muted-foreground", "#71717a"),
            textColor: v("--foreground", "#111"),
            fontSize: "13px",
          },
        });
        const { svg } = await mermaid.render(domId, chart);
        if (cancelled) return;
        setSvg(svg);
        setFailed(false);
      } catch {
        sweep();
        if (cancelled) return;
        setSvg(null);
        setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      sweep();
    };
  }, [chart, theme, domId]);

  // Not drawable (yet) — show what the author actually wrote.
  if (failed || !svg) return <Source chart={chart} />;

  return (
    <div
      className="my-3 overflow-x-auto rounded-md border bg-muted/30 p-3 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      // mermaid renders with securityLevel "strict", which sanitises the markup.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
