"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface SyncReport {
  host: string;
  added: number;
  updated: number;
  skipped: number;
  items: { type: string; name: string; action: string }[];
}

/**
 * Push the portal's bundled skills & playbooks into the registry repo so every
 * one is present in git and editable here. Adds missing entries only.
 */
export function SyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [report, setReport] = useState<SyncReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/registry/sync", { method: "POST" });
      const data = (await res.json()) as SyncReport & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Sync failed.");
        return;
      }
      setReport(data);
      startTransition(() => router.refresh());
    } catch {
      setError("Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={sync}
        disabled={busy || pending}
        className="rounded-md border px-3 py-2 text-sm font-medium hover:border-foreground/40 disabled:opacity-50"
        title="Push the portal's bundled skills & playbooks into the registry repo (adds missing only)."
      >
        {busy ? "Syncing…" : "Sync bundled → registry"}
      </button>
      {error && <span className="text-[11px] text-destructive">{error}</span>}
      {report && (
        <span className="text-[11px] text-muted-foreground">
          {report.host === "local" ? "Local: registry is the bundle — " : `Wrote to ${report.host}: `}
          {report.added} added, {report.updated} updated, {report.skipped} already present.
        </span>
      )}
    </div>
  );
}
