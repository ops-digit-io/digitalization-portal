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
