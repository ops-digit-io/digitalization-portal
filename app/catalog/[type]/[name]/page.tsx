"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { parseFrontmatter } from "@/lib/agent/frontmatter";

interface Item { type: string; name: string; content: string; exists: boolean }
interface PR { host: string; repo: string; path: string; pullRequest: { number: number; url: string; local: boolean } }

export default function RegistryEntryPage() {
  const { type, name } = useParams<{ type: string; name: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [pr, setPr] = useState<PR | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/registry/item?type=${type}&name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((i: Item) => { setItem(i); setContent(i.content); if (!i.exists) setEditing(true); })
      .catch(() => setError("Failed to load."));
  }, [type, name]);

  async function propose() {
    setBusy(true); setError(null); setPr(null);
    try {
      const res = await fetch("/api/registry/propose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, name, content, message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "failed");
      setPr(json);
      setEditing(false);
    } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }

  const { meta, body } = parseFrontmatter(content || "");
  const metaChips = Object.entries(meta).flatMap(([k, v]) =>
    Array.isArray(v) ? v.map((x) => `${k}: ${x}`) : v ? [`${k}: ${v}`] : [],
  );

  return (
    <main className="mx-auto max-w-[900px] px-4 py-6">
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
        {item && !item.exists && <Badge variant="secondary" className="font-normal">new</Badge>}
        <div className="ml-auto flex gap-2">
          {!editing && <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>}
        </div>
      </div>

      {error && <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">{error}</div>}

      {pr && (
        <div className="mt-4 rounded-lg border border-ok/40 bg-ok/5 px-3 py-3 text-sm">
          <div className="font-medium">Pull request opened{pr.pullRequest.local ? " (local workspace)" : ""}.</div>
          <div className="text-muted-foreground">
            {pr.repo} · {pr.path} · PR #{pr.pullRequest.number}. A second approver merges it — the portal never merges.
          </div>
        </div>
      )}

      {!editing && item && (
        <Card className="mt-4 p-4">
          {metaChips.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5 border-b pb-3">
              {metaChips.map((c) => <span key={c} className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{c}</span>)}
            </div>
          )}
          <div className="prose-portal text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
          </div>
        </Card>
      )}

      {editing && (
        <Card className="mt-4 p-4">
          <label className="text-xs font-medium text-muted-foreground">Markdown (with frontmatter)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            spellCheck={false}
            className="mt-1 w-full rounded-md border bg-background p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Change summary (commit / PR title)"
              className="h-9 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={propose} disabled={busy || !content.trim()}>
              {busy ? "Proposing…" : "Propose change (open PR)"}
            </Button>
            {item?.exists && <Button variant="ghost" onClick={() => { setEditing(false); setContent(item.content); }}>Cancel</Button>}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            This opens a pull request on the registry repo. It is not applied until a human merges it (second approver required).
          </p>
        </Card>
      )}
    </main>
  );
}
