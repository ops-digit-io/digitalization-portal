"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RichEditor } from "@/components/portal/rich-editor";
import { parseFrontmatter, serializeFrontmatter } from "@/lib/agent/frontmatter";

interface Entry { type: string; name: string; bundle: boolean; files: string[] }
type Meta = Record<string, string | string[]>;
interface Doc { meta: Meta; body: string; isEntry: boolean; loaded: boolean }

const ENTRY_FILE = "SKILL.md";
type SaveState = "idle" | "saving" | "saved" | "error";

export default function RegistryEditor() {
  const { type, name } = useParams<{ type: string; name: string }>();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [docs, setDocs] = useState<Record<string, Doc>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [newPath, setNewPath] = useState("");
  const [target, setTarget] = useState<string>("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEntryFile = useCallback(
    (path: string) => (entry?.bundle ? path === ENTRY_FILE : path === files[0]),
    [entry, files],
  );

  useEffect(() => {
    fetch("/api/registry")
      .then((r) => r.json())
      .then((reg: { skills: Entry[]; playbooks: Entry[]; contracts: Entry[] }) => {
        const list = type === "skill" ? reg.skills : type === "contract" ? reg.contracts : reg.playbooks;
        const found = list.find((e) => e.name === name);
        const e = found ?? { type, name, bundle: type === "skill", files: [type === "skill" ? ENTRY_FILE : `${name}.md`] };
        setEntry(e);
        setFiles(e.files);
        setSelected(e.files[0] ?? "");
      })
      .catch(() => setError("Failed to load."));
  }, [type, name]);

  // Lazy-load selected file.
  useEffect(() => {
    if (!selected || docs[selected]?.loaded) return;
    fetch(`/api/registry/item?type=${type}&name=${encodeURIComponent(name)}&path=${encodeURIComponent(selected)}`)
      .then((r) => r.json())
      .then((i: { content: string }) => {
        const entryFile = isEntryFile(selected);
        const { meta, body } = entryFile ? parseFrontmatter(i.content) : { meta: {}, body: i.content };
        setDocs((d) => ({ ...d, [selected]: { meta, body, isEntry: entryFile, loaded: true } }));
      })
      .catch(() => {});
  }, [selected, type, name, docs, isEntryFile]);

  const doc = docs[selected];

  function markDirty(path: string) {
    setDirty((s) => new Set(s).add(path));
    setSaveState("idle");
  }
  function setMeta(key: string, value: string | string[]) {
    setDocs((d) => ({ ...d, [selected]: { ...d[selected]!, meta: { ...d[selected]!.meta, [key]: value } } }));
    markDirty(selected);
  }
  function setBody(md: string) {
    setDocs((d) => ({ ...d, [selected]: { ...d[selected]!, body: md } }));
    markDirty(selected);
  }

  const save = useCallback(async () => {
    const paths = [...dirty];
    if (paths.length === 0) return;
    setSaveState("saving"); setError(null);
    const payload = paths
      .map((p) => {
        const dd = docs[p];
        if (!dd) return null;
        const content = dd.isEntry ? serializeFrontmatter(dd.meta, dd.body) : dd.body;
        return { path: p, content };
      })
      .filter(Boolean);
    try {
      const res = await fetch("/api/registry/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, name, bundle: entry?.bundle ?? type === "skill", files: payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "save failed");
      setTarget(`${json.host === "github" ? "main" : "working tree"}`);
      setDirty(new Set());
      setSaveState("saved");
    } catch (e) { setError(String(e)); setSaveState("error"); }
  }, [dirty, docs, type, name, entry]);

  // Autosave shortly after a change (and pushes to main).
  useEffect(() => {
    if (dirty.size === 0) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void save(); }, 1500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [dirty, save]);

  function addFile() {
    const p = newPath.trim().replace(/^\/+/, "");
    if (!p) return;
    if (!files.includes(p)) setFiles((f) => [...f, p]);
    setNewPath("");
    setSelected(p);
    setDocs((d) => ({ ...d, [p]: d[p] ?? { meta: {}, body: `# ${p.split("/").pop()?.replace(/\.md$/, "")}\n`, isEntry: false, loaded: true } }));
    markDirty(p);
  }

  const cap = (doc?.meta.capabilities as string[]) ?? [];
  const tools = (doc?.meta.tools as string[]) ?? [];
  const pbSkills = (doc?.meta.skills as string[]) ?? [];
  const checkpoints = (doc?.meta.checkpoints as string[]) ?? [];
  const asArr = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

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
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className={saveState === "saved" ? "text-ok" : saveState === "saving" ? "text-muted-foreground" : saveState === "error" ? "text-destructive" : "text-muted-foreground"}>
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? `Saved to ${target || "main"}` : saveState === "error" ? "Save failed" : dirty.size > 0 ? "Unsaved changes" : "All changes saved"}
          </span>
          <Button size="sm" onClick={() => void save()} disabled={dirty.size === 0 || saveState === "saving"}>Save</Button>
        </div>
      </div>
      {error && <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">{error}</div>}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
        <aside>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Files</div>
          <ul className="space-y-0.5 text-sm">
            {files.map((f) => (
              <li key={f}>
                <button onClick={() => setSelected(f)} className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left ${f === selected ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                  <span aria-hidden>{isEntryFile(f) ? "★" : "•"}</span>
                  <span className="truncate">{f}</span>
                  {dirty.has(f) && <span className="ml-auto text-warn" aria-hidden>●</span>}
                </button>
              </li>
            ))}
          </ul>
          {(entry?.bundle ?? type === "skill") && (
            <div className="mt-3 flex gap-1">
              <input value={newPath} onChange={(e) => setNewPath(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFile()} placeholder="references/new.md" className="h-8 w-full rounded border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={addFile} className="h-8 rounded border px-2 text-xs">+</button>
            </div>
          )}
        </aside>

        <section className="min-w-0">
          {!doc && <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>}

          {doc && doc.isEntry && (
            <Card className="mb-3 space-y-3 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="text-xs font-medium text-muted-foreground">Name</span>
                  <input value={String(doc.meta.name ?? name)} readOnly className="mt-1 h-9 w-full rounded-md border bg-secondary/40 px-3 text-sm" />
                </label>
                {type === "skill" ? (
                  <>
                    <label className="text-sm">
                      <span className="text-xs font-medium text-muted-foreground">Capabilities</span>
                      <input value={cap.join(", ")} onChange={(e) => setMeta("capabilities", asArr(e.target.value))} placeholder="view_board, draft" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    </label>
                    <label className="text-sm sm:col-span-2">
                      <span className="text-xs font-medium text-muted-foreground">Tools</span>
                      <input value={tools.join(", ")} onChange={(e) => setMeta("tools", asArr(e.target.value))} placeholder="portfolio-query, start-poc" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    </label>
                  </>
                ) : type === "playbook" ? (
                  <>
                    <label className="text-sm">
                      <span className="text-xs font-medium text-muted-foreground">Skills</span>
                      <input value={pbSkills.join(", ")} onChange={(e) => setMeta("skills", asArr(e.target.value))} className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    </label>
                    <label className="text-sm sm:col-span-2">
                      <span className="text-xs font-medium text-muted-foreground">Checkpoints</span>
                      <input value={checkpoints.join(", ")} onChange={(e) => setMeta("checkpoints", asArr(e.target.value))} className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    </label>
                  </>
                ) : null}
              </div>
              <label className="block text-sm">
                <span className="text-xs font-medium text-muted-foreground">Description</span>
                <textarea value={String(doc.meta.description ?? "")} onChange={(e) => setMeta("description", e.target.value)} rows={2} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </label>
            </Card>
          )}

          {doc && (
            <RichEditor key={selected} docKey={selected} value={doc.body} onChange={setBody} />
          )}
        </section>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Changes save automatically and are written to the skill repo&apos;s <strong>main</strong> branch (a local working copy without credentials). No pull requests.
      </p>
    </main>
  );
}
