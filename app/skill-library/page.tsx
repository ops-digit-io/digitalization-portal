"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { REFERENCE_SOURCES } from "@/lib/skill-import";
import { BASELINE_TASKS } from "@/lib/skill-search";

interface Hit {
  name: string;
  description?: string;
  reference: string;
  source?: string;
}

interface Preview {
  name: string;
  description?: string;
  body: string;
  raw: string;
  sourceUrl: string;
  files: string[];
  skipped: string[];
}

/**
 * Skill Library — a DEDICATED tool for importing reference skills from the open
 * Agent Skills ecosystem. It is separate from the Skills & Playbooks registry on
 * purpose: this tool ACQUIRES third-party skills (fetch, review, commit); the
 * registry is where you then CHECK and ADJUST them under governance.
 */
export default function SkillLibraryPage() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ name: string; files?: string[] } | null>(null);

  // Marketplace search → build a baseline library, one task at a time.
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported] = useState<Record<string, { name: string; files: number }>>({});

  async function search(q: string) {
    setQuery(q);
    if (q.trim() === "") return;
    setSearching(true);
    setSearchError(null);
    setHits(null);
    try {
      const res = await fetch("/api/registry/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) { setSearchError(data.error ?? "Search failed."); return; }
      setHits((data.hits ?? []) as Hit[]);
    } catch {
      setSearchError("Request failed.");
    } finally {
      setSearching(false);
    }
  }

  async function importHit(ref: string) {
    setImporting(ref);
    setSearchError(null);
    try {
      const res = await fetch("/api/registry/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save", url: ref }),
      });
      const data = await res.json();
      if (res.ok) setImported((m) => ({ ...m, [ref]: { name: data.name, files: (data.files?.length ?? 1) as number } }));
      else setSearchError(data.error ?? "Import failed.");
    } catch {
      setSearchError("Import failed.");
    } finally {
      setImporting(null);
    }
  }

  async function call(action: "preview" | "save") {
    setBusy(true);
    setError(null);
    if (action === "preview") { setPreview(null); setSaved(null); }
    try {
      const res = await fetch("/api/registry/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, url }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed."); return; }
      if (action === "preview") setPreview(data as Preview);
      else setSaved({ name: data.name, files: data.files });
    } catch {
      setError("Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Skill Library</span>
      </nav>
      <h1 className="text-lg font-semibold">Skill Library · import reference skills</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Bring in skills from the open <code className="rounded border px-1">SKILL.md</code> ecosystem. Copy what a
        marketplace gives you — its <code className="rounded border px-1">npx skills add …</code> command, an
        <code className="rounded border px-1"> owner/repo@skill</code> reference, or a raw SKILL.md URL — review it, and
        import. It lands in your{" "}
        <Link href="/catalog" className="underline hover:text-foreground">Skills &amp; Playbooks registry</Link>, where you
        check and adjust it under governance. This tool only acquires; the registry is where you curate.
      </p>

      {/* Where to browse */}
      <div className="mt-4 flex flex-wrap gap-2">
        {REFERENCE_SOURCES.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="rounded-md border px-2.5 py-1 text-xs hover:border-foreground/40" title={s.note}>
            {s.name} ↗
          </a>
        ))}
      </div>

      {/* Trust note */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/5 px-3 py-2.5 text-sm">
        <span className="mt-0.5 text-warn" aria-hidden>⚠</span>
        <div className="text-muted-foreground">
          <span className="font-medium text-foreground">External content — review before importing.</span>{" "}
          An imported skill becomes part of an agent's instructions. Read it first; it is committed to git with its
          <span className="font-mono"> source</span> recorded, and only governs an agent after you save it here.
        </div>
      </div>

      {/* Search the marketplace — build a baseline, one task at a time. */}
      <Card className="mt-5 p-4">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="skill-q" className="text-sm font-medium">Search the marketplace</label>
          <span className="text-[11px] text-muted-foreground">via SkillsMP</span>
        </div>
        <div className="mt-1 flex gap-2">
          <input
            id="skill-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") search(query); }}
            placeholder="e.g. requirements analysis, business case, market research…"
            className="flex-1 rounded-md border bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <button onClick={() => search(query)} disabled={searching || query.trim() === ""} className="rounded-md border px-3 py-1.5 text-sm font-medium hover:border-foreground/40 disabled:opacity-50">
            {searching ? "Searching…" : "Search"}
          </button>
        </div>

        {/* One chip per baseline task — cover the whole overview. */}
        <div className="mt-2 flex flex-wrap gap-1">
          {BASELINE_TASKS.map((t) => (
            <button key={t} onClick={() => search(t)} className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-foreground/40 hover:text-foreground">{t}</button>
          ))}
        </div>

        {searchError && <div className="mt-2 text-xs text-destructive">{searchError}</div>}

        {hits && (
          <div className="mt-3 space-y-2">
            {hits.length === 0 && <p className="text-xs text-muted-foreground">No results. Try another term, or paste a reference below.</p>}
            {hits.map((h) => {
              const done = imported[h.reference];
              return (
                <div key={h.reference} className="flex items-start justify-between gap-3 rounded-md border p-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{h.name}</div>
                    {h.description && <div className="line-clamp-2 text-xs text-muted-foreground">{h.description}</div>}
                    <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{h.source ?? h.reference}</div>
                  </div>
                  {done ? (
                    <Link href={`/catalog/skill/${done.name}`} className="shrink-0 text-[11px] text-ok underline">✓ imported ({done.files})</Link>
                  ) : (
                    <button onClick={() => importHit(h.reference)} disabled={importing === h.reference} className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
                      {importing === h.reference ? "Importing…" : "Import"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="mt-4 p-4">
        <label htmlFor="skill-url" className="text-sm font-medium">Or import by install command, reference, or URL</label>
        <div className="mt-1 flex gap-2">
          <input
            id="skill-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="npx skills add owner/repo@skill   ·   owner/repo@skill   ·   https://…/SKILL.md"
            className="flex-1 rounded-md border bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <button onClick={() => call("preview")} disabled={busy || url.trim() === ""} className="rounded-md border px-3 py-1.5 text-sm font-medium hover:border-foreground/40 disabled:opacity-50">
            {busy && !preview ? "Fetching…" : "Preview"}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">Paste the command straight from a marketplace — the <code className="rounded border px-1">npx</code> wrapper and <code className="rounded border px-1">-y</code> flags are ignored; the skill is fetched from its GitHub source and committed to your registry.</p>
        {error && <div className="mt-2 text-xs text-destructive">{error}</div>}
        {saved && (
          <div className="mt-2 text-xs text-ok">
            ✓ Imported as <Link href={`/catalog/skill/${saved.name}`} className="underline">{saved.name}</Link>
            {saved.files && saved.files.length > 0 && <> — {saved.files.length} file{saved.files.length > 1 ? "s" : ""}</>} — open it in the registry to review or adjust.
          </div>
        )}
      </Card>

      {preview && !saved && (
        <Card className="mt-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">{preview.name}</div>
              {preview.description && <div className="text-xs text-muted-foreground">{preview.description}</div>}
            </div>
            <button onClick={() => call("save")} disabled={busy} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {busy ? "Importing…" : "Import to registry"}
            </button>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Source: <span className="font-mono break-all">{preview.sourceUrl}</span></div>

          {/* The whole package — SKILL.md plus every reference file / script / template. */}
          <div className="mt-3">
            <div className="text-xs font-medium">Bundle · {preview.files.length} file{preview.files.length > 1 ? "s" : ""}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {preview.files.map((f) => (
                <span key={f} className={`rounded border px-1.5 py-0.5 text-[11px] ${/(^|\/)SKILL\.md$/i.test(f) ? "bg-secondary font-medium" : "text-muted-foreground"}`}>{f}</span>
              ))}
            </div>
            {preview.skipped.length > 0 && (
              <p className="mt-1 text-[11px] text-warn">{preview.skipped.length} non-text file{preview.skipped.length > 1 ? "s" : ""} skipped (binary or over the size cap): {preview.skipped.join(", ")}</p>
            )}
          </div>

          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border bg-secondary/20 p-3 text-xs leading-relaxed">{preview.body}</pre>
        </Card>
      )}
    </main>
  );
}
