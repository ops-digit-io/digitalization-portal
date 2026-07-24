"use client";

import { useState } from "react";
import type { DemandAnswers } from "@/lib/demand";

/** Mirrors lib/agent/intake-enhance EnhancementResult (kept local to avoid bundling server code). */
interface FieldEnhancement {
  key: keyof DemandAnswers;
  label: string;
  original: string;
  enhanced: string;
  changed: boolean;
  gap?: string;
}
interface EnhancementResult {
  fields: FieldEnhancement[];
  openQuestions: string[];
  assessment: { score: "weak" | "adequate" | "strong"; summary: string };
  provider: string;
  live: boolean;
  playbook: string;
}

const SCORE_TONE: Record<string, string> = {
  weak: "text-destructive",
  adequate: "text-warn",
  strong: "text-ok",
};

/**
 * Intake enhancement panel. Asks the model to sharpen the raw answers, then shows
 * each proposed change for the requester to apply — AI drafts, the human decides.
 * Nothing here saves; applying only updates the form's answers.
 */
export function IntakeEnhancer({
  answers,
  onApply,
}: {
  answers: DemandAnswers;
  onApply: (patch: Partial<DemandAnswers>) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnhancementResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    setApplied(new Set());
    try {
      const res = await fetch("/api/intake/enhance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = (await res.json()) as EnhancementResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Enhancement failed.");
        return;
      }
      setResult(data);
    } catch {
      setError("Request failed.");
    } finally {
      setLoading(false);
    }
  }

  function applyField(f: FieldEnhancement) {
    onApply({ [f.key]: f.enhanced } as Partial<DemandAnswers>);
    setApplied((s) => new Set(s).add(f.key));
  }
  function applyAll(changed: FieldEnhancement[]) {
    const patch: Partial<DemandAnswers> = {};
    for (const f of changed) patch[f.key] = f.enhanced as DemandAnswers[typeof f.key];
    onApply(patch);
    setApplied((s) => { const n = new Set(s); changed.forEach((f) => n.add(f.key)); return n; });
  }

  const changed = result?.fields.filter((f) => f.changed) ?? [];

  return (
    <div className="rounded-lg border border-dashed p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">✨ Review &amp; strengthen with AI</h2>
          <p className="text-xs text-muted-foreground">
            Assesses the demand and, with a model configured, drafts clearer field text — you choose what to apply. Not requirements engineering.
            {result && (
              <> Governed by the <a href={`/catalog/playbook/${result.playbook}`} className="underline hover:text-foreground">{result.playbook}</a> playbook.</>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:border-foreground/40 disabled:opacity-50"
        >
          {loading ? "Working…" : result ? "Re-run" : "Review"}
        </button>
      </div>

      {error && <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">{error}</div>}

      {/* Offline mode assesses and asks questions but does not rewrite field text —
          say so, so an empty change-list doesn't read as "it did nothing". */}
      {result && !result.live && changed.length === 0 && (
        <div className="mt-3 rounded-md border border-info/40 bg-info/5 px-3 py-2 text-xs text-muted-foreground">
          Offline mode reviews the demand and raises the questions below, but doesn't rewrite field text. Set <span className="font-mono">ANTHROPIC_API_KEY</span> (or <span className="font-mono">OPENAI_API_KEY</span>) to get AI-drafted rewrites you can apply.
        </div>
      )}

      {result && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`font-semibold uppercase tracking-wide ${SCORE_TONE[result.assessment.score]}`}>{result.assessment.score}</span>
            <span className="text-muted-foreground">{result.assessment.summary}</span>
            <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
              {result.live ? `● ${result.provider}` : "○ offline"}
            </span>
          </div>

          {changed.length > 1 && (
            <button type="button" onClick={() => applyAll(changed)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              Apply all {changed.length} changes
            </button>
          )}

          {result.fields.map((f) => {
            const isApplied = applied.has(f.key);
            if (!f.changed && !f.gap) return null;
            return (
              <div key={f.key} className="rounded-md border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">{f.label}</span>
                  {f.changed && (
                    isApplied ? (
                      <span className="text-[11px] text-ok">✓ applied</span>
                    ) : (
                      <button type="button" onClick={() => applyField(f)} className="rounded border px-2 py-0.5 text-[11px] hover:border-foreground/40">Apply</button>
                    )
                  )}
                </div>
                {f.changed && (
                  <div className="mt-1 space-y-1 text-xs">
                    <p className="text-muted-foreground line-through decoration-muted-foreground/40">{f.original}</p>
                    <p className="text-foreground">{f.enhanced}</p>
                  </div>
                )}
                {f.gap && <p className="mt-1 text-[11px] text-warn">⚠ {f.gap}</p>}
              </div>
            );
          })}

          {result.openQuestions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground">Open questions to strengthen the demand</h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                {result.openQuestions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
