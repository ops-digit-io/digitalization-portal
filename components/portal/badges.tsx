import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Heat, Lane, Level } from "@/lib/types";

/** ● high · ◐ medium · ○ low */
export function HeatDot({ heat, className }: { heat: Heat; className?: string }) {
  const glyph = heat === "high" ? "●" : heat === "medium" ? "◐" : "○";
  return (
    <span className={cn("text-muted-foreground", className)} title={`Heat: ${heat}`} aria-label={`heat ${heat}`}>
      {glyph}
    </span>
  );
}

const LEVEL_TITLE: Record<Level, string> = {
  L1: "L1 — agentic organisation: the workflow changes shape",
  L2: "L2 — AI-enhanced step: one task gets faster, workflow unchanged",
};

export function LevelBadge({ level }: { level: Level }) {
  return (
    <Badge variant="outline" className="font-medium" title={LEVEL_TITLE[level]}>
      {level}
    </Badge>
  );
}

const LANE_LABEL: Record<Lane, string> = {
  run: "run",
  regulatory: "regulatory",
  continuous_improvement: "continuous improvement",
  transform: "transform",
  innovation: "innovation",
  data_ai: "data / AI",
  local: "local",
};

export function LaneBadge({ lane }: { lane: Lane }) {
  return (
    <Badge variant="secondary" className="font-normal text-muted-foreground">
      {LANE_LABEL[lane]}
    </Badge>
  );
}
