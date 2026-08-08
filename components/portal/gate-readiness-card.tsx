import type { GateReadinessOutput } from "@/lib/agent/tools/gate-readiness";

/**
 * Renders the `gate-readiness` tool's report in the use-case aside: the verdict for
 * the next gate plus the full met/missing checklist — the enumerated picture the
 * inline `canOpenGate` verdict (first-blocker-only) can't show. Presentational only;
 * the page computes the report server-side.
 */
export function GateReadinessCard({ report }: { report: GateReadinessOutput }) {
  const { targetGate, targetGateLabel, permitted, checklist, summary } = report;

  const icon = (status: "met" | "missing" | "n/a") =>
    status === "met" ? (
      <span className="text-ok" aria-hidden>✓</span>
    ) : status === "missing" ? (
      <span className="text-warn" aria-hidden>✗</span>
    ) : (
      <span className="text-muted-foreground" aria-hidden>–</span>
    );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Gate readiness</h2>
        {targetGate && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              permitted ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"
            }`}
            title={permitted ? "All criteria met" : report.blockingReason}
          >
            {permitted ? "● ready" : "○ not ready"}
          </span>
        )}
      </div>

      {targetGate ? (
        <>
          <p className="text-xs text-muted-foreground">
            Next gate: <span className="font-medium text-foreground">{targetGate}</span>
            {targetGateLabel ? ` · ${targetGateLabel}` : ""}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {checklist.map((c) => (
              <li key={c.criterion} className="flex gap-2">
                <span className="mt-0.5 w-3 shrink-0 text-center">{icon(c.status)}</span>
                <span className="min-w-0">
                  <span className={c.status === "missing" ? "font-medium" : ""}>{c.criterion}</span>
                  <span className="block text-xs leading-snug text-muted-foreground">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{summary}</p>
      )}
    </div>
  );
}
