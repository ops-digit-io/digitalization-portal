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

const ANFLUG_LABEL: Record<Anflug, string> = { process: "Prozess-Pull", technology: "Technologie-Push" };

/** Slugify a title for the live preview — mirrors the store's slugify (doc). */
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

  const slug = useMemo(() => slugify(title), [title]);

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
            offline · coaching by prompt export
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

        {/* Right: create */}
        <section>
          <Card className="p-4">
            <h2 className="font-semibold">Neue Diagnose</h2>
            <p className="mt-1 text-xs text-muted-foreground">Ein Prozess, ein Spoke, eine Anflugrichtung.</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className={LABEL}>Prozess *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Wareneingang Rohmaterial"
                  className={INPUT}
                />
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
                <input
                  value={componentsText}
                  onChange={(e) => setComponentsText(e.target.value)}
                  placeholder="SAP MM, Excel-Liste, Mendix-App"
                  className={INPUT}
                />
              </div>

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
