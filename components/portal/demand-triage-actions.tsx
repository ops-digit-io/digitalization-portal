"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LANES, type Lane } from "@/lib/types";
import { LANE_LABEL } from "@/components/portal/badges";

/**
 * Triage controls on the demand's own page — move/assign the lane, and park with a
 * required reason. Both POST `/api/demands/[id]/triage` and are server-enforced
 * (`assign_lane` / `park`); the buttons shown are the ones the session may use, and
 * any refusal surfaces inline. Advancing a stage and kill/reactivate live on their
 * own affordances — this completes the page as the management surface (move + park).
 */
export function DemandTriageActions({
  id,
  lane,
  status,
  canAssignLane,
  canPark,
}: {
  id: string;
  lane?: string;
  status?: string;
  canAssignLane: boolean;
  canPark: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<string>(lane ?? "");
  const [parking, setParking] = useState(false);
  const [reason, setReason] = useState("");

  const working = busy || pending;
  const stopped = status === "parked" || status === "killed" || status === "retired";

  async function post(body: unknown): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/demands/${encodeURIComponent(id)}/triage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) { setError(data.error ?? `Request failed (${res.status}).`); setBusy(false); return false; }
      setBusy(false);
      startTransition(() => router.refresh());
      return true;
    } catch {
      setError("Network error — nothing was saved.");
      setBusy(false);
      return false;
    }
  }

  async function park() {
    if (reason.trim() === "") { setError("Parking needs a reason."); return; }
    const ok = await post({ action: "reject", reason });
    if (ok) { setParking(false); setReason(""); }
  }

  const showLane = canAssignLane && !stopped;
  const showPark = canPark && !stopped;
  if (!showLane && !showPark) return null;

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">Triage</h2>
      <div className="space-y-3">
        {showLane && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Lane</label>
            <div className="flex gap-1.5">
              <select
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
                disabled={working}
                className="min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="" disabled>Choose a lane…</option>
                {LANES.map((l: Lane) => (
                  <option key={l} value={l}>{LANE_LABEL[l]}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => choice && choice !== lane && void post({ action: "assign_lane", lane: choice })}
                disabled={working || !choice || choice === lane}
                className="rounded-md border px-2.5 py-1 text-xs font-medium hover:border-foreground/40 disabled:opacity-50"
              >
                {busy ? "…" : lane ? "Move" : "Set"}
              </button>
            </div>
          </div>
        )}

        {showPark && (
          parking ? (
            <div className="space-y-1.5">
              <input
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void park(); }}
                placeholder="Reason (required)"
                className="w-full rounded-md border bg-transparent px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={park}
                  disabled={working || reason.trim() === ""}
                  className="rounded-md bg-warn px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  {busy ? "Parking…" : "Confirm park"}
                </button>
                <button
                  type="button"
                  onClick={() => { setParking(false); setReason(""); setError(null); }}
                  disabled={working}
                  className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setParking(true)}
              disabled={working}
              className="w-full rounded-md border px-3 py-2 text-xs font-medium text-muted-foreground hover:border-warn/40 hover:text-warn disabled:opacity-50"
            >
              ⏸ Park demand
            </button>
          )
        )}
      </div>
      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
