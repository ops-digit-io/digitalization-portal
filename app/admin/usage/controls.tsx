"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** Range links + reset for the cost overview. The page itself is server-rendered;
 *  this only changes the window (a query param) and clears the counters. */
export function UsageControls({ days, canReset }: { days: number; canReset: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ranges = [7, 30, 90];

  async function reset() {
    if (!confirm("Clear all recorded usage? This cannot be undone.")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/usage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) setErr(data.error ?? "Reset failed.");
      else startTransition(() => router.refresh());
    } catch {
      setErr("Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex overflow-hidden rounded-md border text-xs">
        {ranges.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => startTransition(() => router.push(`/admin/usage?days=${r}`))}
            className={`px-2.5 py-1 ${r === days ? "bg-foreground text-background" : "hover:bg-muted"}`}
            disabled={pending}
          >
            {r}d
          </button>
        ))}
      </div>
      {canReset && (
        <button
          type="button"
          onClick={reset}
          disabled={busy}
          className="rounded-md border px-2.5 py-1 text-xs hover:border-destructive/50 hover:text-destructive disabled:opacity-50"
        >
          {busy ? "Clearing…" : "Reset counters"}
        </button>
      )}
      {err && <span className="text-xs text-destructive">{err}</span>}
    </div>
  );
}
