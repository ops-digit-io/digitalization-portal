"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownPage } from "@/components/portal/markdown-page";
import type { LaneDoc } from "@/lib/org/lane-store";

const DIRS: { dir: string; label: string; blurb: string; template: (name: string) => string }[] = [
  {
    dir: "procedures",
    label: "Procedures",
    blurb: "Reusable procedures shared across this lane's playbooks.",
    template: (n) => `# ${n}\n\n## When to use\n\n## Steps\n\n1. \n2. \n`,
  },
  {
    dir: "examples",
    label: "Examples",
    blurb: "Real cases — the best prompt basis an agent can have.",
    template: (n) => `# ${n}\n\n_A real case: what came in, what was done, how it ended._\n`,
  },
];

/** Author a lane's free-form procedures/ and examples/ documents — list, add, edit. */
export function LaneDocs({ slug, lane, docs, canEdit }: { slug: string; lane: string; docs: LaneDoc[]; canEdit: boolean }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold">Procedures & examples</h2>
      <p className="mt-1 text-xs text-muted-foreground">Free-form lane documents — reusable procedures and real cases.</p>
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
        {DIRS.map((d) => (
          <DirColumn key={d.dir} slug={slug} lane={lane} dir={d.dir} label={d.label} blurb={d.blurb} template={d.template} docs={docs.filter((x) => x.dir === d.dir)} canEdit={canEdit} />
        ))}
      </div>
    </section>
  );
}

function DirColumn({
  slug,
  lane,
  dir,
  label,
  blurb,
  template,
  docs,
  canEdit,
}: {
  slug: string;
  lane: string;
  dir: string;
  label: string;
  blurb: string;
  template: (name: string) => string;
  docs: LaneDoc[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{label}</h3>
          <p className="text-xs text-muted-foreground">{blurb}</p>
        </div>
        {canEdit && !adding && (
          <button onClick={() => setAdding(true)} className="rounded-md border px-2.5 py-1 text-xs hover:bg-secondary/40">+ Add</button>
        )}
      </div>

      {docs.length === 0 && !adding && <p className="mt-3 text-xs text-muted-foreground">None yet.</p>}

      <div className="mt-3 space-y-3">
        {docs.map((doc) => (
          <DocRow key={doc.name} slug={slug} lane={lane} dir={dir} doc={doc} canEdit={canEdit} />
        ))}
        {adding && (
          <DocEditor
            slug={slug}
            lane={lane}
            dir={dir}
            initialName=""
            initialSource=""
            makeTemplate={template}
            onDone={() => setAdding(false)}
          />
        )}
      </div>
    </div>
  );
}

function DocRow({ slug, lane, dir, doc, canEdit }: { slug: string; lane: string; dir: string; doc: LaneDoc; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return <DocEditor slug={slug} lane={lane} dir={dir} initialName={doc.name} initialSource={doc.source} onDone={() => setEditing(false)} />;
  }
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">{doc.name}.md</span>
        {canEdit && (
          <button onClick={() => setEditing(true)} className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground">Edit</button>
        )}
      </div>
      <div className="mt-2 text-sm"><MarkdownPage body={doc.body} /></div>
    </div>
  );
}

function DocEditor({
  slug,
  lane,
  dir,
  initialName,
  initialSource,
  makeTemplate,
  onDone,
}: {
  slug: string;
  lane: string;
  dir: string;
  initialName: string;
  initialSource: string;
  makeTemplate?: (name: string) => string;
  onDone: () => void;
}) {
  const router = useRouter();
  const isNew = initialName === "";
  const [name, setName] = useState(initialName);
  const [text, setText] = useState(initialSource || (makeTemplate ? makeTemplate("New document") : ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const nm = name.trim();
    if (!nm || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save-lane-doc", slug, lane, dir, name: nm, markdown: text }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onDone();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border bg-secondary/20 p-3">
      {isNew && (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Document name"
          className="mb-2 h-8 w-full rounded-md border bg-background px-2.5 text-sm"
        />
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        className="h-56 w-full resize-y rounded-md border bg-background p-3 font-mono text-xs leading-relaxed"
      />
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      <div className="mt-2 flex items-center gap-2">
        <button onClick={save} disabled={busy || name.trim() === ""} className="rounded-md border bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {busy ? "Saving…" : "Save"}
        </button>
        <button onClick={onDone} className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
    </div>
  );
}
