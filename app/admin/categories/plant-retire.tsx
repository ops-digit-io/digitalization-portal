"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/providers";

/**
 * Guided "reassign & retire" — the way to remove a plant that demands still use.
 * Pick the plant to retire and where its demands should go; the server moves every
 * demand from → to (section-surgical, with a history line each) and then retires the
 * old plant from the list. Turns a hard block into a one-click migration.
 */
export function PlantRetire({
  usage,
  allPlants,
  editable,
}: {
  usage: { plant: string; count: number }[];
  allPlants: string[];
  editable: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [from, setFrom] = useState(usage[0]?.plant ?? "");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (usage.length === 0) return null;
  const working = busy || pending;
  const count = usage.find((u) => u.plant === from)?.count ?? 0;
  const targets = allPlants.filter((p) => p.toLowerCase() !== from.toLowerCase());
  const ready = from !== "" && to !== "" && from.toLowerCase() !== to.toLowerCase();

  async function run() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reassign_plant", from, to }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; reassigned?: number };
      if (!res.ok || !data.ok) { setError(data.error ?? `${t("pr.failed", "Failed")} (${res.status}).`); setBusy(false); return; }
      setDone(`${t("pr.reassigned", "Reassigned")} ${data.reassigned ?? 0} ${t("pr.demandsFrom", "demand(s) from")} ${from} ${t("pr.to", "to")} ${to} ${t("pr.andRetired", "and retired")} ${from}.`);
      setBusy(false);
      startTransition(() => router.refresh());
    } catch {
      setError(t("pr.networkError", "Network error — nothing was changed."));
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border p-4">
      <h2 className="text-sm font-semibold">{t("pr.title", "Retire a plant")}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {t("pr.note", "A plant in use can't be removed directly. Move its demands to another plant, then it retires automatically.")}
      </p>

      {!editable ? (
        <p className="mt-3 text-xs text-muted-foreground">{t("pr.readonly", "Read-only — set KV to enable editing.")}</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{t("pr.retire", "Retire")}</span>
              <select value={from} onChange={(e) => { setFrom(e.target.value); setDone(null); }} disabled={working} className="rounded-md border bg-transparent px-2 py-1 disabled:opacity-50">
                {usage.map((u) => <option key={u.plant} value={u.plant}>{u.plant} ({u.count})</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-muted-foreground">→ {t("pr.moveTo", "move demands to")}</span>
              <select value={to} onChange={(e) => { setTo(e.target.value); setDone(null); }} disabled={working} className="rounded-md border bg-transparent px-2 py-1 disabled:opacity-50">
                <option value="">{t("pr.select", "Select…")}</option>
                {targets.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={run}
              disabled={working || !ready}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? t("pr.reassigning", "Reassigning…") : `${t("pr.reassign", "Reassign")} ${count} & ${t("pr.retireShort", "retire")}`}
            </button>
          </div>
          {ready && !done && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("pr.moves", "Moves")} {count} {count === 1 ? t("pr.demandUnit", "demand") : t("pr.demandsUnit", "demands")} {t("pr.from", "from")} <span className="font-medium">{from}</span> {t("pr.to", "to")} <span className="font-medium">{to}</span>{t("pr.recordsRetires", ", records a history line on each, then retires")} {from}.
            </p>
          )}
        </>
      )}

      {done && <p className="mt-2 text-xs text-ok">{done}</p>}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </section>
  );
}
