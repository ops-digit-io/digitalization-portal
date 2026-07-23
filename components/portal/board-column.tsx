import { UseCaseCard } from "@/components/portal/use-case-card";
import type { BoardCard } from "@/lib/board";

/** One board column — works for any grouping (stage, lane, plant). */
export function BoardColumn({
  title,
  subtitle,
  colorVar,
  cards,
}: {
  title: string;
  subtitle?: string;
  /** CSS var for the header dot, e.g. "--stage-s4". */
  colorVar?: string;
  cards: BoardCard[];
}) {
  return (
    <section className="flex w-64 shrink-0 flex-col" aria-label={title}>
      <header className="mb-2 flex items-center gap-2 px-1">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: colorVar ? `hsl(var(${colorVar}))` : "hsl(var(--muted-foreground))" }}
          aria-hidden
        />
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{cards.length}</span>
      </header>
      <div className="flex flex-col gap-2">
        {cards.map((c) => (
          <UseCaseCard key={c.id} card={c} />
        ))}
        {cards.length === 0 && (
          <div className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">—</div>
        )}
      </div>
    </section>
  );
}
