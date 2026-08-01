"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/providers";

/**
 * Lifecycle status controls beyond the gate flow — Kill (with a required reason) and
 * Reactivate. Both POST `/api/demands/[id]/state` and are server-enforced (`kill` /
 * `park` capabilities); the buttons shown here are the ones the session may use, and
 * any refusal surfaces inline. Advancing/parking stay on their own affordances — this
 * is only stop/restart.
 */
export function DemandStatusActions({
  id,
  status,
  canKill,
  canReactivate,
}: {
  id: string;
  status?: string;
  canKill: boolean;
  canReactivate: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [killing, setKilling] = useState(false);
  const [reason, setReason] = useState("");

  const working = busy || pending;
  const stopped = status === "killed" || status === "parked" || status === "retired";

  async function post(body: unknown): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/demands/${encodeURIComponent(id)}/state`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) { setError(data.error ?? `${t("errors.requestFailed", "Request failed")} (${res.status}).`); setBusy(false); return false; }
      setBusy(false);
      startTransition(() => router.refresh());
      return true;
    } catch {
      setError(t("errors.networkNothingSaved", "Network error — nothing was saved."));
      setBusy(false);
      return false;
    }
  }

  async function kill() {
    if (reason.trim() === "") { setError(t("demandStatus.killNeedsReason", "A kill needs a reason.")); return; }
    const ok = await post({ action: "kill", reason });
    if (ok) { setKilling(false); setReason(""); }
  }

  const showKill = canKill && !stopped;
  const showReactivate = canReactivate && stopped;
  if (!showKill && !showReactivate) return null;

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">{t("demandStatus.heading", "Status")}</h2>
      {stopped && (
        <p className="mb-2 text-xs text-muted-foreground">
          {t("demandStatus.isPrefix", "This demand is")} <span className="font-medium text-foreground">{status}</span>.
        </p>
      )}

      <div className="space-y-2">
        {showReactivate && (
          <button
            type="button"
            onClick={() => void post({ action: "reactivate" })}
            disabled={working}
            className="w-full rounded-md border px-3 py-2 text-xs font-medium hover:border-foreground/40 disabled:opacity-50"
          >
            {busy ? t("demand.working", "Working…") : `↻ ${t("demand.reactivate", "Reactivate")}`}
          </button>
        )}

        {showKill && (
          killing ? (
            <div className="space-y-1.5">
              <input
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void kill(); }}
                placeholder={t("demand.reasonRequired", "Reason (required)")}
                className="w-full rounded-md border bg-transparent px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={kill}
                  disabled={working || reason.trim() === ""}
                  className="rounded-md bg-destructive px-2.5 py-1 text-xs font-medium text-destructive-foreground disabled:opacity-50"
                >
                  {busy ? t("demand.killing", "Killing…") : t("demand.confirmKill", "Confirm kill")}
                </button>
                <button
                  type="button"
                  onClick={() => { setKilling(false); setReason(""); setError(null); }}
                  disabled={working}
                  className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {t("common.cancel", "Cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setKilling(true)}
              disabled={working}
              className="w-full rounded-md border px-3 py-2 text-xs font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
            >
              ✕ {t("demand.killDemand", "Kill demand")}
            </button>
          )
        )}
      </div>

      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
