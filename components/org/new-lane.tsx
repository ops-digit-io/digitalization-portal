"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/providers";

/** Create a lane in a department — POSTs to /api/org and opens the new lane. */
export function NewLane({ deptSlug }: { deptSlug: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create-lane", slug: deptSlug, name: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as { slug?: string; error?: string };
      if (!res.ok || !data.slug) throw new Error(data.error || `HTTP ${res.status}`);
      router.push(`/org/${deptSlug}/${data.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-secondary/40">
        {t("org.newLane")}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={t("org.laneNamePlaceholder")}
          className="h-8 w-48 rounded-md border bg-background px-2.5 text-sm"
        />
        <button
          onClick={submit}
          disabled={busy || name.trim() === ""}
          className="h-8 rounded-md border bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t("org.creating") : t("org.create")}
        </button>
        <button onClick={() => setOpen(false)} className="h-8 rounded-md border px-3 text-xs text-muted-foreground hover:text-foreground">
          {t("org.cancel")}
        </button>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
