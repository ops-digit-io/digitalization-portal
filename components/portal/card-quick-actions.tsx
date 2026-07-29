"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface QuickActionCaps {
  advance: boolean;
  park: boolean;
  kill: boolean;
  reactivate: boolean;
}

/**
 * Compact ⋯ quick-action menu on a board card — advance / park / kill without
 * opening the demand (reactivate when the demand is stopped). Lives inside the card's
 * Link, so every handler stops propagation to avoid navigating. Each action POSTs the
 * same server-enforced route the detail page uses; refusals surface inline. The menu
 * only renders for a live funnel demand the session may manage.
 */
export function CardQuickActions({
  id,
  status,
  caps,
}: {
  id: string;
  status?: string;
  caps: QuickActionCaps;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<null | "park" | "kill">(null);
  const [reason, setReason] = useState("");

  const stopped = status === "parked" || status === "killed" || status === "retired";

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setMode(null); setError(null); }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function swallow(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function run(path: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/demands/${encodeURIComponent(id)}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) { setError(data.error ?? `Failed (${res.status}).`); setBusy(false); return; }
      setBusy(false);
      setOpen(false);
      setMode(null);
      setReason("");
      startTransition(() => router.refresh());
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  function confirmReason() {
    if (reason.trim() === "") { setError("A reason is required."); return; }
    if (mode === "park") void run("triage", { action: "reject", reason });
    else if (mode === "kill") void run("state", { action: "kill", reason });
  }

  const item = "block w-full px-3 py-1.5 text-left text-xs hover:bg-secondary disabled:opacity-50";

  return (
    <div ref={ref} className="relative" onClick={swallow}>
      <button
        type="button"
        aria-label="Quick actions"
        onClick={(e) => { swallow(e); setOpen((o) => !o); }}
        className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        ⋯
      </button>

      {open && (
        <div className="absolute right-0 top-6 z-50 w-44 overflow-hidden rounded-md border bg-background shadow-md" onClick={swallow}>
          {mode ? (
            <div className="p-2">
              <input
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") confirmReason(); }}
                placeholder={`${mode} reason (required)`}
                className="w-full rounded border bg-transparent px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="mt-1.5 flex gap-1.5">
                <button type="button" onClick={confirmReason} disabled={busy || reason.trim() === ""} className={`flex-1 rounded px-2 py-1 text-xs font-medium text-white disabled:opacity-50 ${mode === "kill" ? "bg-destructive" : "bg-warn"}`}>
                  {busy ? "…" : `Confirm ${mode}`}
                </button>
                <button type="button" onClick={() => { setMode(null); setReason(""); setError(null); }} className="rounded border px-2 py-1 text-xs text-muted-foreground">Back</button>
              </div>
            </div>
          ) : (
            <div className="py-1">
              {stopped ? (
                caps.reactivate && (
                  <button type="button" disabled={busy} onClick={() => void run("state", { action: "reactivate" })} className={item}>↻ Reactivate</button>
                )
              ) : (
                <>
                  {caps.advance && <button type="button" disabled={busy} onClick={() => void run("advance", {})} className={item}>▸ Advance stage</button>}
                  {caps.park && <button type="button" disabled={busy} onClick={() => setMode("park")} className={item}>⏸ Park…</button>}
                  {caps.kill && <button type="button" disabled={busy} onClick={() => setMode("kill")} className={`${item} text-destructive`}>✕ Kill…</button>}
                </>
              )}
            </div>
          )}
          {error && <p className="border-t px-3 py-1.5 text-[11px] text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
