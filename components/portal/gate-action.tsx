import { Button } from "@/components/ui/button";
import type { GateDecision } from "@/lib/gates";

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
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm font-semibold">Gate {gate}</div>
      <div className="mt-3">
        <Button disabled={!decision.permitted} className="w-full">
          Request gate decision
        </Button>
      </div>
      {!decision.permitted && (
        <p className="mt-2 text-xs text-muted-foreground">{decision.reason}</p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        <span className="text-foreground/70">Approvers:</span> {approvers}
      </p>
    </div>
  );
}
