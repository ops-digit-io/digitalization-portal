"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet, apiSend, Md } from "@/components/process/ui";

const TEXTAREA =
  "mt-1 min-h-[220px] w-full rounded-md border bg-background px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring";

interface ArtefactMeta {
  id: string;
  title: string;
  purpose: string;
}

interface Loaded {
  template: string;
  content: string;
}

/** One editable Markdown artefact: load template, edit, save, preview, optional AI generate. */
export function ArtefactCard({
  slug,
  artefact,
  filled,
  live,
}: {
  slug: string;
  artefact: ArtefactMeta;
  filled: boolean;
  live: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [content, setContent] = useState("");
  const [template, setTemplate] = useState("");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  async function ensureLoaded() {
    if (loaded) return;
    setErr(null);
    try {
      const r = await apiGet<{ artefact: { template: string }; content: string }>(
        `/engagements/${slug}/artefact/${artefact.id}`,
      );
      setTemplate(r.artefact.template);
      setContent(r.content);
      setLoaded({ template: r.artefact.template, content: r.content });
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void ensureLoaded();
  }

  // Fire-and-forget-ish: saving never blocks typing and never re-fetches the engagement.
  async function save() {
    setBusy(true);
    setErr(null);
    setHint(null);
    try {
      await apiSend<{ changed: boolean }>("PUT", `/engagements/${slug}/artefact/${artefact.id}`, { content });
      setSaved("gespeichert ✓");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    setErr(null);
    setHint(null);
    try {
      const r = await apiSend<{ saved: boolean; content: string }>(
        "POST",
        `/engagements/${slug}/artefact/${artefact.id}/generate`,
      );
      setContent(r.content);
      setSaved("gespeichert ✓");
    } catch (e) {
      const ex = e as Error & { code?: string; status?: number };
      if (ex.code === "NO_KEY" || ex.status === 503) {
        setHint("Kein Modell-Key — Artefakt manuell erfassen.");
      } else {
        setErr(ex.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-3">
      <button type="button" onClick={toggle} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{artefact.title}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                filled
                  ? "bg-[hsl(var(--ok))]/15 text-[hsl(var(--ok))]"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {filled ? "gefüllt" : "leer"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{artefact.purpose}</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{open ? "Schließen ▲" : "Öffnen ▼"}</span>
      </button>

      {open && (
        <div className="mt-3">
          {!loaded && !err && <p className="text-sm text-muted-foreground">Lädt…</p>}
          {loaded && (
            <>
              {preview ? (
                <div className="rounded-md border bg-background p-3">
                  {content.trim() ? <Md>{content}</Md> : <p className="text-sm text-muted-foreground">Kein Inhalt.</p>}
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={TEXTAREA}
                  spellCheck={false}
                />
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {!content.trim() && template && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setContent(template)}>
                    Vorlage laden
                  </Button>
                )}
                <Button size="sm" disabled={busy} onClick={save}>
                  {busy ? "…" : "Speichern"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPreview((p) => !p)}>
                  {preview ? "Bearbeiten" : "Vorschau"}
                </Button>
                {live && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={generate}>
                    Mit KI erzeugen
                  </Button>
                )}
                {saved && <span className="text-xs text-muted-foreground">{saved}</span>}
              </div>

              {hint && <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">{hint}</p>}
              {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
            </>
          )}
          {err && !loaded && <p className="text-xs text-destructive">{err}</p>}
        </div>
      )}
    </Card>
  );
}
