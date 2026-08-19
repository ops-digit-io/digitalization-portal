"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Remove a tool that was added here.
 *
 * Only offered on portal-added rows: a tool in the shipped register or a system in
 * the plant survey is retired by a lifecycle decision on it, which is a fact about
 * the tool rather than a hole in the record. Two clicks, because the row takes its
 * edits and its risk decisions with it, and because a register people delete from
 * casually is a register nobody trusts.
 */
export function RemoveTool({ node, label }: { node: string; label: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/landscape/tools", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tool: node }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setConfirming(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="text-xs text-muted-foreground hover:text-rose-600" title={`Remove ${label}`}>
        remove
      </button>
    );
  }

  return (
    <span className="inline-flex items-baseline gap-1.5">
      <button onClick={remove} disabled={busy} className="text-xs font-medium text-rose-600 hover:underline disabled:opacity-50">
        {busy ? "removing…" : "really remove"}
      </button>
      <button onClick={() => setConfirming(false)} className="text-xs text-muted-foreground hover:text-foreground">
        keep
      </button>
      {error ? <span className="text-[11px] text-rose-600">{error}</span> : null}
    </span>
  );
}
