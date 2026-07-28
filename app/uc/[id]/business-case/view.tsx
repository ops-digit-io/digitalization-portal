"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Render the business-case markdown. */
export function Md({ body }: { body: string }) {
  return (
    <div className="prose-portal max-w-none text-sm text-foreground/90">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}

/**
 * Draft (or re-draft) the business case, then refresh. Mirrors the requirements
 * AnalyseButton. Server-enforced (`draft`); refusals surface inline.
 */
export function DraftButton({ id, label = "Draft business case", small }: { id: string; label?: string; small?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/business-case", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action: "generate" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setErr(data.error ?? `Draft failed (${res.status}).`); setBusy(false); return; }
      setBusy(false);
      router.refresh();
    } catch {
      setErr("Network error — nothing was saved.");
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={run}
        disabled={busy}
        className={`rounded-md bg-primary font-medium text-primary-foreground disabled:opacity-50 ${small ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm"}`}
      >
        {busy ? "Drafting…" : label}
      </button>
      {err && <span className="text-xs text-destructive">{err}</span>}
    </span>
  );
}

/**
 * Quantify a drafted business case: the human enters the annual gross value (and,
 * optionally, build/run cost) and confirms the baseline, then the simulation below
 * lights up. Server-enforced (`draft`); the drafter never invents these figures, so
 * this editor is where they come from. Empty annual gross clears it back to
 * "to be quantified".
 */
export function ValueEditor({
  id,
  annualGross,
  baselineVerified,
}: {
  id: string;
  annualGross?: number;
  baselineVerified: boolean;
}) {
  const router = useRouter();
  const [gross, setGross] = useState(annualGross !== undefined ? String(annualGross) : "");
  const [build, setBuild] = useState("");
  const [run, setRun] = useState("");
  const [verified, setVerified] = useState(baselineVerified);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function save() {
    setBusy(true);
    setErr(null);
    setOk(false);
    const trimmed = gross.trim();
    const parsed = trimmed === "" ? null : Number(trimmed.replace(/[,\s€]/g, ""));
    if (parsed !== null && !Number.isFinite(parsed)) {
      setErr("Annual gross must be a number.");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/business-case", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          action: "set-value",
          annualGross: parsed,
          baselineVerified: verified,
          ...(build.trim() !== "" ? { buildEstimate: build } : {}),
          ...(run.trim() !== "" ? { annualRunEstimate: run } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setErr(data.error ?? `Save failed (${res.status}).`); setBusy(false); return; }
      setBusy(false);
      setOk(true);
      router.refresh();
    } catch {
      setErr("Network error — nothing was saved.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed p-4">
      <p className="text-sm font-semibold">Quantify the value</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        The draft never invents a figure. Enter the annual gross value once you have a baseline — the analysis below updates.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-muted-foreground">
          Annual gross (EUR)
          <input
            inputMode="numeric"
            value={gross}
            onChange={(e) => setGross(e.target.value)}
            placeholder="e.g. 250000"
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Build estimate (optional)
          <input
            value={build}
            onChange={(e) => setBuild(e.target.value)}
            placeholder="e.g. EUR 80,000 one-off"
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Annual run estimate (optional)
          <input
            value={run}
            onChange={(e) => setRun(e.target.value)}
            placeholder="e.g. EUR 20,000 / yr"
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="h-3.5 w-3.5" />
          Baseline verified (measured, not estimated)
        </label>
        <span className="inline-flex items-center gap-2">
          {err && <span className="text-xs text-destructive">{err}</span>}
          {ok && !err && <span className="text-xs text-muted-foreground">Saved.</span>}
          <button
            onClick={save}
            disabled={busy}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save value"}
          </button>
        </span>
      </div>
    </div>
  );
}
