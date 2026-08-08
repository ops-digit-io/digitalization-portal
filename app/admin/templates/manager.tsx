"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TemplateStatus, TemplateState } from "@/lib/poc/template-status";

const STATE_TONE: Record<TemplateState, { label: string; tone: string }> = {
  ready: { label: "ready", tone: "--ok" },
  "not-template": { label: "not a template", tone: "--warn" },
  missing: { label: "missing", tone: "--destructive" },
  unknown: { label: "unknown", tone: "--muted-foreground" },
};

const CATEGORIES = ["app", "mockup", "dashboard", "report"] as const;

export function TemplatesManager({
  statuses,
  org,
  appConfigured,
  templateModeOn,
}: {
  statuses: TemplateStatus[];
  org: string | null;
  appConfigured: boolean;
  templateModeOn: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function post(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "request failed");
    return json;
  }

  async function run(label: string, body: Record<string, unknown>, after?: () => void) {
    setBusy(label);
    setError(null);
    setNote(null);
    try {
      const json = await post(body);
      if (Array.isArray(json.results)) {
        const ok = json.results.filter((r: { ok: boolean }) => r.ok).length;
        const failed = json.results.filter((r: { ok: boolean }) => !r.ok);
        setNote(`${ok}/${json.results.length} template repos created or synced.` + (failed.length ? ` Failed: ${failed.map((r: { id: string; error?: string }) => `${r.id} (${r.error})`).join(", ")}` : ""));
      }
      after?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const missing = statuses.filter((s) => s.state !== "ready").length;

  return (
    <div className="mt-5 space-y-4">
      {/* Config banners */}
      {!appConfigured && (
        <div className="rounded-lg border border-warn/40 bg-warn/5 px-3 py-2 text-sm">
          <span className="font-medium">No GitHub App configured.</span>{" "}
          <span className="text-muted-foreground">Set <code className="font-mono text-xs">GITHUB_APP_ID</code> / <code className="font-mono text-xs">GITHUB_APP_PRIVATE_KEY</code> / <code className="font-mono text-xs">GITHUB_ORG</code> to check and create template repos. Registering custom templates still works.</span>
        </div>
      )}
      {appConfigured && !templateModeOn && (
        <div className="rounded-lg border border-info/30 bg-info/5 px-3 py-2 text-sm text-muted-foreground">
          Template-repo mode is off — the PoC builder writes files directly. Set <code className="font-mono text-xs">POC_USE_TEMPLATE_REPOS=1</code> to generate from these repos.
        </div>
      )}
      {error && <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">{error}</div>}
      {note && <div className="rounded-lg border border-ok/40 bg-ok/5 px-3 py-2 text-sm">{note}</div>}

      {/* Health list */}
      <Card className="divide-y">
        <div className="flex flex-wrap items-center gap-2 p-3">
          <h2 className="text-sm font-semibold">Templates</h2>
          <span className="text-xs text-muted-foreground">{statuses.length} total · {missing} need attention</span>
          <Button
            className="ml-auto"
            variant="outline"
            disabled={!appConfigured || busy !== null || missing === 0}
            onClick={() => run("all", { action: "create", stackId: "all" })}
          >
            {busy === "all" ? "Creating…" : "Create / sync all missing"}
          </Button>
        </div>

        {statuses.map((s) => {
          const tone = STATE_TONE[s.state];
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
              <Badge variant="outline" className="text-[10px] uppercase" style={{ color: `hsl(var(${tone.tone}))` }}>
                {tone.label}
              </Badge>
              <span className="font-medium">{s.label}</span>
              <span className="text-xs text-muted-foreground">{s.category}</span>
              {s.custom && <Badge variant="secondary" className="text-[10px] font-normal">custom</Badge>}
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer" className="font-mono text-xs text-info hover:underline">
                  {s.templateRepo}
                </a>
              ) : (
                <span className="font-mono text-xs text-muted-foreground">{s.templateRepo}</span>
              )}
              <span className="text-xs text-muted-foreground">· {s.upstream.name}</span>
              {s.state === "ready" && s.populated === false && (
                <span className="text-xs" style={{ color: "hsl(var(--warn))" }}>empty</span>
              )}
              <span className="ml-auto flex items-center gap-2">
                {s.state !== "ready" && (
                  <Button
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    disabled={!appConfigured || busy !== null}
                    onClick={() => run(s.id, { action: "create", stackId: s.id })}
                  >
                    {busy === s.id ? "Working…" : s.state === "not-template" ? "Re-create" : "Create / sync"}
                  </Button>
                )}
                {s.custom && (
                  <Button
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    disabled={busy !== null}
                    onClick={() => run(`rm-${s.id}`, { action: "remove", id: s.id })}
                  >
                    Remove
                  </Button>
                )}
              </span>
            </div>
          );
        })}
      </Card>

      <RegisterForm busy={busy} onSubmit={(t) => run("register", { action: "register", template: t })} />
    </div>
  );
}

function RegisterForm({ busy, onSubmit }: { busy: string | null; onSubmit: (t: Record<string, unknown>) => void }) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("app");
  const [description, setDescription] = useState("");
  const [repo, setRepo] = useState("");
  const [upName, setUpName] = useState("");
  const [upUrl, setUpUrl] = useState("");

  const field = "w-full rounded-md border bg-background px-2.5 py-1.5 text-sm";

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold">Register a template</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Add a template that points at a <code className="font-mono">du-template-*</code> repo. Its files live in that
        repo (the builder generates from it), so a custom template needs template-repo mode on. Leave the repo blank to
        default to <code className="font-mono">du-template-&lt;name&gt;</code>.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">Name<input className={field} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Next.js prototype" /></label>
        <label className="text-xs text-muted-foreground">Category
          <select className={field} value={category} onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground sm:col-span-2">Description<input className={field} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One line: what it is and when to pick it" /></label>
        <label className="text-xs text-muted-foreground">Template repo (optional)<input className={field} value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="du-template-nextjs" /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground">Upstream name<input className={field} value={upName} onChange={(e) => setUpName(e.target.value)} placeholder="create-next-app" /></label>
          <label className="text-xs text-muted-foreground">Upstream URL<input className={field} value={upUrl} onChange={(e) => setUpUrl(e.target.value)} placeholder="https://…" /></label>
        </div>
      </div>
      <Button
        className="mt-3"
        disabled={busy !== null || label.trim() === ""}
        onClick={() => onSubmit({ label, category, description, templateRepo: repo, upstream: { name: upName, url: upUrl } })}
      >
        {busy === "register" ? "Registering…" : "Register template"}
      </Button>
    </Card>
  );
}
