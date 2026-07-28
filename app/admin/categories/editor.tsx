"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CategoryKind } from "@/lib/category-store";

/**
 * Admin editor for a selectable category (plants, domains). Add / remove values and
 * save; reset returns to the built-in seed. Every write is server-enforced (admin
 * only) and refusals surface inline. Read-only when no durable backend is configured.
 */
export function CategoryEditor({
  kind,
  label,
  initial,
  editable,
}: {
  kind: CategoryKind;
  label: string;
  initial: string[];
  editable: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const working = busy || pending;
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  function add() {
    const v = draft.trim();
    if (v === "") return;
    if (values.some((x) => x.toLowerCase() === v.toLowerCase())) { setDraft(""); return; }
    setValues((prev) => [...prev, v]);
    setDraft("");
    setSaved(false);
  }
  function remove(v: string) {
    setValues((prev) => prev.filter((x) => x !== v));
    setSaved(false);
  }

  async function send(body: unknown): Promise<void> {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; values?: string[] };
      if (!res.ok || !data.ok) { setError(data.error ?? `Save failed (${res.status}).`); setBusy(false); return; }
      if (data.values) setValues(data.values);
      setSaved(true);
      setBusy(false);
      startTransition(() => router.refresh());
    } catch {
      setError("Network error — nothing was saved.");
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{label}</h2>
        <span className="text-xs text-muted-foreground">{values.length} value{values.length === 1 ? "" : "s"}</span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <li key={v} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm">
            <span>{v}</span>
            {editable && (
              <button
                type="button"
                onClick={() => remove(v)}
                disabled={working}
                className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                aria-label={`Remove ${v}`}
              >
                ✕
              </button>
            )}
          </li>
        ))}
        {values.length === 0 && <li className="text-sm text-muted-foreground">None.</li>}
      </ul>

      {editable ? (
        <>
          <div className="mt-3 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
              placeholder={`Add a ${kind}…`}
              disabled={working}
              className="w-56 rounded-md border bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            <button type="button" onClick={add} disabled={working || draft.trim() === ""} className="rounded-md border px-3 py-1.5 text-sm font-medium hover:border-foreground/40 disabled:opacity-50">
              Add
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void send({ kind, values })}
              disabled={working || !dirty}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => void send({ kind, action: "reset" })}
              disabled={working}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Reset to defaults
            </button>
            {saved && !dirty && <span className="text-xs text-ok">Saved.</span>}
            {dirty && <span className="text-xs text-muted-foreground">Unsaved changes.</span>}
          </div>
        </>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Read-only — set <span className="font-mono">KV_REST_API_URL</span> / <span className="font-mono">KV_REST_API_TOKEN</span> to manage these values.
        </p>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </section>
  );
}
