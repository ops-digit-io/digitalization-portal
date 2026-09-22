"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Approve / reject for one proposal.
 *
 * A rejection asks for its reason before it will send — the server refuses one
 * without it, and a form that lets you press the button and then fails is a
 * worse way to learn that. Approving is one press: the proposal already states
 * what it would do, and making the reader retype a confirmation would only
 * teach them to stop reading it.
 */
export function DecideActions({ id, canDecide }: { id: string; canDecide: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!canDecide) {
    return (
      <p className="text-xs text-muted-foreground">
        You can see this, but deciding it needs the action&rsquo;s own capability.
      </p>
    );
  }

  async function send(decision: "approve" | "reject") {
    setBusy(decision);
    setError(null);
    try {
      const res = await fetch(`/api/approvals/${id}/decide`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, ...(decision === "reject" ? { reason } : {}) }),
      });
      const body = (await res.json()) as { error?: string; proposal?: { status: string; error?: string } };
      if (!res.ok) {
        setError(body.error ?? "The decision was refused.");
        return;
      }
      if (body.proposal?.status === "failed") {
        setError(`Approved, but the action failed: ${body.proposal.error ?? "unknown error"}`);
      }
      setRejecting(false);
      setReason("");
      router.refresh();
    } catch {
      setError("Could not reach the portal.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void send("approve")}
          disabled={busy !== null}
          className="rounded-md border border-ok/40 bg-ok/10 px-3 py-1.5 text-sm font-medium text-ok hover:bg-ok/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {busy === "approve" ? "Running…" : "Approve & run"}
        </button>
        <button
          type="button"
          onClick={() => setRejecting((v) => !v)}
          disabled={busy !== null}
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          aria-expanded={rejecting}
        >
          Reject
        </button>
      </div>

      {rejecting && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`reason-${id}`} className="text-xs text-muted-foreground">
            Why not? This is what the lane&rsquo;s owner learns from.
          </label>
          <textarea
            id={`reason-${id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div>
            <button
              type="button"
              onClick={() => void send("reject")}
              disabled={busy !== null || reason.trim() === ""}
              className="rounded-md border border-warn/40 bg-warn/10 px-3 py-1.5 text-sm font-medium text-warn hover:bg-warn/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {busy === "reject" ? "Recording…" : "Reject with this reason"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-warn">{error}</p>}
    </div>
  );
}
