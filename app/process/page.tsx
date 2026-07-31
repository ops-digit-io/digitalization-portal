"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { apiGet, apiSend } from "@/components/process/ui";
import { useI18n } from "@/components/providers";
import * as C from "@/lib/process/content";

const INPUT = "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const LABEL = "block text-xs font-medium text-muted-foreground";

type Anflug = "process" | "technology";
type Level = 1 | 2 | 3 | 4 | 5;

interface Config {
  liveCoaching: boolean;
}

interface EngagementRow {
  slug: string;
  title: string;
  owner: string;
  champion: string;
  unit: string;
  anflug: Anflug;
  phase: string;
  updatedAt: string;
}

interface Criterion {
  id: string;
  label: string;
  question: string;
  knockout?: string;
  scale: [string, string, string, string, string];
}

type Recommendation = "aufnehmen" | "enabler" | "zurueckstellen" | "selbsthilfe";
interface Triage {
  recommendation: Recommendation;
  warnings: ("no-goal" | "thin-value" | "no-map" | "no-leadtime")[];
  enablerWhich: ("K5.1" | "K2.2")[];
  rated: number;
  total: number;
}

const REC_CLASS: Record<Recommendation, string> = {
  aufnehmen: "bg-[hsl(var(--ok))] text-white",
  enabler: "bg-amber-500 text-white",
  selbsthilfe: "bg-secondary text-secondary-foreground",
  zurueckstellen: "bg-[hsl(var(--destructive))] text-white",
};

function slugify(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function fmtDate(s: string): string {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export default function ProcessFunnel() {
  const router = useRouter();
  const { locale } = useI18n();
  const [config, setConfig] = useState<Config | null>(null);
  const [rows, setRows] = useState<EngagementRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // create form (in an accessible modal, decoupled from the list)
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [champion, setChampion] = useState("");
  const [unit, setUnit] = useState("");
  const [anflug, setAnflug] = useState<Anflug>("process");
  const [componentsText, setComponentsText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setFormError(null);
    setCreateOpen(true);
  }

  // Kurzform self-assessment pre-filter (§7.3)
  const [preOpen, setPreOpen] = useState(false);
  const [selfCriteria, setSelfCriteria] = useState<Criterion[]>([]);
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const [triage, setTriage] = useState<Triage | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiGet<Config>("/config"), apiGet<{ engagements: EngagementRow[] }>("/engagements")])
      .then(([c, e]) => {
        if (cancelled) return;
        setConfig(c);
        setRows(e.engagements);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the seven criteria the first time the pre-filter is opened.
  useEffect(() => {
    if (!preOpen || selfCriteria.length) return;
    apiGet<{ criteria: Criterion[] }>("/self-assessment").then((d) => setSelfCriteria(d.criteria)).catch(() => {});
  }, [preOpen, selfCriteria.length]);

  const slug = useMemo(() => slugify(title), [title]);

  function setLevel(critId: string, level: Level) {
    const next = { ...levels, [critId]: level };
    setLevels(next);
    apiSend<{ triage: Triage }>("POST", "/self-assessment", { levels: next })
      .then((d) => setTriage(d.triage))
      .catch(() => {});
  }

  async function submit() {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setFormError(null);
    const components = componentsText.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      const created = await apiSend<{ slug: string }>("POST", "/engagements", {
        title: title.trim(),
        owner: owner.trim() || undefined,
        champion: champion.trim() || undefined,
        unit: unit.trim() || undefined,
        anflug,
        components,
        ...(Object.keys(levels).length ? { seedRatings: levels } : {}),
      });
      router.push(`/process/${created.slug}`);
    } catch (err) {
      setFormError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{C.pc(locale, "nav.home")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{C.pc(locale, "funnel.title")}</span>
      </nav>

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">{C.pc(locale, "funnel.title")}</h1>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{C.pc(locale, "badge.prefunnel")}</span>
            {config && config.liveCoaching === false && (
              <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {C.pc(locale, "badge.offline")}
              </span>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {C.pc(locale, "funnel.tagline")}
          </p>
        </div>
        <Button className="shrink-0" onClick={openCreate}>+ {C.pc(locale, "create.open")}</Button>
      </div>

      {loadError && (
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{loadError}</p>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Left: list */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{C.pc(locale, "list.heading")}</h2>
          {rows === null && !loadError && <p className="text-sm text-muted-foreground">{C.pc(locale, "loading")}</p>}
          {rows !== null && rows.length === 0 && (
            <Card className="flex flex-col items-center gap-3 p-8 text-center text-sm text-muted-foreground">
              <span>{C.pc(locale, "list.empty")}</span>
              <Button onClick={openCreate}>+ {C.pc(locale, "create.open")}</Button>
            </Card>
          )}
          {rows !== null && rows.length > 0 && (
            <div className="space-y-2">
              {rows.map((r) => (
                <Link key={r.slug} href={`/process/${r.slug}`} className="block">
                  <Card className="p-3 transition-colors hover:bg-accent">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{r.title}</div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {r.owner || C.pc(locale, "row.noOwner")}{r.unit ? ` · ${r.unit}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        <div>{C.anflugLabel(locale, r.anflug)}</div>
                        <div className="mt-0.5">{r.phase} · {fmtDate(r.updatedAt)}</div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Right: pre-filter (the create form lives in the dialog, decoupled from the list) */}
        <section className="space-y-4">
          {/* Kurzform-Selbstbewertung als Vorfilter */}
          <Card className="p-4">
            <button type="button" onClick={() => setPreOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
              <div>
                <h2 className="font-semibold">{C.pc(locale, "prefilter.title")}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{C.pc(locale, "prefilter.sub")}</p>
              </div>
              <span className="ml-2 shrink-0 text-muted-foreground">{preOpen ? "–" : "+"}</span>
            </button>

            {preOpen && (
              <div className="mt-4 space-y-4">
                {selfCriteria.length === 0 && <p className="text-sm text-muted-foreground">{C.pc(locale, "loading")}</p>}
                {selfCriteria.map((c) => {
                  const ct = C.critText(locale, c.id);
                  return (
                    <div key={c.id}>
                      <div className="text-sm font-medium">
                        {c.id} · {ct.label}
                        {c.knockout && <span className="ml-1.5 rounded bg-secondary px-1 py-0.5 text-[10px] uppercase text-muted-foreground">K.o.</span>}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{ct.question}</div>
                      <div className="mt-1.5 flex gap-1">
                        {([1, 2, 3, 4, 5] as Level[]).map((n) => (
                          <button
                            key={n}
                            type="button"
                            title={ct.scale[n - 1]}
                            onClick={() => setLevel(c.id, n)}
                            className={`h-7 flex-1 rounded border text-xs font-medium ${levels[c.id] === n ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"}`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {triage && (
                  <div className="rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${REC_CLASS[triage.recommendation]}`}>{C.triageHeadline(locale, triage.recommendation)}</span>
                      <span className="text-xs text-muted-foreground">{triage.rated}/{triage.total} {C.pc(locale, "rated")}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">{C.triageReason(locale, triage.recommendation, triage.enablerWhich)}</p>
                    {triage.warnings.length > 0 && (
                      <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px] text-amber-600 dark:text-amber-500">
                        {triage.warnings.map((w) => <li key={w}>{C.warnText(locale, w)}</li>)}
                      </ul>
                    )}
                    <p className="mt-2 text-[11px] text-muted-foreground">{C.pc(locale, "prefilter.seeded")}</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </section>
      </div>

      {/* New-diagnosis dialog — decoupled from the list for a clearer, focus-trapped flow */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} labelledBy="create-dialog-title">
        <form
          className="p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="create-dialog-title" className="text-base font-semibold">{C.pc(locale, "create.title")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{C.pc(locale, "create.sub")}</p>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              aria-label={C.pc(locale, "dialog.close")}
              className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <span aria-hidden className="text-lg leading-none">×</span>
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="cd-process" className={LABEL}>{C.pc(locale, "field.process")} *</label>
              <input id="cd-process" data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={C.pc(locale, "placeholder.process")} className={INPUT} />
              {slug && <p className="mt-1 text-xs text-muted-foreground">/process/{slug}</p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="cd-owner" className={LABEL}>{C.pc(locale, "field.owner")}</label>
                <input id="cd-owner" value={owner} onChange={(e) => setOwner(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label htmlFor="cd-champion" className={LABEL}>{C.pc(locale, "field.champion")}</label>
                <input id="cd-champion" value={champion} onChange={(e) => setChampion(e.target.value)} className={INPUT} />
              </div>
            </div>
            <div>
              <label htmlFor="cd-unit" className={LABEL}>{C.pc(locale, "field.unit")}</label>
              <input id="cd-unit" value={unit} onChange={(e) => setUnit(e.target.value)} className={INPUT} />
            </div>
            <div>
              <span className={LABEL}>{C.pc(locale, "field.anflug")}</span>
              <div className="mt-1 inline-flex rounded-md border p-0.5 text-sm">
                {(["process", "technology"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={a === anflug}
                    onClick={() => setAnflug(a)}
                    className={`rounded px-3 py-1 ${a === anflug ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {C.anflugLabel(locale, a)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="cd-components" className={LABEL}>{C.pc(locale, "field.components")}</label>
              <input id="cd-components" value={componentsText} onChange={(e) => setComponentsText(e.target.value)} placeholder={C.pc(locale, "placeholder.components")} className={INPUT} />
            </div>

            {triage && triage.recommendation === "zurueckstellen" && (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
                {C.pc(locale, "create.deferWarn")}
              </p>
            )}
            {Object.keys(levels).length > 0 && (
              <p className="text-[11px] text-muted-foreground">{C.pc(locale, "prefilter.seeded")}</p>
            )}
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{C.pc(locale, "btn.cancel")}</Button>
              <Button type="submit" disabled={!title.trim() || submitting}>
                {submitting ? C.pc(locale, "btn.starting") : C.pc(locale, "btn.start")}
              </Button>
            </div>
          </div>
        </form>
      </Dialog>
    </main>
  );
}
