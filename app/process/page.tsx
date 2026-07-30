"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiSend } from "@/components/process/ui";

interface Meta {
  slug: string;
  title: string;
  owner: string;
  unit: string;
  updatedAt: string;
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
        <h1 className="text-lg font-semibold">Process Funnel</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Diagnose a process before it becomes a demand. Fourteen coaching sections in sequence, five gates that can
          fail, a two-axis score with a knock-out traffic light, and an advisory layer — the evidenced result is what
          seeds a qualified demand into the funnel.
          {live === false && (
            <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[11px]">
              offline — coaching runs by prompt export
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Engagements</h2>
          {engagements.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No process assessments yet.</p>}
          <ul className="space-y-2">
            {engagements.map((m) => (
              <li key={m.slug}>
                <Link
                  href={`/process/${m.slug}`}
                  className="flex items-center justify-between rounded-md border px-4 py-3 text-sm hover:border-foreground/40"
                >
                  <span>
                    <span className="font-medium">{m.title}</span>
                    <span className="ml-2 text-muted-foreground">
                      {m.owner || "—"}
                      {m.unit ? ` · ${m.unit}` : ""}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">{String(m.updatedAt).slice(0, 10)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">New engagement</h2>
          <form onSubmit={create} className="space-y-2 rounded-md border p-4">
            <input
              className="h-9 w-full rounded-md border px-3 text-sm"
              placeholder="Process title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <input
              className="h-9 w-full rounded-md border px-3 text-sm"
              placeholder="Process owner"
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
            />
            <input
              className="h-9 w-full rounded-md border px-3 text-sm"
              placeholder="Unit / cost centre"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Intake note (optional)"
              rows={3}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
            <button
              type="submit"
              disabled={busy}
              className="h-9 w-full rounded-md bg-foreground text-sm font-medium text-background disabled:opacity-50"
            >
              {busy ? "Creating…" : "Start diagnosis"}
            </button>
            {err && <p className="text-xs text-[hsl(var(--destructive))]">{err}</p>}
          </form>
        </section>
      </div>
    </main>
  );
}
