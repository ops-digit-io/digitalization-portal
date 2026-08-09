"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authorityLadder, nextLevel, prevLevel, canRaiseTo, type AuthorityLevel } from "@/lib/org/autonomy";

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

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Autonomy</h3>
        <span className="text-xs text-muted-foreground">agent brief {agentBriefScore}%</span>
      </div>

      <ol className="mt-3 space-y-1.5">
        {ladder.map((p) => {
          const isCurrent = p.rank === currentRank;
          return (
            <li
              key={p.level}
              className={`flex items-start gap-2 rounded-md border p-2 ${isCurrent ? "border-primary bg-primary/5" : "border-transparent"}`}
            >
              <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${isCurrent ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                {p.rank}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-xs ${isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{p.level}</span>
                  {p.acts && <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">acts</span>}
                  {isCurrent && <span className="text-[10px] text-primary">current</span>}
                </div>
                <p className="text-xs text-muted-foreground">{p.permits}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {canEdit && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => up && setLevel(up)}
              disabled={busy || !up || !raiseGate.ok}
              title={up ? (raiseGate.ok ? `Raise to ${up}` : raiseGate.reason) : "Already at the top rung"}
              className="rounded-md border bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              ▲ Raise{up ? ` to ${up}` : ""}
            </button>
            <button
              onClick={() => down && setLevel(down)}
              disabled={busy || !down}
              className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              ▼ Lower{down ? ` to ${down}` : ""}
            </button>
          </div>
          {up && !raiseGate.ok && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{raiseGate.reason}</p>}
          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
          <p className="mt-2 text-[11px] text-muted-foreground">Raising autonomy edits the agent brief. Move one rung at a time; execute-rungs need a complete brief.</p>
        </div>
      )}
    </div>
  );
}
