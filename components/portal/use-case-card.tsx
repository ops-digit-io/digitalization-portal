import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeatDot, LevelBadge, LaneBadge } from "@/components/portal/badges";
import { CardQuickActions, type QuickActionCaps } from "@/components/portal/card-quick-actions";
import { cn } from "@/lib/utils";
import type { Lane } from "@/lib/types";
import type { BoardCard } from "@/lib/board";

export function UseCaseCard({ card, manage }: { card: BoardCard; manage?: QuickActionCaps }) {
  const killed = card.status === "killed";
  const parked = card.status === "parked";
  const showMenu = manage && (manage.advance || manage.park || manage.kill || manage.reactivate);
  return (
    <Link href={`/uc/${card.id}`} className="block focus-visible:outline-none">
      <Card
        className={cn(
          "border-l-2 p-3 transition-colors hover:border-foreground/30 focus-within:ring-2 focus-within:ring-ring",
          killed && "border-l-destructive/60 opacity-70",
          parked && "border-l-warn/60",
          card.stalled && !killed && !parked && "border-l-warn",
          !killed && !parked && !card.stalled && "border-l-transparent",
          card.needsAttention && "border-destructive/50",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">{card.id}</span>
          <div className="flex items-center gap-1.5">
            {killed && <Badge variant="outline" className="border-destructive/50 px-1.5 py-0 text-[10px] font-normal text-destructive">killed</Badge>}
            {parked && <Badge variant="outline" className="border-warn/50 px-1.5 py-0 text-[10px] font-normal text-warn">parked</Badge>}
            {showMenu && <CardQuickActions id={card.id} status={card.status} caps={manage!} />}
          </div>
        </div>
        <div className={cn("mt-0.5 line-clamp-2 text-sm font-medium leading-snug", killed && "line-through")}>{card.title}</div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {card.lane && <LaneBadge lane={card.lane as Lane} />}
          {card.domain && <span className="text-xs text-muted-foreground">{card.domain}</span>}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{card.plant ?? "—"}</span>
            {card.level && <LevelBadge level={card.level} />}
            {card.heat && <HeatDot heat={card.heat} />}
          </div>
          {card.daysInStage !== undefined && (
            <span
              className={cn("inline-flex items-center gap-0.5 text-xs tabular-nums", card.stalled ? "font-medium text-warn" : "text-muted-foreground")}
              title={card.stalled ? "Stalled — over 30 days in stage" : "Days in stage"}
            >
              {card.stalled && <span aria-hidden>⏱</span>}
              {card.daysInStage}d
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
