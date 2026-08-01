import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n-server";

type GateState = "passed" | "open" | "pending" | "killed" | "parked";

export interface GateNode {
  id: string;
  label: string;
  state: GateState;
  on?: string;
  by?: string;
}

/**
 * The signature element of the use-case page. Eight nodes; whole lifecycle
 * position readable at a glance (`docs/16-ui.md §16.4`). Radix tooltip swapped for
 * a native `title` so the demo has no extra runtime dependency.
 */
export function GateTimeline({ gates }: { gates: GateNode[] }) {
  const t = getT();
  return (
    <ol className="flex items-center gap-0" role="list">
      {gates.map((g, i) => (
        <li key={g.id} className="flex items-center">
          <button
            title={`${g.id} · ${g.label}: ${
              g.state === "passed" ? `${t("gate.passed", "passed")} ${g.on ?? ""} ${t("gate.by", "by")} ${g.by ?? ""}` : g.state
            }`}
            className={cn(
              "size-3.5 rounded-full border-2 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              g.state === "passed" && "bg-foreground border-foreground",
              g.state === "open" && "bg-background border-foreground ring-2 ring-foreground/20",
              g.state === "pending" && "bg-background border-muted-foreground/40",
              g.state === "killed" && "bg-destructive border-destructive",
              g.state === "parked" && "bg-muted border-muted-foreground/40",
            )}
            aria-label={`${g.id} ${g.label}: ${g.state}`}
          />
          {i < gates.length - 1 && (
            <span
              className={cn(
                "h-px w-6",
                gates[i + 1]?.state === "pending" ? "bg-border" : "bg-foreground",
              )}
              aria-hidden
            />
          )}
        </li>
      ))}
    </ol>
  );
}
