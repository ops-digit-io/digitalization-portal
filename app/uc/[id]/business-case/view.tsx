"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@/components/providers";

/** Render the business-case markdown. */
export function Md({ body }: { body: string }) {
  return (
    <div className="prose-portal max-w-none text-sm text-foreground/90">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}

/**
 * Draft (or re-draft) the business case, then refresh. Mirrors the requirements
 * AnalyseButton. Server-enforced (`draft`); refusals surface inline.
 */
export function DraftButton({ id, label, small }: { id: string; label?: string; small?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const resolvedLabel = label ?? t("bc.draftButton", "Draft business case");

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/business-case", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action: "generate" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setErr(data.error ?? `${t("bc.draftFailed", "Draft failed")} (${res.status}).`); setBusy(false); return; }
      setBusy(false);
      router.refresh();
    } catch {
      setErr(t("error.network", "Network error — nothing was saved."));
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={run}
        disabled={busy}
        className={`rounded-md bg-primary font-medium text-primary-foreground disabled:opacity-50 ${small ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm"}`}
      >
        {busy ? t("bc.drafting", "Drafting…") : resolvedLabel}
      </button>
      {err && <span className="text-xs text-destructive">{err}</span>}
    </span>
  );
}

/**
 * Editable assumptions: each row can be marked tested/untested. Testing an assumption
 * moves it out of the downside band (lower sensitivity), so the P10 rises as the case
 * is de-risked. Server-enforced (`draft`); POSTs `set-assumption` and refreshes.
 */
export function AssumptionEditor({
  id,
  assumptions,
  fmtEur,
}: {
  id: string;
  assumptions: { name: string; tested: boolean; impact: number }[];
  fmtEur: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fmt = new Intl.NumberFormat(fmtEur, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  async function toggle(index: number, tested: boolean) {
    setBusy(index);
    setErr(null);
    try {
      const res = await fetch("/api/business-case", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action: "set-assumption", index, tested }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setErr(data.error ?? `${t("bc.saveFailed", "Save failed")} (${res.status}).`); setBusy(null); return; }
      setBusy(null);
      router.refresh();
    } catch {
      setErr(t("error.network", "Network error — nothing was saved."));
      setBusy(null);
    }
  }

  return (
    <div>
      <ul className="space-y-1.5">
        {assumptions.map((a, i) => (
          <li key={i} className="flex items-start justify-between gap-3 text-sm">
            <label className="flex min-w-0 items-start gap-2">
              <input
                type="checkbox"
                checked={a.tested}
                disabled={busy !== null}
                onChange={(e) => void toggle(i, e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
              />
              <span className={a.tested ? "text-foreground/70" : "text-foreground"}>
                {!a.tested && <span aria-hidden>⚠ </span>}{a.name}
              </span>
            </label>
            <span className="shrink-0 text-muted-foreground">
              ±{fmt.format(a.impact)}{a.tested ? ` · ${t("bc.tested", "tested")}` : ` · ${t("bc.untested", "untested")}`}
            </span>
          </li>
        ))}
      </ul>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}

/**
 * Quantify a drafted business case: the human enters the annual gross value (and,
 * optionally, build/run cost) and confirms the baseline, then the simulation below
 * lights up. Server-enforced (`draft`); the drafter never invents these figures, so
 * this editor is where they come from. Empty annual gross clears it back to
 * "to be quantified".
 */
export function ValueEditor({
  id,
  annualGross,
  baselineVerified,
}: {
  id: string;
  annualGross?: number;
  baselineVerified: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [gross, setGross] = useState(annualGross !== undefined ? String(annualGross) : "");
  const [build, setBuild] = useState("");
  const [run, setRun] = useState("");
  const [verified, setVerified] = useState(baselineVerified);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function save() {
    setBusy(true);
    setErr(null);
    setOk(false);
    const trimmed = gross.trim();
    const parsed = trimmed === "" ? null : Number(trimmed.replace(/[,\s€]/g, ""));
    if (parsed !== null && !Number.isFinite(parsed)) {
      setErr(t("bc.grossMustBeNumber", "Annual gross must be a number."));
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/business-case", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          action: "set-value",
          annualGross: parsed,
          baselineVerified: verified,
          ...(build.trim() !== "" ? { buildEstimate: build } : {}),
          ...(run.trim() !== "" ? { annualRunEstimate: run } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setErr(data.error ?? `${t("bc.saveFailed", "Save failed")} (${res.status}).`); setBusy(false); return; }
      setBusy(false);
      setOk(true);
      router.refresh();
    } catch {
      setErr(t("error.network", "Network error — nothing was saved."));
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed p-4">
      <p className="text-sm font-semibold">{t("bc.quantifyTitle", "Quantify the value")}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {t("bc.quantifyNote", "The draft never invents a figure. Enter the annual gross value once you have a baseline — the analysis below updates.")}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-muted-foreground">
          {t("bc.annualGross", "Annual gross (EUR)")}
          <input
            inputMode="numeric"
            value={gross}
            onChange={(e) => setGross(e.target.value)}
            placeholder={t("bc.grossPlaceholder", "e.g. 250000")}
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          {t("bc.buildEstimate", "Build estimate")} ({t("common.optional", "optional")})
          <input
            value={build}
            onChange={(e) => setBuild(e.target.value)}
            placeholder={t("bc.buildPlaceholder", "e.g. EUR 80,000 one-off")}
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          {t("bc.annualRunEstimate", "Annual run estimate")} ({t("common.optional", "optional")})
          <input
            value={run}
            onChange={(e) => setRun(e.target.value)}
            placeholder={t("bc.runPlaceholder", "e.g. EUR 20,000 / yr")}
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="h-3.5 w-3.5" />
          {t("bc.baselineVerified", "Baseline verified (measured, not estimated)")}
        </label>
        <span className="inline-flex items-center gap-2">
          {err && <span className="text-xs text-destructive">{err}</span>}
          {ok && !err && <span className="text-xs text-muted-foreground">{t("common.saved", "Saved.")}</span>}
          <button
            onClick={save}
            disabled={busy}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? t("common.saving", "Saving…") : t("bc.saveValue", "Save value")}
          </button>
        </span>
      </div>
    </div>
  );
}
