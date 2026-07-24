"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Triage row actions. "Accept" records the current stage's exit-gate passage
 * (G1 for S1, G2 for S2) through the same `/api/demands/[id]/advance` route the
 * detail view uses — enforcement is server-side (`canOpenGate` + `can`), and the
 * refused reason is shown here so the UI never disagrees with enforcement.
 *
 * Lane re-assignment and reasoned rejection (park/kill) need their own write
 * paths; until those land they are rendered disabled rather than as dead controls,
 * so the queue never implies an action it can't perform.
 */
export function TriageActions({ id, gate, gateLabel }: { id: string; gate?: string; gateLabel?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    if (!gate) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/demands/${encodeURIComponent(id)}/advance`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? `Could not accept (${res.status}).`);
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Network error — nothing was saved.");
    } finally {
      setBusy(false);
    }
  }

  const working = busy || pending;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-1.5 text-xs">
        <button
          type="button"
          onClick={accept}
          disabled={working || !gate}
          className="rounded-md bg-primary px-2.5 py-1 font-medium text-primary-foreground disabled:opacity-50"
          title={gate ? `Pass ${gate}${gateLabel ? ` — ${gateLabel}` : ""}` : undefined}
        >
          {working ? "Accepting…" : gate ? `Accept ${gate} →` : "Accept"}
        </button>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-md border px-2.5 py-1 text-muted-foreground opacity-60"
          title="Lane re-assignment write path lands with M3"
        >
          Assign lane
        </button>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-md border px-2.5 py-1 text-muted-foreground opacity-60"
          title="Reasoned rejection (park/kill) write path lands with M3"
        >
          Reject
        </button>
      </div>
      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </div>
  );
}
