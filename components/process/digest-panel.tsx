"use client";

/**
 * The engagement digest, rendered.
 *
 * Everything here is DERIVED from the anamnesis, and the panel says so once, at
 * the top, in a marker that cannot be mistaken for a finding. The two scores are
 * deliberately shown as separate dials with their basis underneath — a number
 * without its basis is not an assessment — and the tool matrix and friction
 * columns are never summarised: an incomplete list read as a complete one is
 * worse than no list.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiSend } from "@/components/process/ui";
import type { Locale } from "@/lib/i18n";
import * as C from "@/lib/process/content";

export interface Score { value: number; basis?: string }
export interface DigestTool {
  name: string; role?: string;
  velocityOfChange?: string; velocityNote?: string;
  criticalityOfTouch?: string; criticalityNote?: string;
  demandOfTouch?: string; demandNote?: string;
}
export interface FrictionItem { where?: string; what?: string; evidence?: string; cost?: string }
export interface DependencyItem { process?: string; how?: string }
export interface Digest {
  processStatement?: string;
  processScore?: Score;
  technologyStatement?: string;
  technologyScore?: Score;
  tools?: DigestTool[];
  friction?: { actual?: FrictionItem[]; potential?: FrictionItem[]; prunable?: FrictionItem[] };
  dependencies?: { influences?: DependencyItem[]; influencedBy?: DependencyItem[] };
  confidence?: string;
  gaps?: string[];
  generatedAt?: string;
}

const LEVEL: Record<string, string> = {
  high: "border-destructive/40 bg-destructive/10 text-[hsl(var(--destructive))]",
  medium: "border-[hsl(var(--warn))]/40 bg-[hsl(var(--warn))]/10 text-[hsl(var(--warn))]",
  low: "border-[hsl(var(--ok))]/40 bg-[hsl(var(--ok))]/10 text-[hsl(var(--ok))]",
};

function Lvl({ v, note }: { v?: string; note?: string }) {
  const cls = LEVEL[String(v || "").toLowerCase()] ?? "border-border text-muted-foreground";
  return (
    <td className="py-2.5 pr-3 align-top">
      <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
        {v || "—"}
      </span>
      {note && <small className="mt-1 block max-w-[30ch] text-[11px] leading-snug text-muted-foreground">{note}</small>}
    </td>
  );
}

/** The number leads, the bar gives it a shape, the basis keeps it honest. */
function Dial({ label, s, locale }: { label: string; s?: Score; locale: Locale }) {
  const v = Math.max(0, Math.min(100, Number(s?.value ?? 0)));
  return (
    <div className="border-t pt-3">
      <div className="flex items-baseline gap-2.5">
        <span className="text-3xl font-bold leading-none tracking-tight tabular-nums">{s ? v : "—"}</span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="my-2 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-foreground/70" style={{ width: `${s ? v : 0}%` }} />
      </div>
      <p className="text-xs leading-snug text-muted-foreground">{s?.basis || C.pc(locale, "score.notAssessed")}</p>
    </div>
  );
}

function FrictionCol({ title, items, tone, locale }: { title: string; items?: FrictionItem[]; tone: string; locale: Locale }) {
  return (
    <div>
      <h4 className={`mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${tone}`}>
        {title}
        {items?.length ? <span className="rounded-full bg-foreground px-1.5 text-[10px] text-background">{items.length}</span> : null}
      </h4>
      {!items?.length ? (
        <p className="text-xs text-muted-foreground">{C.pc(locale, "digest.noneRecorded")}</p>
      ) : (
        <ul className="space-y-0">
          {items.map((f, i) => (
            <li key={i} className="border-t py-2 text-xs leading-snug">
              <b className="block">{f.where}</b>
              {f.what}
              {f.evidence && <em className="mt-0.5 block not-italic text-muted-foreground">{f.evidence}</em>}
              {f.cost && <em className="mt-0.5 block not-italic text-muted-foreground">{C.pc(locale, "digest.cost")}: {f.cost}</em>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DigestPanel({
  slug,
  digest,
  live,
  locale,
  onChanged,
}: {
  slug: string;
  digest: Digest | null;
  live: boolean;
  locale: Locale;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    setHint(null);
    try {
      await apiSend("POST", `/engagements/${slug}/digest`);
      await onChanged();
    } catch (e) {
      const ex = e as Error & { code?: string; status?: number };
      if (ex.code === "NO_KEY" || ex.status === 503) setHint(C.pc(locale, "artefact.noKey"));
      else setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  if (!digest) {
    return (
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <b className="text-sm">{C.pc(locale, "digest.none")}</b>
        <span className="text-xs text-muted-foreground">{C.pc(locale, "digest.derivedFrom")}</span>
        <span className="flex-1" />
        {live && <Button size="sm" disabled={busy} onClick={run}>{busy ? "…" : C.pc(locale, "digest.generate")}</Button>}
        {hint && <span className="text-xs text-amber-600 dark:text-amber-500">{hint}</span>}
        {err && <span className="text-xs text-destructive">{err}</span>}
      </Card>
    );
  }

  const f = digest.friction ?? {};
  const dep = digest.dependencies ?? {};

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Said once, unmistakably: none of this is a finding. */}
        <span className="rounded-full border border-dashed px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {C.pc(locale, "digest.derived")}
        </span>
        <span className="text-xs text-muted-foreground">
          {C.pc(locale, "digest.confidence")} {digest.confidence || "—"} · {String(digest.generatedAt || "").slice(0, 16).replace("T", " ")}
        </span>
        <span className="flex-1" />
        {live && <Button size="sm" variant="outline" disabled={busy} onClick={run}>{busy ? "…" : C.pc(locale, "digest.regenerate")}</Button>}
      </div>
      {hint && <p className="text-xs text-amber-600 dark:text-amber-500">{hint}</p>}
      {err && <p className="text-xs text-destructive">{err}</p>}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="bg-muted/30 p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{C.pc(locale, "digest.process")}</h3>
          <p className="mb-3 mt-2 text-sm leading-relaxed">{digest.processStatement}</p>
          <Dial label={C.pc(locale, "digest.processScore")} s={digest.processScore} locale={locale} />
        </Card>
        <Card className="bg-muted/30 p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{C.pc(locale, "digest.technology")}</h3>
          <p className="mb-3 mt-2 text-sm leading-relaxed">{digest.technologyStatement}</p>
          <Dial label={C.pc(locale, "digest.technologyScore")} s={digest.technologyScore} locale={locale} />
        </Card>
      </div>

      {digest.tools?.length ? (
        <Card className="p-4">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{C.pc(locale, "digest.tools")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-3">{C.pc(locale, "digest.tool")}</th>
                  <th className="pb-2 pr-3">{C.pc(locale, "digest.velocity")}</th>
                  <th className="pb-2 pr-3">{C.pc(locale, "digest.criticality")}</th>
                  <th className="pb-2 pr-3">{C.pc(locale, "digest.demand")}</th>
                </tr>
              </thead>
              <tbody>
                {digest.tools.map((t, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2.5 pr-3 align-top">
                      <b>{t.name}</b>
                      {t.role && <small className="mt-0.5 block max-w-[30ch] text-[11px] leading-snug text-muted-foreground">{t.role}</small>}
                    </td>
                    <Lvl v={t.velocityOfChange} note={t.velocityNote} />
                    <Lvl v={t.criticalityOfTouch} note={t.criticalityNote} />
                    <Lvl v={t.demandOfTouch} note={t.demandNote} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card className="p-4">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{C.pc(locale, "digest.friction")}</h3>
        <div className="grid gap-5 md:grid-cols-3">
          <FrictionCol title={C.pc(locale, "digest.actual")} items={f.actual} tone="text-[hsl(var(--destructive))]" locale={locale} />
          <FrictionCol title={C.pc(locale, "digest.potential")} items={f.potential} tone="text-[hsl(var(--warn))]" locale={locale} />
          <FrictionCol title={C.pc(locale, "digest.prunable")} items={f.prunable} tone="text-[hsl(var(--ok))]" locale={locale} />
        </div>
      </Card>

      {(dep.influences?.length || dep.influencedBy?.length) ? (
        <Card className="grid gap-5 p-4 md:grid-cols-2">
          {([["digest.influences", dep.influences, "→"], ["digest.influencedBy", dep.influencedBy, "←"]] as const).map(([k, items, arrow]) => (
            <div key={k}>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{C.pc(locale, k)}</h4>
              {!items?.length ? (
                <p className="text-xs text-muted-foreground">{C.pc(locale, "digest.notDiscussed")}</p>
              ) : (
                <ul>
                  {items.map((x, i) => (
                    <li key={i} className="border-t py-2 text-xs leading-snug">
                      <span className="font-bold text-muted-foreground">{arrow}</span> <b>{x.process}</b>
                      <small className="mt-0.5 block text-muted-foreground">{x.how}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </Card>
      ) : null}

      {digest.gaps?.length ? (
        <Card className="p-3">
          <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{C.pc(locale, "digest.gaps")}</h4>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
            {digest.gaps.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
