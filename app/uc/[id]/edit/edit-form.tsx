"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { INTAKE_FIELDS, FIELD_GROUPS, PLANTS, DOMAINS, type DemandAnswers } from "@/lib/demand";

/**
 * In-portal demand editor — the same field set the intake captures, prefilled from
 * the demand's markdown. Saving PATCHes `/api/demands/[id]/edit`, which rewrites
 * only the prose/title/plant/people sections and leaves Stage/Gates/History intact
 * (see `lib/demand-edit.ts`). The two named owners (Sponsor / Value owner) edit
 * here too, since they live in the same People table. Refusals surface inline.
 */

export interface EditFormValues extends DemandAnswers {
  sponsor: string;
  value_owner: string;
}

const OPTIONS: Record<string, readonly string[]> = { plant: PLANTS, domain: DOMAINS };

export function EditForm({ id, initial }: { id: string; initial: EditFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<EditFormValues>(initial);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof EditFormValues>(key: K, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  // Only send fields that actually changed — the route records exactly what moved.
  function diff(): Partial<EditFormValues> {
    const out: Record<string, string> = {};
    for (const k of Object.keys(values) as (keyof EditFormValues)[]) {
      if (values[k] !== initial[k]) out[k] = values[k];
    }
    return out;
  }

  async function save() {
    const patch = diff();
    if (Object.keys(patch).length === 0) {
      setError("Nothing changed yet.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/demands/${encodeURIComponent(id)}/edit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patch }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? `Save failed (${res.status}).`);
        setBusy(false);
        return;
      }
      startTransition(() => {
        router.push(`/uc/${encodeURIComponent(id)}`);
        router.refresh();
      });
    } catch {
      setError("Network error — nothing was saved.");
      setBusy(false);
    }
  }

  const working = busy || pending;

  return (
    <div className="space-y-6">
      {FIELD_GROUPS.map((group) => (
        <fieldset key={group} className="space-y-4 rounded-lg border p-4">
          <legend className="px-1 text-sm font-semibold">{group}</legend>
          {INTAKE_FIELDS.filter((f) => f.group === group).map((f) => {
            const value = values[f.key as keyof EditFormValues] ?? "";
            return (
              <label key={f.key} className="block">
                <span className="text-sm font-medium">
                  {f.label}
                  {f.required && <span className="ml-1 text-destructive" aria-hidden>*</span>}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{f.hint}</span>
                {f.input === "textarea" ? (
                  <textarea
                    value={value}
                    onChange={(e) => set(f.key as keyof EditFormValues, e.target.value)}
                    rows={4}
                    disabled={working}
                    className="mt-1.5 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  />
                ) : f.input === "select" ? (
                  <select
                    value={value}
                    onChange={(e) => set(f.key as keyof EditFormValues, e.target.value)}
                    disabled={working}
                    className="mt-1.5 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  >
                    {!f.required && <option value="">—</option>}
                    {(OPTIONS[f.key] ?? []).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={value}
                    onChange={(e) => set(f.key as keyof EditFormValues, e.target.value)}
                    disabled={working}
                    className="mt-1.5 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  />
                )}
              </label>
            );
          })}
        </fieldset>
      ))}

      <fieldset className="space-y-4 rounded-lg border p-4">
        <legend className="px-1 text-sm font-semibold">Owners</legend>
        <p className="text-xs text-muted-foreground">
          Named accountable people. These don&apos;t change the demand&apos;s stage or gates.
        </p>
        <label className="block">
          <span className="text-sm font-medium">Sponsor</span>
          <input
            value={values.sponsor}
            onChange={(e) => set("sponsor", e.target.value)}
            disabled={working}
            placeholder="Name or e-mail"
            className="mt-1.5 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Value owner</span>
          <input
            value={values.value_owner}
            onChange={(e) => set("value_owner", e.target.value)}
            disabled={working}
            placeholder="Name or e-mail"
            className="mt-1.5 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
        </label>
      </fieldset>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={working}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {working ? "Saving…" : "Save changes"}
        </button>
        <Link
          href={`/uc/${encodeURIComponent(id)}`}
          className="rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
