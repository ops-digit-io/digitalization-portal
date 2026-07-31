"use client";

/**
 * One advisory pass: run it, read it, edit it, and record a verdict on any
 * proposal it made.
 *
 * The layer's whole point is the separation from the anamnesis. A section is
 * established reality — a named human said it. This is a DERIVED PROPOSAL, and
 * it is wrong often enough that it must never be mistaken for the first kind, so
 * the marker is on the card and the artefact is stored apart.
 *
 * Every verdict carries a reason, and a rejection without one is refused. A
 * rejected proposal with a reason is the most valuable line in the document when
 * the same idea comes back a year later.
 */

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet, apiSend, Md } from "@/components/process/ui";
import type { Locale } from "@/lib/i18n";
import { PromptButton } from "@/components/process/prompt-button";
import * as C from "@/lib/process/content";

const INPUT = "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const LABEL = "block text-xs font-medium text-muted-foreground";

export interface AdvisoryMeta {
  key: string;
  label: string;
  order: number;
  icon: string;
  description: string;
  needs: string[];
}
export interface Decision {
  advisoryKey: string;
  proposalId: string;
  title: string;
  verdict: "accepted" | "rejected" | "deferred";
  reason: string;
  at: string;
}

const VERDICT_CLS: Record<Decision["verdict"], string> = {
  accepted: "text-[hsl(var(--ok))]",
  rejected: "text-[hsl(var(--destructive))]",
  deferred: "text-[hsl(var(--warn))]",
};

export function AdvisoryPanel({
  slug,
  item,
  live,
  locale,
  sectionLabels,
}: {
  slug: string;
  item: AdvisoryMeta;
  live: boolean;
  locale: Locale;
  /** section key → human label, for naming what a pass is still missing. */
  sectionLabels: Record<string, string | undefined>;
}) {
  const text = C.advisoryText(locale, item);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [content, setContent] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [preview, setPreview] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  // verdict form
  const [pid, setPid] = useState("");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const r = await apiGet<{ content: string; readiness: { missing: string[] }; decisions: Decision[] }>(
      `/engagements/${slug}/advisory/${item.key}`,
    );
    setContent(r.content);
    setMissing(r.readiness.missing);
    setDecisions(r.decisions);
    setLoaded(true);
  }, [slug, item.key]);

  useEffect(() => {
    if (open && !loaded) load().catch((e: Error) => setErr(e.message));
  }, [open, loaded, load]);

  async function run() {
    setBusy(true);
    setErr(null);
    setHint(null);
    try {
      const r = await apiSend<{ content: string }>("POST", `/engagements/${slug}/advisory/${item.key}/generate`);
      setContent(r.content);
      setPreview(true);
    } catch (e) {
      const ex = e as Error & { code?: string; status?: number };
      if (ex.code === "NO_KEY" || ex.status === 503) setHint(C.pc(locale, "artefact.noKey"));
      else setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await apiSend("PUT", `/engagements/${slug}/advisory/${item.key}`, { content });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function record(verdict: Decision["verdict"]) {
    if (!pid.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await apiSend<{ decisions: Decision[] }>("POST", `/engagements/${slug}/advisory/${item.key}/decide`, {
        proposalId: pid.trim(), title, verdict, reason,
      });
      setDecisions(r.decisions);
      setPid("");
      setTitle("");
      setReason("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-full border font-mono text-xs">{item.icon}</span>
            <span className="text-sm font-medium">{text.label}</span>
            {content.trim() && (
              <span className="rounded-full bg-[hsl(var(--ok))]/15 px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--ok))]">
                {C.pc(locale, "artefact.filled")}
              </span>
            )}
            {decisions.length > 0 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                {decisions.length} {C.pc(locale, "advisory.verdicts")}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{text.description}</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {open ? C.pc(locale, "artefact.close") : C.pc(locale, "artefact.open")}
        </span>
      </button>

      {open && (
        <div className="mt-3">
          {!loaded && !err && <p className="text-sm text-muted-foreground">{C.pc(locale, "loading")}</p>}
          {loaded && (
            <>
              {missing.length > 0 && (
                <p className="mb-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
                  {C.pc(locale, "advisory.standsOn")}: {missing.map((k) => sectionLabels[k] ?? k).join(", ")}
                </p>
              )}

              <div className="mb-2 flex flex-wrap items-center gap-2">
                {live && <Button size="sm" disabled={busy} onClick={run}>{busy ? "…" : C.pc(locale, "advisory.run")}</Button>}
                <PromptButton path={`/engagements/${slug}/advisory/${item.key}/prompt`} locale={locale} label={text.label} />
                <Button size="sm" variant="outline" onClick={() => setPreview((p) => !p)}>
                  {preview ? C.pc(locale, "btn.edit") : C.pc(locale, "btn.preview")}
                </Button>
                {!preview && <Button size="sm" variant="outline" disabled={busy} onClick={save}>{C.pc(locale, "btn.save")}</Button>}
              </div>
              {!live && <p className="mb-2 text-xs text-muted-foreground">{C.pc(locale, "prompt.offline")}</p>}
              {hint && <p className="mb-2 text-xs text-amber-600 dark:text-amber-500">{hint}</p>}
              {err && <p className="mb-2 text-xs text-destructive">{err}</p>}

              {preview ? (
                <div className="rounded-md border bg-background p-3">
                  {content.trim() ? <Md>{content}</Md> : <p className="text-sm text-muted-foreground">{C.pc(locale, "advisory.notRun")}</p>}
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  spellCheck={false}
                  className="min-h-[240px] w-full rounded-md border bg-background px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
                />
              )}

              {/* Verdicts — the reason is the point, not the label. */}
              <div className="mt-3 border-t pt-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{C.pc(locale, "advisory.verdicts")}</h4>
                {decisions.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {decisions.map((d) => (
                      <li key={d.proposalId} className="text-xs">
                        <span className={`font-semibold ${VERDICT_CLS[d.verdict]}`}>{C.pc(locale, `advisory.${d.verdict}`)}</span>
                        {" · "}<span className="font-medium">{d.proposalId}</span> {d.title}
                        {d.reason && <span className="text-muted-foreground"> — {d.reason}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 grid gap-2 sm:grid-cols-[120px_1fr]">
                  <div>
                    <label className={LABEL}>{C.pc(locale, "advisory.proposalId")}</label>
                    <input value={pid} onChange={(e) => setPid(e.target.value)} placeholder="P1" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>{C.pc(locale, "field.title")}</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} />
                  </div>
                </div>
                <div className="mt-2">
                  <label className={LABEL}>{C.pc(locale, "advisory.reason")}</label>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} className={INPUT} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busy || !pid.trim()} onClick={() => record("accepted")}>
                    {C.pc(locale, "advisory.accepted")}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy || !pid.trim() || !reason.trim()} onClick={() => record("rejected")}>
                    {C.pc(locale, "advisory.rejected")}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy || !pid.trim()} onClick={() => record("deferred")}>
                    {C.pc(locale, "advisory.deferred")}
                  </Button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{C.pc(locale, "advisory.rejectNeedsReason")}</p>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
