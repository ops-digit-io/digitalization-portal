import Link from "next/link";
import { Card } from "@/components/ui/card";
import { HeatDot, LevelBadge } from "@/components/portal/badges";
import { cn } from "@/lib/utils";
import type { BoardCard } from "@/lib/board";

export function UseCaseCard({ card }: { card: BoardCard }) {
  return (
    <Link href={`/uc/${card.id}`} className="block focus-visible:outline-none">
      <Card
        className={cn(
          "p-3 transition-colors hover:border-foreground/30 focus-within:ring-2 focus-within:ring-ring",
          card.needsAttention && "border-destructive/50",
        )}
      >
        <div className="text-[11px] font-medium text-muted-foreground">{card.id}</div>
        <div className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug">{card.title}</div>
        <div className="mt-2 text-xs text-muted-foreground">{card.plant ?? "—"}</div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {card.level && <LevelBadge level={card.level} />}
            {card.heat && <HeatDot heat={card.heat} />}
          </div>
          {card.daysInStage !== undefined && (
            <span className="text-xs tabular-nums text-muted-foreground" title="Days in stage">
              {card.daysInStage}d
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
