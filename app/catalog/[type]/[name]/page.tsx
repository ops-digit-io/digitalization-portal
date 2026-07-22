"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { parseFrontmatter } from "@/lib/agent/frontmatter";

interface Entry { type: string; name: string; bundle: boolean; files: string[] }
interface PR { host: string; repo: string; branch: string; paths: string[]; pullRequest: { number: number; url: string; local: boolean } }

const ENTRY_FILE = "SKILL.md";

export default function BundleEditor() {
  const { type, name } = useParams<{ type: string; name: string }>();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [buffers, setBuffers] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");
  const [pr, setPr] = useState<PR | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newPath, setNewPath] = useState("");

  // Resolve the entry (bundle + file list). Falls back to a new single-file entry.
  useEffect(() => {
    fetch("/api/registry")
      .then((r) => r.json())
      .then((reg: { skills: Entry[]; playbooks: Entry[] }) => {
        const list = type === "skill" ? reg.skills : reg.playbooks;
        const found = list.find((e) => e.name === name);
        if (found) {
          setEntry(found);
          setFiles(found.files);
          setSelected(found.files[0] ?? "");
        } else {
          const first = type === "skill" ? ENTRY_FILE : `${name}.md`;
          setEntry({ type, name, bundle: type === "skill", files: [first] });
          setFiles([first]);
          setSelected(first);
        }
      })
      .catch(() => setError("Failed to load."));
  }, [type, name]);

  // Lazy-load the selected file's content.
  useEffect(() => {
    if (!selected || buffers[selected] !== undefined) return;
    fetch(`/api/registry/item?type=${type}&name=${encodeURIComponent(name)}&path=${encodeURIComponent(selected)}`)
      .then((r) => r.json())
      .then((i: { content: string }) => setBuffers((b) => ({ ...b, [selected]: i.content })))
      .catch(() => {});
  }, [selected, type, name, buffers]);

  function edit(v: string) {
    setBuffers((b) => ({ ...b, [selected]: v }));
    setDirty((d) => new Set(d).add(selected));
  }

  function addFile() {
    const p = newPath.trim().replace(/^\/+/, "");
    if (!p) return;
    if (!files.includes(p)) setFiles((f) => [...f, p]);
    setNewPath("");
    setSelected(p);
    setDirty((d) => new Set(d).add(p));
    // fetch template
    fetch(`/api/registry/item?type=${type}&name=${encodeURIComponent(name)}&path=${encodeURIComponent(p)}`)
      .then((r) => r.json())
      .then((i: { content: string }) => setBuffers((b) => ({ ...b, [p]: b[p] ?? i.content })))
      .catch(() => setBuffers((b) => ({ ...b, [p]: b[p] ?? `# ${p}\n` })));
  }

  async function propose() {
    setBusy(true); setError(null); setPr(null);
    const changed = [...dirty].filter((p) => buffers[p] !== undefined).map((p) => ({ path: p, content: buffers[p]! }));
    if (changed.length === 0) { setError("No changes to propose."); setBusy(false); return; }
    try {
      const res = await fetch("/api/registry/propose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, name, bundle: entry?.bundle ?? type === "skill", files: changed, message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "failed");
      setPr(json);
      setDirty(new Set());
    } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }

  const current = buffers[selected] ?? "";
  const isMd = selected.endsWith(".md");
  const { meta, body } = useMemo(() => (isMd ? parseFrontmatter(current) : { meta: {}, body: current }), [current, isMd]);
  const metaChips = Object.entries(meta).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => `${k}: ${x}`) : v ? [`${k}: ${v}`] : []));

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href="/catalog" className="hover:text-foreground">Skills &amp; Playbooks</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{name}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">{name}</h1>
        <Badge variant="outline">{type}</Badge>
        {entry?.bundle && <Badge variant="secondary" className="font-normal">bundle · {files.length} files</Badge>}
        {dirty.size > 0 && <Badge className="font-normal">{dirty.size} unsaved</Badge>}
      </div>

      {error && <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">{error}</div>}
      {pr && (
        <div className="mt-4 rounded-lg border border-ok/40 bg-ok/5 px-3 py-3 text-sm">
          <div className="font-medium">Pull request opened{pr.pullRequest.local ? " (local workspace)" : ""} · PR #{pr.pullRequest.number}</div>
          <div className="text-muted-foreground">{pr.repo} · {pr.paths.length} file(s): {pr.paths.join(", ")}. A second approver merges it — the portal never merges.</div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
        {/* File tree */}
        <aside>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Files</div>
          <ul className="space-y-0.5 text-sm">
            {files.map((f) => (
              <li key={f}>
                <button
                  onClick={() => { setSelected(f); setPreview(false); }}
                  className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left ${f === selected ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <span aria-hidden>{f === ENTRY_FILE ? "★" : f.includes("/") ? "" : "•"}</span>
                  <span className="truncate">{f}</span>
                  {dirty.has(f) && <span className="ml-auto text-warn" aria-hidden>●</span>}
                </button>
              </li>
            ))}
          </ul>
          {(entry?.bundle ?? type === "skill") && (
            <div className="mt-3 flex gap-1">
              <input
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addFile()}
                placeholder="references/new.md"
                className="h-8 w-full rounded border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={addFile} className="h-8 rounded border px-2 text-xs">+</button>
            </div>
          )}
        </aside>

        {/* Editor / preview */}
        <section className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{selected}</span>
            {isMd && (
              <div className="ml-auto inline-flex rounded-md border p-0.5 text-xs">
                <button onClick={() => setPreview(false)} className={`rounded px-2 py-0.5 ${!preview ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Edit</button>
                <button onClick={() => setPreview(true)} className={`rounded px-2 py-0.5 ${preview ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Preview</button>
              </div>
            )}
          </div>

          {preview && isMd ? (
            <Card className="p-4">
              {metaChips.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5 border-b pb-3">
                  {metaChips.map((c) => <span key={c} className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{c}</span>)}
                </div>
              )}
              <div className="prose-portal text-sm"><ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown></div>
            </Card>
          ) : (
            <textarea
              value={current}
              onChange={(e) => edit(e.target.value)}
              rows={22}
              spellCheck={false}
              className="w-full rounded-md border bg-background p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          )}
        </section>
      </div>

      <Card className="mt-4 flex flex-wrap items-center gap-2 p-3">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Change summary (PR title)"
          className="h-9 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <Button onClick={propose} disabled={busy || dirty.size === 0}>
          {busy ? "Proposing…" : `Propose ${dirty.size || ""} change${dirty.size === 1 ? "" : "s"} (open PR)`}
        </Button>
      </Card>
      <p className="mt-2 text-xs text-muted-foreground">
        Editing opens ONE pull request with all changed files on the registry repo. It is not applied until a human merges it (second approver required, §4.5).
      </p>
    </main>
  );
}
