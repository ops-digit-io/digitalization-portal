"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authorityLadder, authorityPolicy, nextLevel, prevLevel, canRaiseTo, RUNG_TONE, type AuthorityLevel } from "@/lib/org/autonomy";

/**
 * The autonomy ladder for a lane — the five rungs, the current one highlighted, and (for
 * an editor) a governed step up / down. Raising to a rung that acts is blocked until the
 * agent brief is complete: the button disables and says why. Autonomy is earned per lane,
 * one rung at a time — exactly the framework's rule.
 */
export function LaneAutonomy({
  slug,
  lane,
  current,
  agentBriefPresent,
  agentBriefScore,
  canEdit,
}: {
  slug: string;
  lane: string;
  current: string | null;
  agentBriefPresent: boolean;
  agentBriefScore: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ladder = authorityLadder();
  const currentLevel = (current as AuthorityLevel) ?? null;
  const currentRank = currentLevel ? ladder.findIndex((p) => p.level === currentLevel) : -1;

  const up = currentLevel ? nextLevel(currentLevel) : ("read-only" as AuthorityLevel);
  const down = currentLevel ? prevLevel(currentLevel) : null;
  const readiness = { agentBriefPresent, agentBriefScore };
  const raiseGate = up ? canRaiseTo(up, readiness) : { ok: false as const };

  async function setLevel(level: AuthorityLevel) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set-authority", slug, lane, level }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const currentPolicy = currentLevel ? authorityPolicy(currentLevel) : null;
  const upLabel = up ? authorityPolicy(up).label : "";
  const downLabel = down ? authorityPolicy(down).label : "";

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Autonomy</h3>
        <span className="text-xs text-muted-foreground">agent brief {agentBriefScore}% complete</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        How far this lane&apos;s AI agent may act on its own — and where you stay in control.
      </p>

      {/* Plain "you are here" callout. */}
      <div className="mt-3 rounded-md border bg-secondary/20 p-2.5">
        {currentPolicy ? (
          <div className="flex items-start gap-2">
            <span className={`mt-1 inline-block size-2.5 shrink-0 rounded-full ${RUNG_TONE[currentPolicy.tone].dot}`} aria-hidden />
            <div>
              <div className="text-sm font-semibold">Current: {currentPolicy.label}</div>
              <p className="text-xs text-muted-foreground">{currentPolicy.summary}</p>
              <p className="text-xs text-foreground/70"><span className="font-medium">You:</span> {currentPolicy.human}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-amber-600">No autonomy level set yet — this lane&apos;s agent does nothing until you set one.</p>
        )}
      </div>

      {/* The whole ladder, so the current rung is seen in context. */}
      <ol className="mt-3 space-y-1.5">
        {ladder.map((p) => {
          const isCurrent = p.rank === currentRank;
          return (
            <li
              key={p.level}
              className={`flex items-start gap-2.5 rounded-md border p-2 ${isCurrent ? "border-primary bg-primary/5" : "border-transparent"}`}
            >
              <span className={`mt-1 inline-block size-2.5 shrink-0 rounded-full ${RUNG_TONE[p.tone].dot}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className={`text-xs font-semibold ${isCurrent ? "text-foreground" : "text-foreground/80"}`}>
                    {p.rank}. {p.label}
                  </span>
                  {p.acts && (
                    <span className={`rounded px-1 text-[10px] ${RUNG_TONE[p.tone].badge}`}>
                      {p.requiresApproval ? "acts, with your approval" : "acts on its own"}
                    </span>
                  )}
                  {isCurrent && <span className="text-[10px] font-medium text-primary">← current</span>}
                </div>
                <p className="text-xs text-muted-foreground">{p.summary}</p>
                <p className="text-xs text-foreground/60"><span className="font-medium">You:</span> {p.human}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {canEdit && (
        <div className="mt-3 border-t pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => up && setLevel(up)}
              disabled={busy || !up || !raiseGate.ok}
              title={up ? (raiseGate.ok ? `Raise to ${upLabel}` : raiseGate.reason) : "Already at the top rung"}
              className="rounded-md border bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              ▲ Raise{up ? ` to ${upLabel}` : ""}
            </button>
            <button
              onClick={() => down && setLevel(down)}
              disabled={busy || !down}
              className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              ▼ Lower{down ? ` to ${downLabel}` : ""}
            </button>
          </div>
          {up && !raiseGate.ok && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              <span className="font-medium">To reach {upLabel}:</span> {raiseGate.reason}
            </p>
          )}
          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Raising autonomy edits this lane&apos;s agent brief. Move one rung at a time; the acting rungs need a
            complete brief first.
          </p>
        </div>
      )}
    </div>
  );
}
