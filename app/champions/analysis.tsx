"use client";

/**
 * The Champions Analyst's results.
 *
 * The panel shows WHAT GOVERNED the run above the results, not buried in a
 * footnote: a reader who cannot see which playbook, skills and contract produced
 * an action has no way to judge it, and a run that lost part of its governance
 * must say so loudly rather than look like a complete answer.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/components/providers";

interface NetworkAction {
  kind: string;
  finding: string;
  approach: string;
  ask: string;
  blocked: string;
  basis: string;
}
interface Governance {
  playbook: string;
  skills: string[];
  contract?: string;
  missing: string[];
  healthy: boolean;
}
interface Analysis {
  actions: NetworkAction[];
  live: boolean;
  /** Why the floor is standing alone — absent when a model refined it. */
  fallback?: string;
  governance: Governance;
  generatedAt: string;
}

const KIND_LABEL: Record<string, string> = {
  uncovered: "nobody at all",
  "no-decider": "can carry, cannot decide",
  "single-point": "single point",
  capacity: "capacity conflict",
  "hub-carrying": "hub doing local work",
  "register-thin": "the register, not the organisation",
};

const KIND_TONE: Record<string, string> = {
  uncovered: "border-destructive/40 bg-destructive/10 text-[hsl(var(--destructive))]",
  "no-decider": "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-500",
  "single-point": "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-500",
  capacity: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-500",
  "hub-carrying": "border-border text-muted-foreground",
  "register-thin": "border-border text-muted-foreground",
};

export function ChampionsAnalysis() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/champions/analyse", { method: "POST", credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as Analysis & { error?: string };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-5">
      <h2 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">{t("championAnalysis.title", "Network analysis")}</h2>

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <Button size="sm" disabled={busy} onClick={run}>{busy ? "…" : result ? t("championAnalysis.runAgain", "Run again") : t("championAnalysis.analyse", "Analyse the network")}</Button>
        {result && (
          <span className="text-xs text-muted-foreground">
            {/* "no model key" and "your key was rejected" produce identical
                actions and call for opposite responses — so say which. */}
            {result.live ? t("championAnalysis.modelRefined", "model-refined") : `${t("championAnalysis.ruleBased", "rule-based")} — ${result.fallback ?? t("championAnalysis.noModelKey", "no model key")}`} · {String(result.generatedAt).slice(0, 16).replace("T", " ")}
          </span>
        )}
        {err && <span className="text-xs text-destructive">{err}</span>}
      </div>

      {result && (
        <>
          {/* What produced this. Above the results, because it is how you judge them. */}
          <Card className={`mb-2 p-3 ${result.governance.healthy ? "" : "border-destructive/40 bg-destructive/5"}`}>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">{t("championAnalysis.governedBy", "Governed by")}</span>{" "}
              {t("championAnalysis.playbook", "playbook")} <code className="rounded bg-secondary px-1">{result.governance.playbook}</code>
              {result.governance.skills.length > 0 && (
                <> · {t("championAnalysis.skills", "skills")} {result.governance.skills.map((s) => <code key={s} className="mx-0.5 rounded bg-secondary px-1">{s}</code>)}</>
              )}
              {result.governance.contract && (
                <> · {t("championAnalysis.contract", "contract")} <code className="rounded bg-secondary px-1">{result.governance.contract}</code></>
              )}
            </p>
            {!result.governance.healthy && (
              <p className="mt-1 text-[11px] text-destructive">
                {t("championAnalysis.incomplete", "Governance incomplete")}{result.governance.missing.length ? `: ${result.governance.missing.join(", ")} ${t("championAnalysis.couldNotLoad", "could not be loaded")}` : ""}.
                {" "}{t("championAnalysis.treatPartial", "Treat these results as partial.")}
              </p>
            )}
          </Card>

          {result.actions.length === 0 ? (
            <Card className="p-3 text-sm text-muted-foreground">{t("championAnalysis.noActions", "No actions — the network has no holes the portal can see.")}</Card>
          ) : (
            <div className="space-y-2">
              {result.actions.map((a, i) => (
                <Card key={i} className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${KIND_TONE[a.kind] ?? "border-border text-muted-foreground"}`}>
                      {t(`championAnalysis.kind.${a.kind}`, KIND_LABEL[a.kind] ?? a.kind)}
                    </span>
                    {a.blocked && <span className="text-[11px] text-muted-foreground">{t("championAnalysis.blocks", "blocks")}: {a.blocked}</span>}
                  </div>
                  <p className="mt-1.5 text-sm">{a.finding}</p>
                  <p className="mt-1 text-xs">
                    <span className="font-medium">{t("championAnalysis.approach", "Approach")}:</span> {a.approach}
                  </p>
                  <p className="mt-0.5 text-xs">
                    <span className="font-medium">{t("championAnalysis.askFor", "Ask for")}:</span> {a.ask}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{a.basis}</p>
                </Card>
              ))}
            </div>
          )}
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {t("championAnalysis.footer", "Proposals, not decisions. Nothing here is written to the register — a human makes every appointment.")}
          </p>
        </>
      )}
    </section>
  );
}
