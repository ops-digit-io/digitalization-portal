"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { REFERENCE_SOURCES } from "@/lib/skill-import";

interface Preview {
  name: string;
  description?: string;
  body: string;
  raw: string;
  sourceUrl: string;
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
  const [saved, setSaved] = useState<{ name: string } | null>(null);

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
      else setSaved({ name: data.name });
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
        Bring in skills from the open <code className="rounded border px-1">SKILL.md</code> ecosystem. Paste a raw
        skill URL, review it, and import — it lands in your{" "}
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

      <Card className="mt-5 p-4">
        <label htmlFor="skill-url" className="text-sm font-medium">Raw SKILL.md URL</label>
        <div className="mt-1 flex gap-2">
          <input
            id="skill-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://raw.githubusercontent.com/…/SKILL.md"
            className="flex-1 rounded-md border bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <button onClick={() => call("preview")} disabled={busy || url.trim() === ""} className="rounded-md border px-3 py-1.5 text-sm font-medium hover:border-foreground/40 disabled:opacity-50">
            {busy && !preview ? "Fetching…" : "Preview"}
          </button>
        </div>
        {error && <div className="mt-2 text-xs text-destructive">{error}</div>}
        {saved && (
          <div className="mt-2 text-xs text-ok">
            ✓ Imported as <Link href={`/catalog/skill/${saved.name}`} className="underline">{saved.name}</Link> — open it in the registry to review or adjust.
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
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border bg-secondary/20 p-3 text-xs leading-relaxed">{preview.body}</pre>
        </Card>
      )}
    </main>
  );
}
