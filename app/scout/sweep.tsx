"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * The sweep control and its results.
 *
 * The two scores are rendered SIDE BY SIDE and never combined. Fit is the bar the
 * list is sorted on and it carries its factors, because a number nobody can
 * interrogate is not evidence. Relevance sits beside it, explicitly labelled as
 * the model's opinion — including where the two disagree, which is usually the
 * interesting row.
 */

interface Factor {
  label: string;
  points: number;
  max: number;
  detail: string;
}

interface Result {
  candidate: { id: string; name: string; layer: string; keywords: string[] };
  relevance: number;
  fit: { score: number; factors: Factor[]; unblocks: { plant: string; system: string; level: string }[]; duplicatesAdopted: boolean };
  summary: string;
  maturityNote: string;
  sourceUrl: string;
  sourceNote: string;
}

interface SweepResponse {
  results: Result[];
  live: boolean;
  note?: string;
  dropped: number;
  scoredAgainst: { systems: number; blocked: number; known: number };
}

function Bar({ value, tone }: { value: number; tone: "fit" | "relevance" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
      <div
        className={`h-full ${tone === "fit" ? "bg-violet-500 dark:bg-violet-600" : "bg-slate-400 dark:bg-slate-500"}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function Sweep() {
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<SweepResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/scout/sweep", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ focus }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : "The sweep failed.");
        setData(null);
      } else {
        setData(json as SweepResponse);
      }
    } catch {
      setError("The sweep could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className="mb-4 p-4">
        <label htmlFor="focus" className="text-xs font-medium">
          What should the sweep look for?
        </label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <input
            id="focus"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. reading closed PLCs at L1, or leave empty to sweep broadly"
            className="min-w-[16rem] flex-1 rounded border bg-background px-3 py-1.5 text-sm"
            disabled={busy}
          />
          <Button onClick={run} disabled={busy}>
            {busy ? "Sweeping…" : "Run a sweep"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          A sweep costs a model call with web search, so it runs when you ask rather than on page load.
          Nothing it finds is adopted — accepted candidates enter{" "}
          <code className="rounded bg-muted px-1 py-0.5">registry/technology.md</code> as{" "}
          <strong>assess</strong>, in a pull request a human merges.
        </p>
      </Card>

      {error ? (
        <Card className="mb-4 border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </Card>
      ) : null}

      {data ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {data.live ? (
              <Badge variant="secondary" className="font-normal">live sweep</Badge>
            ) : (
              <Badge variant="secondary" className="font-normal">offline seed — no live sources</Badge>
            )}
            <span>
              scored against {data.scoredAgainst.systems} systems ({data.scoredAgainst.blocked} unreadable) and{" "}
              {data.scoredAgainst.known} known technologies
            </span>
            {data.dropped > 0 ? <span>· {data.dropped} already in the register, dropped</span> : null}
          </div>

          {data.note ? (
            <Card className="mb-4 border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              {data.note}
            </Card>
          ) : null}

          {data.results.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">
              Nothing new — everything the sweep returned is already in the register.
            </Card>
          ) : (
            <ol className="space-y-3">
              {data.results.map((r, i) => (
                <li key={r.candidate.id}>
                  <Card className="p-4">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold tabular-nums text-muted-foreground">{i + 1}.</span>
                      <span className="text-sm font-semibold">{r.candidate.name}</span>
                      <Badge variant="secondary" className="font-normal">{r.candidate.layer || "layer?"}</Badge>
                      {r.fit.duplicatesAdopted ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          duplicates an adopted standard
                        </span>
                      ) : null}
                    </div>

                    {r.summary ? <p className="mt-1.5 text-sm text-muted-foreground">{r.summary}</p> : null}

                    {/* The two scores, side by side, never combined. */}
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-semibold">Fit to our gaps</span>
                          <span className="text-sm font-semibold tabular-nums">{r.fit.score}</span>
                        </div>
                        <Bar value={r.fit.score} tone="fit" />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Computed here, from the registry. Never from the sweep.
                        </p>
                      </div>
                      <div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-semibold">Relevance</span>
                          <span className="text-sm font-semibold tabular-nums">{r.relevance}</span>
                        </div>
                        <Bar value={r.relevance} tone="relevance" />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          The model&apos;s opinion of the technology in general.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpen(open === r.candidate.id ? null : r.candidate.id)}
                      className="mt-2.5 text-xs underline text-muted-foreground hover:text-foreground"
                    >
                      {open === r.candidate.id ? "Hide" : "Why this fit score?"}
                    </button>

                    {open === r.candidate.id ? (
                      <ul className="mt-2 space-y-1.5 border-t pt-2">
                        {r.fit.factors.map((f) => (
                          <li key={f.label} className="flex gap-2 text-xs">
                            <span className="w-14 shrink-0 text-right font-semibold tabular-nums">
                              {f.points > 0 ? "+" : ""}
                              {f.points}
                            </span>
                            <span>
                              <strong>{f.label}</strong> — {f.detail}
                            </span>
                          </li>
                        ))}
                        {r.maturityNote ? (
                          <li className="flex gap-2 pt-1 text-xs text-muted-foreground">
                            <span className="w-14 shrink-0 text-right">note</span>
                            <span>{r.maturityNote}</span>
                          </li>
                        ) : null}
                        {r.sourceNote ? (
                          <li className="flex gap-2 text-xs text-muted-foreground">
                            <span className="w-14 shrink-0 text-right">source</span>
                            <span>{r.sourceNote}</span>
                          </li>
                        ) : null}
                      </ul>
                    ) : null}

                    <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
                      {r.sourceUrl ? (
                        <a
                          href={r.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="underline text-muted-foreground hover:text-foreground"
                        >
                          Source ↗
                        </a>
                      ) : (
                        <span className="text-muted-foreground">No checkable source</span>
                      )}
                      {r.fit.unblocks.length > 0 ? (
                        <span className="text-muted-foreground">
                          Would unblock: {r.fit.unblocks.slice(0, 3).map((u) => `${u.plant} ${u.system}`).join(", ")}
                          {r.fit.unblocks.length > 3 ? ` +${r.fit.unblocks.length - 3}` : ""}
                        </span>
                      ) : null}
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : null}
    </>
  );
}
