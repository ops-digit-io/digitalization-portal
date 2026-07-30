"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiGet, apiSend, Md, LightBadge } from "@/components/process/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */

const GROUP_ORDER = ["discovery", "recon", "measurement", "capacity", "decision"];
const GROUP_LABEL: Record<string, string> = {
  discovery: "Discovery",
  recon: "Recon",
  measurement: "Measurement",
  capacity: "Capacity to Change",
  decision: "Decision & Value",
};

function Chip({ children, tone }: { children: React.ReactNode; tone?: string }) {
  const map: Record<string, string> = {
    high: "bg-[hsl(var(--destructive))] text-white",
    medium: "bg-amber-500 text-white",
    low: "bg-secondary text-secondary-foreground",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${tone ? map[tone] ?? "bg-secondary" : "bg-secondary"}`}>{children}</span>;
}

export default function EngagementOverview() {
  const slug = String(useParams().slug);
  const [st, setSt] = useState<any>(null);
  const [digest, setDigest] = useState<any>(null);
  const [liveAvailable, setLiveAvailable] = useState(false);
  const [advisory, setAdvisory] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const [s, d, a] = await Promise.all([
        apiGet<any>(`/engagements/${slug}`),
        apiGet<any>(`/engagements/${slug}/digest`),
        apiGet<any>(`/engagements/${slug}/advisory`),
      ]);
      setSt(s);
      setDigest(d.digest);
      setLiveAvailable(d.liveAvailable);
      setAdvisory(a);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [slug]);
  useEffect(() => {
    void load();
  }, [load]);

  async function runDigest() {
    setBusy("digest");
    setErr("");
    try {
      const r = await apiSend<any>("POST", `/engagements/${slug}/digest/run`);
      setDigest(r.digest);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function runAdvisory(key: string) {
    setBusy(`adv:${key}`);
    setErr("");
    try {
      await apiSend<any>("POST", `/engagements/${slug}/advisory/${key}/run`);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  if (err && !st) return <main className="mx-auto max-w-[1100px] px-4 py-10 text-sm text-[hsl(var(--destructive))]">{err}</main>;
  if (!st) return <main className="mx-auto max-w-[1100px] px-4 py-10 text-sm text-muted-foreground">Loading…</main>;

  const light = st.trafficLight || { light: "grey", reason: "" };
  const dims = st.profile?.dimensions ? Object.values(st.profile.dimensions) : [];
  const groups = GROUP_ORDER.map((g) => ({ key: g, sections: st.sections.filter((s: any) => s.group === g) })).filter((g) => g.sections.length);

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <div className="mb-2 text-xs text-muted-foreground">
        <Link href="/process" className="hover:underline">
          Process Funnel
        </Link>{" "}
        / {st.meta.title}
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{st.meta.title}</h1>
          <p className="text-sm text-muted-foreground">
            {st.meta.owner || "—"}
            {st.meta.unit ? ` · ${st.meta.unit}` : ""}
          </p>
        </div>
        <div className="text-right">
          <LightBadge light={light.light} />
          <p className="mt-1 max-w-md text-xs text-muted-foreground">{light.reason}</p>
        </div>
      </div>

      {err && <p className="mb-3 text-xs text-[hsl(var(--destructive))]">{err}</p>}

      {/* Digest — the one-screen derived overview */}
      <section className="mb-8 rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Overview (derived)</h2>
          <button
            onClick={runDigest}
            disabled={!liveAvailable || busy === "digest"}
            title={liveAvailable ? "" : "Needs a model key — otherwise fill sections and export prompts"}
            className="rounded-md border px-2.5 py-1 text-xs hover:border-foreground/40 disabled:opacity-50"
          >
            {busy === "digest" ? "Generating…" : digest ? "Regenerate" : "Generate"}
          </button>
        </div>
        {!digest && <p className="text-sm text-muted-foreground">Not generated yet. It is derived from the filled sections and labelled as derived.</p>}
        {digest && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-secondary/40 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Process · {digest.processScore?.value ?? "—"}</div>
                <p className="mt-1 text-sm">{digest.processStatement}</p>
              </div>
              <div className="rounded-md bg-secondary/40 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Technology · {digest.technologyScore?.value ?? "—"}</div>
                <p className="mt-1 text-sm">{digest.technologyStatement}</p>
              </div>
            </div>

            {Array.isArray(digest.tools) && digest.tools.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-1 pr-3">Tool</th>
                      <th className="py-1 pr-3">Velocity</th>
                      <th className="py-1 pr-3">Criticality</th>
                      <th className="py-1 pr-3">Demand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {digest.tools.map((t: any, i: number) => (
                      <tr key={i} className="border-b last:border-0 align-top">
                        <td className="py-1.5 pr-3">
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.role}</div>
                        </td>
                        <td className="py-1.5 pr-3">
                          <Chip tone={t.velocityOfChange}>{t.velocityOfChange}</Chip>
                        </td>
                        <td className="py-1.5 pr-3">
                          <Chip tone={t.criticalityOfTouch}>{t.criticalityOfTouch}</Chip>
                        </td>
                        <td className="py-1.5 pr-3">
                          <Chip tone={t.demandOfTouch}>{t.demandOfTouch}</Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {digest.friction && (
              <div className="grid gap-3 sm:grid-cols-3">
                {(["actual", "potential", "prunable"] as const).map((b) => (
                  <div key={b} className="rounded-md border p-3">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{b} friction</div>
                    <ul className="space-y-1 text-xs">
                      {(digest.friction[b] || []).map((f: any, i: number) => (
                        <li key={i}>
                          <span className="font-medium">{f.where}</span> — {f.what}
                        </li>
                      ))}
                      {(!digest.friction[b] || digest.friction[b].length === 0) && <li className="text-muted-foreground">none</li>}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {digest.dependencies && (
              <div className="grid gap-3 sm:grid-cols-2">
                {(["influences", "influencedBy"] as const).map((k) => (
                  <div key={k} className="rounded-md border p-3">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {k === "influences" ? "Influences" : "Influenced by"}
                    </div>
                    <ul className="space-y-1 text-xs">
                      {(digest.dependencies[k] || []).map((dp: any, i: number) => (
                        <li key={i}>
                          <span className="font-medium">{dp.process}</span> — {dp.how}
                        </li>
                      ))}
                      {(!digest.dependencies[k] || digest.dependencies[k].length === 0) && <li className="text-muted-foreground">none recorded</li>}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {digest.confidence && <p className="text-xs text-muted-foreground">Confidence: {digest.confidence}. Derived — not a substitute for the sections.</p>}
          </div>
        )}
      </section>

      {/* Dimensions */}
      {dims.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dimensions</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {dims.map((d: any) => (
              <div key={d.key} className="rounded-md border p-3">
                <div className="text-2xl font-semibold">{d.score ?? "—"}</div>
                <div className="text-xs font-medium">{d.label}</div>
                <div className="text-[11px] text-muted-foreground">
                  {d.assessed ? `${Math.round(d.coverage * 100)}% assessed` : `partial (${Math.round(d.coverage * 100)}%)`}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sections */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Anamnesis — 14 sections</h2>
          <a href={`/api/process/engagements/${slug}/report?format=md`} className="text-xs text-muted-foreground hover:underline">
            Export report (markdown)
          </a>
        </div>
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{GROUP_LABEL[g.key]}</div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {g.sections.map((s: any) => (
                  <Link
                    key={s.key}
                    href={`/process/${slug}/${s.key}`}
                    className={`rounded-md border p-3 text-sm hover:border-foreground/40 ${s.locked ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">
                        {s.order}. {s.label}
                      </span>
                      {s.score && <span className="text-xs text-muted-foreground">{s.score.score}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                      {s.gate && (
                        <span
                          className={`rounded px-1.5 py-0.5 ${
                            s.gateResult ? (s.gateResult.passed ? "bg-[hsl(var(--ok))] text-white" : "bg-[hsl(var(--destructive))] text-white") : "bg-secondary"
                          }`}
                        >
                          gate{s.gateResult ? (s.gateResult.passed ? " ✓" : " ✕") : ""}
                        </span>
                      )}
                      {s.filled ? <span className="rounded bg-secondary px-1.5 py-0.5">filled</span> : s.locked ? <span className="rounded bg-secondary px-1.5 py-0.5">locked</span> : <span className="rounded bg-secondary px-1.5 py-0.5">open</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Advisory */}
      {advisory && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Advisory (derived proposals)</h2>
          <div className="space-y-3">
            {advisory.items.map((a: any) => (
              <AdvisoryItem key={a.key} slug={slug} item={a} live={liveAvailable} busy={busy === `adv:${a.key}`} onRun={() => runAdvisory(a.key)} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function AdvisoryItem({ slug, item, live, busy, onRun }: { slug: string; item: any; live: boolean; busy: boolean; onRun: () => void }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<string | null>(null);

  async function toggle() {
    setOpen((o) => !o);
    if (!open && content === null && item.filled) {
      try {
        const r = await apiGet<any>(`/engagements/${slug}/advisory/${item.key}`);
        setContent(r.content || "");
      } catch {
        setContent("");
      }
    }
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-sm font-medium">
            {item.icon} {item.label}
          </span>
          {!item.ready && <span className="ml-2 text-[11px] text-amber-600">needs: {item.missing.join(", ")}</span>}
        </div>
        <div className="flex items-center gap-2">
          {item.filled && (
            <button onClick={toggle} className="rounded-md border px-2 py-1 text-xs hover:border-foreground/40">
              {open ? "Hide" : "View"}
            </button>
          )}
          <button
            onClick={onRun}
            disabled={!live || busy}
            title={live ? "" : "Needs a model key"}
            className="rounded-md border px-2 py-1 text-xs hover:border-foreground/40 disabled:opacity-50"
          >
            {busy ? "Running…" : item.filled ? "Re-run" : "Run pass"}
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
      {open && content !== null && <div className="mt-3 border-t pt-3">{content ? <Md>{content}</Md> : <p className="text-xs text-muted-foreground">empty</p>}</div>}
    </div>
  );
}
