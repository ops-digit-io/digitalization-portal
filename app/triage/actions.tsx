"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LANES } from "@/lib/types";
import { useI18n } from "@/components/providers";

/**
 * Triage row actions — the three triage acts, all server-enforced:
 *   - Accept: records the stage's exit-gate passage (G1 for S1, G2 for S2) via
 *     `/api/demands/[id]/advance` (`canOpenGate` + `can`);
 *   - Assign lane: confirms/overrides the lane via `/api/demands/[id]/triage`
 *     (`assign_lane`);
 *   - Reject: parks the demand with a REQUIRED reason and reroutes to backlog
 *     (`park`) — never a silent closure.
 * Refused reasons are shown inline, so the UI never disagrees with enforcement.
 */

const LANE_LABEL: Record<string, string> = {
  run: "run", regulatory: "regulatory", continuous_improvement: "continuous improvement",
  transform: "transform", innovation: "innovation", data_ai: "data / AI", local: "local",
};

export function TriageActions({
  id,
  gate,
  gateLabel,
  currentLane,
}: {
  id: string;
  gate?: string;
  gateLabel?: string;
  currentLane?: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState<null | "accept" | "lane" | "reject">(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const working = busy !== null || pending;

  async function post(url: string, body?: unknown): Promise<boolean> {
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? `${t("error.requestFailed", "Request failed")} (${res.status}).`);
        return false;
      }
      startTransition(() => router.refresh());
      return true;
    } catch {
      setError(t("error.network", "Network error — nothing was saved."));
      return false;
    }
  }

  async function accept() {
    if (!gate) return;
    setBusy("accept");
    await post(`/api/demands/${encodeURIComponent(id)}/advance`);
    setBusy(null);
  }

  async function assignLane(lane: string) {
    if (!lane || lane === currentLane) return;
    setBusy("lane");
    await post(`/api/demands/${encodeURIComponent(id)}/triage`, { action: "assign_lane", lane });
    setBusy(null);
  }

  async function reject() {
    if (reason.trim() === "") { setError(t("triage.act.reasonRequired", "A rejection needs a reason.")); return; }
    setBusy("reject");
    const ok = await post(`/api/demands/${encodeURIComponent(id)}/triage`, { action: "reject", reason });
    setBusy(null);
    if (ok) { setRejecting(false); setReason(""); }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs">
        <button
          type="button"
          onClick={accept}
          disabled={working || !gate}
          className="rounded-md bg-primary px-2.5 py-1 font-medium text-primary-foreground disabled:opacity-50"
          title={gate ? `${t("triage.act.passTitle", "Pass")} ${gate}${gateLabel ? ` — ${gateLabel}` : ""}` : undefined}
        >
          {busy === "accept" ? t("triage.act.accepting", "Accepting…") : gate ? `${t("triage.act.accept", "Accept")} ${gate} →` : t("triage.act.accept", "Accept")}
        </button>

        <select
          aria-label={t("triage.act.assignLane", "Assign lane")}
          value={currentLane ?? ""}
          disabled={working}
          onChange={(e) => void assignLane(e.target.value)}
          className="rounded-md border bg-transparent px-2 py-1 text-muted-foreground disabled:opacity-50"
          title={t("triage.act.laneTitle", "Confirm or override the lane")}
        >
          <option value="" disabled>{busy === "lane" ? t("triage.act.assigning", "Assigning…") : t("triage.act.assignLanePlaceholder", "Assign lane…")}</option>
          {LANES.map((l) => (
            <option key={l} value={l}>{t(`lane.${l}`, LANE_LABEL[l] ?? l)}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setRejecting((v) => !v)}
          disabled={working}
          className="rounded-md border px-2.5 py-1 text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
        >
          {t("triage.act.reject", "Reject")}
        </button>
      </div>

      {rejecting && (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void reject(); }}
            placeholder={t("triage.act.reasonPlaceholder", "Reason (required) — reroutes to backlog")}
            className="w-64 rounded-md border bg-transparent px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            onClick={reject}
            disabled={working || reason.trim() === ""}
            className="rounded-md bg-destructive px-2.5 py-1 text-xs font-medium text-destructive-foreground disabled:opacity-50"
          >
            {busy === "reject" ? t("triage.act.rejecting", "Rejecting…") : t("common.confirm", "Confirm")}
          </button>
        </div>
      )}

      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </div>
  );
}
