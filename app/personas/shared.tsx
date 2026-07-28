import type { Share } from "@/lib/persona";

/** A labelled share bar (percentage of the requestor's demands). Presentational. */
export function ShareBars({ items, empty = "—" }: { items: Share[]; empty?: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((s) => (
        <li key={s.key}>
          <div className="flex items-center justify-between text-sm">
            <span className="truncate">{s.key}</span>
            <span className="ml-2 shrink-0 text-xs text-muted-foreground">
              {s.count} · {Math.round(s.share * 100)}%
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.round(s.share * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A row of small chips (themes, workflows). Presentational. */
export function Chips({ items, empty = "—" }: { items: string[]; empty?: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((x) => (
        <span key={x} className="rounded-full border px-2 py-0.5 text-xs text-foreground/80">{x}</span>
      ))}
    </div>
  );
}

/** The standing ethics note shown on every persona surface. */
export function EthicsNote() {
  return (
    <p className="rounded-md border border-info/30 bg-info/5 px-3 py-2 text-xs text-muted-foreground">
      A service view to help serve requestors better. It is <strong>descriptive, not a score</strong>,
      never ranks or compares individuals, and is not for performance assessment. Cohort patterns are
      aggregate (≥2 requestors).
    </p>
  );
}
