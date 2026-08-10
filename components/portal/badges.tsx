import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n-server";
import { LANE_LABEL } from "@/lib/labels";
import type { Heat, Lane, Level } from "@/lib/types";

/** ● high · ◐ medium · ○ low */
export function HeatDot({ heat, className }: { heat: Heat; className?: string }) {
  const { t } = getT();
  const glyph = heat === "high" ? "●" : heat === "medium" ? "◐" : "○";
  const word = t(`enum.heat.${heat}`, heat);
  return (
    <span className={cn("text-muted-foreground", className)} title={`${t("enum.heatWord", "Heat")}: ${word}`} aria-label={`${t("enum.heatWord", "Heat")} ${word}`}>
      {glyph}
    </span>
  );
}

/** English fallback tooltips for the agentic-investment levels. */
const LEVEL_TITLE: Record<Level, string> = {
  L1: "L1 — agentic organisation: the workflow changes shape",
  L2: "L2 — AI-enhanced step: one task gets faster, workflow unchanged",
};

export function LevelBadge({ level }: { level: Level }) {
  const { t } = getT();
  return (
    <Badge variant="outline" className="font-medium" title={t(`enum.level.${level}`, LEVEL_TITLE[level])}>
      {level}
    </Badge>
  );
}

export function LaneBadge({ lane }: { lane: Lane }) {
  const { t } = getT();
  return (
    <Badge variant="secondary" className="font-normal text-muted-foreground">
      {t(`enum.lane.${lane}`, LANE_LABEL[lane])}
    </Badge>
  );
}
