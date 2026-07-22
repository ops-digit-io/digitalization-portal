import { UseCaseCard } from "@/components/portal/use-case-card";
import type { Stage } from "@/lib/types";
import type { BoardCard } from "@/lib/board";

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

export function StageColumn({ stage, cards }: { stage: Stage; cards: BoardCard[] }) {
  return (
    <section className="flex w-64 shrink-0 flex-col" aria-label={`${stage} ${STAGE_LABEL[stage]}`}>
      <header className="mb-2 flex items-center gap-2 px-1">
        <span
          className="size-2 rounded-full"
          style={{ background: `hsl(var(--stage-${stage.toLowerCase()}))` }}
          aria-hidden
        />
        <h2 className="text-sm font-semibold">
          {stage} {STAGE_LABEL[stage]}
        </h2>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{cards.length}</span>
      </header>
      <div className="flex flex-col gap-2">
        {cards.map((c) => (
          <UseCaseCard key={c.id} card={c} />
        ))}
        {cards.length === 0 && (
          <div className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            —
          </div>
        )}
      </div>
    </section>
  );
}
