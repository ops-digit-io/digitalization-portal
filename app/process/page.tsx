"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet, apiSend } from "@/components/process/ui";

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

interface Triage {
  recommendation: "aufnehmen" | "enabler" | "zurueckstellen" | "selbsthilfe";
  headline: string;
  reason: string;
  warnings: string[];
  rated: number;
  total: number;
}

const ANFLUG_LABEL: Record<Anflug, string> = { process: "Prozess-Pull", technology: "Technologie-Push" };

const REC_CLASS: Record<Triage["recommendation"], string> = {
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
  const [config, setConfig] = useState<Config | null>(null);
  const [rows, setRows] = useState<EngagementRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // create form
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [champion, setChampion] = useState("");
  const [unit, setUnit] = useState("");
  const [anflug, setAnflug] = useState<Anflug>("process");
  const [componentsText, setComponentsText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Process Funnel</span>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">Process Funnel</h1>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">pre-funnel</span>
        {config && config.liveCoaching === false && (
          <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            offline · Analyse regelbasiert
          </span>
        )}
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Prozessgesundheit vor dem Engagement: bewerten, verzweigen, das Änderungsrisiko klären — ein Cockpit je Diagnose.
      </p>

      {loadError && (
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{loadError}</p>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Left: list */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diagnosen</h2>
          {rows === null && !loadError && <p className="text-sm text-muted-foreground">Lädt…</p>}
          {rows !== null && rows.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Noch keine Diagnose. Starte rechts mit „Neue Diagnose“.
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
                          {r.owner || "kein Owner"}{r.unit ? ` · ${r.unit}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        <div>{ANFLUG_LABEL[r.anflug]}</div>
                        <div className="mt-0.5">{r.phase} · {fmtDate(r.updatedAt)}</div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Right: pre-filter + create */}
        <section className="space-y-4">
          {/* Kurzform-Selbstbewertung als Vorfilter */}
          <Card className="p-4">
            <button type="button" onClick={() => setPreOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
              <div>
                <h2 className="font-semibold">Vorfilter · Kurzform-Selbstbewertung</h2>
                <p className="mt-1 text-xs text-muted-foreground">Sieben Kriterien, grob selbst eingestuft — billig, 1.400-fähig. Entscheidet vor Hub-Zeit.</p>
              </div>
              <span className="ml-2 shrink-0 text-muted-foreground">{preOpen ? "–" : "+"}</span>
            </button>

            {preOpen && (
              <div className="mt-4 space-y-4">
                {selfCriteria.length === 0 && <p className="text-sm text-muted-foreground">Lädt…</p>}
                {selfCriteria.map((c) => (
                  <div key={c.id}>
                    <div className="text-sm font-medium">
                      {c.id} · {c.label}
                      {c.knockout && <span className="ml-1.5 rounded bg-secondary px-1 py-0.5 text-[10px] uppercase text-muted-foreground">K.o.</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{c.question}</div>
                    <div className="mt-1.5 flex gap-1">
                      {([1, 2, 3, 4, 5] as Level[]).map((n) => (
                        <button
                          key={n}
                          type="button"
                          title={c.scale[n - 1]}
                          onClick={() => setLevel(c.id, n)}
                          className={`h-7 flex-1 rounded border text-xs ${levels[c.id] === n ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"}`}
                        >
                          S{n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {triage && (
                  <div className="rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${REC_CLASS[triage.recommendation]}`}>{triage.headline}</span>
                      <span className="text-xs text-muted-foreground">{triage.rated}/{triage.total} bewertet</span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">{triage.reason}</p>
                    {triage.warnings.length > 0 && (
                      <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px] text-amber-600 dark:text-amber-500">
                        {triage.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    )}
                    <p className="mt-2 text-[11px] text-muted-foreground">Die Stufen werden als Startbewertung (Konfidenz S) in die Diagnose übernommen.</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Neue Diagnose */}
          <Card className="p-4">
            <h2 className="font-semibold">Neue Diagnose</h2>
            <p className="mt-1 text-xs text-muted-foreground">Ein Prozess, ein Spoke, eine Anflugrichtung.</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className={LABEL}>Prozess *</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Wareneingang Rohmaterial" className={INPUT} />
                {slug && <p className="mt-1 text-xs text-muted-foreground">/process/{slug}</p>}
              </div>
              <div>
                <label className={LABEL}>Verantwortlicher</label>
                <input value={owner} onChange={(e) => setOwner(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Champion</label>
                <input value={champion} onChange={(e) => setChampion(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Einheit / Kostenstelle</label>
                <input value={unit} onChange={(e) => setUnit(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Anflug</label>
                <div className="mt-1 inline-flex rounded-md border p-0.5 text-sm">
                  {(["process", "technology"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAnflug(a)}
                      className={`rounded px-3 py-1 ${a === anflug ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      {ANFLUG_LABEL[a]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={LABEL}>Kernkomponenten (kommagetrennt)</label>
                <input value={componentsText} onChange={(e) => setComponentsText(e.target.value)} placeholder="SAP MM, Excel-Liste, Mendix-App" className={INPUT} />
              </div>

              {triage && triage.recommendation === "zurueckstellen" && (
                <p className="rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
                  Vorfilter empfiehlt Zurückstellen (kein Spoke). Aufnahme nur mit begründeter Ausnahme.
                </p>
              )}
              {formError && <p className="text-sm text-destructive">{formError}</p>}

              <Button className="w-full" disabled={!title.trim() || submitting} onClick={submit}>
                {submitting ? "Startet…" : "Diagnose starten"}
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
