import { Button } from "@/components/ui/button";
import type { GateDecision } from "@/lib/gates";
import { getT } from "@/lib/i18n-server";

/**
 * The gate request panel. When the portal's own check refuses, the button is
 * disabled with EXACTLY the reason the API would return (`docs/BUILD.md
 * §Enforcement placement`). Copy follows `§16.6`: "Request gate decision".
 */
export function GateAction({
  gate,
  decision,
  approvers,
}: {
  gate: string;
  decision: GateDecision;
  approvers: string;
}) {
  const t = getT();
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm font-semibold">{t("gate.label", "Gate")} {gate}</div>
      <div className="mt-3">
        <Button disabled={!decision.permitted} className="w-full">
          {t("gate.requestDecision", "Request gate decision")}
        </Button>
      </div>
      {!decision.permitted && (
        <p className="mt-2 text-xs text-muted-foreground">{decision.reason}</p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        <span className="text-foreground/70">{t("gate.approvers", "Approvers")}:</span> {approvers}
      </p>
    </div>
  );
}
