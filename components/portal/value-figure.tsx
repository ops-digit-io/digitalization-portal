import { Badge } from "@/components/ui/badge";
import type { Confidence } from "@/lib/types";

/**
 * Encodes a specification rule in the component layer: an indicative figure
 * cannot be rendered as committed (`docs/16-ui.md §16.4`, constraint #8). The
 * confidence badge is never optional.
 */
export function ValueFigure({
  amount,
  confidence,
  currency = "EUR",
}: {
  amount: number | null;
  confidence: Confidence;
  currency?: string;
}) {
  if (amount === null) {
    return <span className="text-muted-foreground">Needs input</span>;
  }

  const formatted = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

  const strong = confidence === "committed" || confidence === "realized";

  return (
    <span className="inline-flex items-baseline gap-2">
      <span className={strong ? "font-semibold tabular-nums" : "font-normal tabular-nums text-muted-foreground"}>
        {formatted}
      </span>
      <Badge variant="secondary" className="text-xs font-normal">
        {confidence}
      </Badge>
    </span>
  );
}
