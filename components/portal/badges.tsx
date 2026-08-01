import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Heat, Lane, Level } from "@/lib/types";

/**
 * Optional translator. This module is imported into client bundles (e.g. via
 * `LANE_LABEL` in demand-triage-actions), so it must not depend on the
 * server-only `getT`/`next/headers`. Server callers pass their own `getT()`
 * translator through this prop; without it the components render English.
 */
type TFn = (key: string, fallback?: string) => string;

/** ● high · ◐ medium · ○ low */
export function HeatDot({ heat, className, t }: { heat: Heat; className?: string; t?: TFn }) {
  const glyph = heat === "high" ? "●" : heat === "medium" ? "◐" : "○";
  const heatLabel = t ? t("badges.heat", "Heat") : "Heat";
  return (
    <span className={cn("text-muted-foreground", className)} title={`${heatLabel}: ${heat}`} aria-label={`${heatLabel.toLowerCase()} ${heat}`}>
      {glyph}
    </span>
  );
}

const LEVEL_TITLE: Record<Level, string> = {
  L1: "L1 — agentic organisation: the workflow changes shape",
  L2: "L2 — AI-enhanced step: one task gets faster, workflow unchanged",
};

export function LevelBadge({ level, t }: { level: Level; t?: TFn }) {
  const title = t ? t(`badges.level.${level}`, LEVEL_TITLE[level]) : LEVEL_TITLE[level];
  return (
    <Badge variant="outline" className="font-medium" title={title}>
      {level}
    </Badge>
  );
}

export const LANE_LABEL: Record<Lane, string> = {
  run: "run",
  regulatory: "regulatory",
  continuous_improvement: "continuous improvement",
  transform: "transform",
  innovation: "innovation",
  data_ai: "data / AI",
  local: "local",
};

export function LaneBadge({ lane, t }: { lane: Lane; t?: TFn }) {
  return (
    <Badge variant="secondary" className="font-normal text-muted-foreground">
      {t ? t(`lane.${lane}`, LANE_LABEL[lane]) : LANE_LABEL[lane]}
    </Badge>
  );
}
