"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/providers";
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
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ladder = authorityLadder();
  const currentLevel = (current as AuthorityLevel) ?? null;
  const currentRank = currentLevel ? ladder.findIndex((p) => p.level === currentLevel) : -1;

  const up = currentLevel ? nextLevel(currentLevel) : ("read-only" as AuthorityLevel);
  const down = currentLevel ? prevLevel(currentLevel) : null;
  const readiness = { agentBriefPresent, agentBriefScore };
  const raiseGate = up ? canRaiseTo(up, readiness) : { ok: false as const };

  async function post(payload: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
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

  const setLevel = (level: AuthorityLevel) => post({ action: "set-authority", slug, lane, level });
  const draftBrief = () => post({ action: "draft-brief", slug, lane });

  // Resolve a rung's translated label/summary/human, falling back to the English policy.
  const rLabel = (lvl: AuthorityLevel) => t(`autonomy.${lvl}.label`, authorityPolicy(lvl).label);
  const rSummary = (lvl: AuthorityLevel) => t(`autonomy.${lvl}.summary`, authorityPolicy(lvl).summary);
  const rHuman = (lvl: AuthorityLevel) => t(`autonomy.${lvl}.human`, authorityPolicy(lvl).human);

  const currentPolicy = currentLevel ? authorityPolicy(currentLevel) : null;
  const upLabel = up ? rLabel(up) : "";
  const downLabel = down ? rLabel(down) : "";

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t("autonomy.heading", "Autonomy")}</h3>
        <span className="text-xs text-muted-foreground">{t("autonomy.briefLabel", "agent brief")} {agentBriefScore}% {t("autonomy.complete", "complete")}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("autonomy.intro", "How far this lane’s AI agent may act on its own — and where you stay in control.")}
      </p>

      {/* Plain "you are here" callout. */}
      <div className="mt-3 rounded-md border bg-secondary/20 p-2.5">
        {currentPolicy && currentLevel ? (
          <div className="flex items-start gap-2">
            <span className={`mt-1 inline-block size-2.5 shrink-0 rounded-full ${RUNG_TONE[currentPolicy.tone].dot}`} aria-hidden />
            <div>
              <div className="text-sm font-semibold">{t("autonomy.current", "Current:")} {rLabel(currentLevel)}</div>
              <p className="text-xs text-muted-foreground">{rSummary(currentLevel)}</p>
              <p className="text-xs text-foreground/70"><span className="font-medium">{t("autonomy.you", "You:")}</span> {rHuman(currentLevel)}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-amber-600">{t("autonomy.none", "No autonomy level set yet — this lane’s agent does nothing until you set one.")}</p>
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
                    {p.rank}. {rLabel(p.level)}
                  </span>
                  {p.acts && (
                    <span className={`rounded px-1 text-[10px] ${RUNG_TONE[p.tone].badge}`}>
                      {p.requiresApproval ? t("autonomy.actsApproval", "acts, with your approval") : t("autonomy.actsOwn", "acts on its own")}
                    </span>
                  )}
                  {isCurrent && <span className="text-[10px] font-medium text-primary">{t("autonomy.currentTag", "← current")}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{rSummary(p.level)}</p>
                <p className="text-xs text-foreground/60"><span className="font-medium">{t("autonomy.you", "You:")}</span> {rHuman(p.level)}</p>
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
              title={up ? (raiseGate.ok ? `${t("autonomy.raiseTo", "▲ Raise to")} ${upLabel}` : raiseGate.reason) : t("autonomy.atTop", "Already at the top rung")}
              className="rounded-md border bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              {up ? `${t("autonomy.raiseTo", "▲ Raise to")} ${upLabel}` : t("autonomy.raise", "▲ Raise")}
            </button>
            <button
              onClick={() => down && setLevel(down)}
              disabled={busy || !down}
              className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              {down ? `${t("autonomy.lowerTo", "▼ Lower to")} ${downLabel}` : t("autonomy.lower", "▼ Lower")}
            </button>
            <button
              onClick={draftBrief}
              disabled={busy}
              title={t("autonomy.draftBriefTip", "Fill the agent brief’s scope, guardrails and escalation from this lane’s playbook and skills. Leaves the owner and level for you.")}
              className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              {t("autonomy.draftBrief", "✎ Draft brief from lane pack")}
            </button>
          </div>
          {up && !raiseGate.ok && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              <span className="font-medium">{t("autonomy.toReach", "To reach")} {upLabel}:</span> {raiseGate.reason}
            </p>
          )}
          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t("autonomy.guidance", "Raising autonomy edits this lane’s agent brief. Move one rung at a time; the acting rungs need a complete brief first.")}
          </p>
        </div>
      )}
    </div>
  );
}
