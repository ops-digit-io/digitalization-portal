"use client";

import { useState } from "react";

/**
 * Ask the analyst a question SCOPED to this lane. The lane's autonomy rung is sent
 * with the request, so the agent is offered only the tools that rung permits — a
 * read-only lane gets no acting tools. The offered/withheld list is shown so the
 * narrowing is visible, not hidden: this is the autonomy ladder made operational.
 */
export function LaneAgentAsk({ dept, lane, authority }: { dept: string; lane: string; authority: string | null }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    text: string;
    trace?: { toolsOffered?: string[]; toolsWithheld?: { name: string; reason: string }[] };
  } | null>(null);

  async function ask() {
    if (busy || !q.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: "chat", message: q.trim(), dept, lane }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        text?: string;
        error?: string;
        trace?: { toolsOffered?: string[]; toolsWithheld?: { name: string; reason: string }[] };
      };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult({ text: data.text ?? "", trace: data.trace });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const withheld = result?.trace?.toolsWithheld ?? [];
  const offered = result?.trace?.toolsOffered ?? [];

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Ask the agent for this lane</h3>
        <span className="text-xs text-muted-foreground">
          {authority ? `scoped to autonomy: ${authority}` : "no autonomy set — acting tools withheld"}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        The agent runs under this lane&apos;s autonomy rung: only the tools that rung permits are offered.
      </p>
      <textarea
        value={q}
        onChange={(e) => setQ(e.target.value)}
        rows={2}
        placeholder="e.g. What would a PoC for this lane involve?"
        className="mt-2 w-full rounded-md border bg-background p-2 text-sm"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={ask}
          disabled={busy || !q.trim()}
          className="rounded-md border bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Asking…" : "Ask"}
        </button>
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </div>

      {result && (
        <div className="mt-3 border-t pt-3">
          <p className="whitespace-pre-wrap text-sm">{result.text}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>tools offered: {offered.length ? offered.join(", ") : "none"}</span>
            {withheld.length > 0 && (
              <span>
                withheld: {withheld.map((w) => `${w.name} (${w.reason})`).join("; ")}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
