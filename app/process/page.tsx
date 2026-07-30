"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiSend } from "@/components/process/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Meta {
  slug: string;
  title: string;
  owner: string;
  unit: string;
  updatedAt: string;
}

const INPUT =
  "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring";
const LABEL = "block text-xs font-medium text-muted-foreground";

/** Mirror of the store's slug rule, for a live preview of the engagement URL. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function ProcessFunnelHome() {
  const [engagements, setEngagements] = useState<Meta[]>([]);
  const [live, setLive] = useState<boolean | null>(null);
  const [form, setForm] = useState({ title: "", owner: "", unit: "", note: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [e, c] = await Promise.all([
        apiGet<{ engagements: Meta[] }>("/engagements"),
        apiGet<{ liveCoaching: boolean; provider: string; model: string | null }>("/config"),
      ]);
      setEngagements(e.engagements);
      setLive(c.liveCoaching);
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const slug = useMemo(() => slugify(form.title), [form.title]);

  async function create(ev: React.FormEvent) {
    ev.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const m = await apiSend<Meta>("POST", "/engagements", form);
      setForm({ title: "", owner: "", unit: "", note: "" });
      location.href = `/process/${m.slug}`;
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">Process Funnel</h1>
          <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">pre-funnel</span>
          {live === false && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
              offline · coaching by prompt export
            </span>
          )}
        </div>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Diagnose a process before it becomes a demand: fourteen coaching sections in sequence, five gates that can
          fail, a two-axis score with a knock-out traffic light, and an advisory layer. The evidenced result is what
          seeds a qualified demand into the funnel.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Engagements{engagements.length > 0 && <span className="ml-1.5 font-normal text-muted-foreground/70">{engagements.length}</span>}
          </h2>
          {engagements.length === 0 ? (
            <Card className="grid place-items-center py-12 text-center">
              <p className="text-sm text-muted-foreground">No process assessments yet.</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Start one on the right — a title is all you need.</p>
            </Card>
          ) : (
            <ul className="space-y-2">
              {engagements.map((m) => (
                <li key={m.slug}>
                  <Link
                    href={`/process/${m.slug}`}
                    className="group flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm transition-colors hover:border-foreground/20 hover:bg-accent"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{m.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {m.owner || "no owner recorded"}
                        {m.unit ? ` · ${m.unit}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{String(m.updatedAt).slice(0, 10)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">New engagement</h2>
          <Card className="p-4">
            <form onSubmit={create} className="space-y-3">
              <div>
                <label htmlFor="pf-title" className={LABEL}>
                  Process <span className="text-[hsl(var(--destructive))]">*</span>
                </label>
                <input
                  id="pf-title"
                  className={INPUT}
                  placeholder="e.g. NPM purchasing, Hannover"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  autoComplete="off"
                  required
                />
                {slug && <p className="mt-1 truncate text-[11px] text-muted-foreground">/process/{slug}</p>}
              </div>
              <div>
                <label htmlFor="pf-owner" className={LABEL}>
                  Process owner
                </label>
                <input
                  id="pf-owner"
                  className={INPUT}
                  placeholder="named person with authority to change it"
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="pf-unit" className={LABEL}>
                  Unit / cost centre
                </label>
                <input
                  id="pf-unit"
                  className={INPUT}
                  placeholder="who carries the cost"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="pf-note" className={LABEL}>
                  Intake note <span className="font-normal text-muted-foreground/60">optional</span>
                </label>
                <textarea
                  id="pf-note"
                  className={INPUT.replace("h-9", "min-h-[76px] py-2")}
                  placeholder="what prompted this — the loudest pain, a symptom, a hunch"
                  rows={3}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy || !form.title.trim()}>
                {busy ? "Creating…" : "Start diagnosis"}
              </Button>
              {err && <p className="text-xs text-[hsl(var(--destructive))]">{err}</p>}
            </form>
          </Card>
          <p className="mt-2 px-1 text-[11px] text-muted-foreground">
            The profile section is the first gate: no named owner with authority, no intake.
          </p>
        </section>
      </div>
    </main>
  );
}
