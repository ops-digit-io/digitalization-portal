import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Stage } from "@/lib/types";
import { getT } from "@/lib/i18n-server";

const STAGE_LABEL: Record<Stage, string> = {
  S1: "Demand",
  S2: "Shaping",
  S3: "Assess",
  S4: "POC",
  S5: "Pilot",
  S6: "Scale",
  S7: "Rollout",
  S8: "Steady ops",
};

export function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  const t = getT();
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", className)}>
      <span
        className="size-2 rounded-full"
        style={{ background: `hsl(var(--stage-${stage.toLowerCase()}))` }}
        aria-hidden
      />
      {stage} {t(`stage.${stage}`, STAGE_LABEL[stage])}
    </Badge>
  );
}
