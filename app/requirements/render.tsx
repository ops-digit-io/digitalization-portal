"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { mdComponents } from "@/components/portal/md-components";

/** Render standardized requirement/analysis markdown. */
export function Md({ body }: { body: string }) {
  return (
    <div className="prose-portal max-w-none text-sm text-foreground/90">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{body}</ReactMarkdown>
    </div>
  );
}

async function analyse(id: string): Promise<string | null> {
  const res = await fetch("/api/requirements", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, action: "generate" }),
  });
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    return d.error ?? "Analysis failed.";
  }
  return null;
}

/** Analyse one case and refresh. */
export function AnalyseButton({ id, label = "Analyse", small }: { id: string; label?: string; small?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run() {
    setBusy(true);
    setErr(null);
    const e = await analyse(id);
    setBusy(false);
    if (e) setErr(e);
    else router.refresh();
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={run}
        disabled={busy}
        className={`rounded-md bg-primary font-medium text-primary-foreground disabled:opacity-50 ${small ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm"}`}
      >
        {busy ? "Analysing…" : label}
      </button>
      {err && <span className="text-xs text-destructive">{err}</span>}
    </span>
  );
}

/** Analyse every listed case, then refresh. */
export function AnalyseAll({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  async function run() {
    setBusy(true);
    setDone(0);
    for (const id of ids) {
      await analyse(id);
      setDone((d) => d + 1);
    }
    setBusy(false);
    router.refresh();
  }
  return (
    <button onClick={run} disabled={busy || ids.length === 0} className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40">
      {busy ? `Analysing ${done}/${ids.length}…` : `Analyse all (${ids.length})`}
    </button>
  );
}
