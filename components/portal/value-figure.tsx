import { Badge } from "@/components/ui/badge";
import { getT } from "@/lib/i18n-server";
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
  const { t } = getT();
  if (amount === null) {
    return <span className="text-muted-foreground">{t("value.needsInput", "Needs input")}</span>;
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
        {t(`enum.confidence.${confidence}`, confidence)}
      </Badge>
    </span>
  );
}
