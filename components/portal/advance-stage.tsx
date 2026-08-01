"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/providers";

/**
 * The funnel's stage-movement control. Records a gate passage and advances the
 * demand to the next stage, writing to `du-demands`. It never merges a pull
 * request — it persists a human decision to the intake funnel the portal owns.
 *
 * Enforcement is server-side (`/api/demands/[id]/advance` → `canOpenGate` +
 * `can`); when the server refuses, the reason is shown here — the same reason the
 * API returns, so the UI never disagrees with enforcement.
 */
export function AdvanceStage({
  id,
  from,
  to,
  gate,
  gateLabel,
  permitted,
  reason,
}: {
  id: string;
  from: string;
  /** Next stage, or undefined at S8 (nothing to advance to). */
  to?: string;
  gate?: string;
  gateLabel?: string;
  permitted: boolean;
  reason?: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function advance() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/demands/${encodeURIComponent(id)}/advance`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? `${t("advance.couldNotAdvance", "Could not advance")} (${res.status}).`);
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError(t("errors.networkNotSaved", "Network error — the change was not saved."));
    } finally {
      setBusy(false);
    }
  }

  const working = busy || pending;

  return (
    <div className="rounded-lg border p-4">
      <h2 className="mb-1 text-sm font-semibold">{t("advance.heading", "Stage progression")}</h2>
      {to ? (
        <>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{from}</span> → <span className="font-mono">{to}</span>
            {gate && <> · {t("advance.passes", "passes")} <span className="font-medium text-foreground">{gate}{gateLabel ? ` ${gateLabel}` : ""}</span></>}
          </p>
          {permitted ? (
            <button
              type="button"
              onClick={advance}
              disabled={working}
              className="mt-3 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {working ? t("advance.advancing", "Advancing…") : `${t("advance.advanceTo", "Advance to")} ${to} →`}
            </button>
          ) : (
            <div className="mt-3 rounded-md border border-warn/40 bg-warn/5 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-warn">{t("advance.cannotYet", "Cannot advance yet.")} </span>
              {reason}
            </div>
          )}
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            {t("advance.recordsPrefix", "Records the gate passage in")} <span className="font-mono">du-demands</span>{t("advance.recordsSuffix", ". Governed gates for use-case repos remain a human merge under CODEOWNERS.")}
          </p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">{t("advance.finalStage", "This demand is at the final stage.")}</p>
      )}
      {error && <div className="mt-2 text-xs text-destructive">{error}</div>}
    </div>
  );
}
