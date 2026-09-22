import Link from "next/link";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { listTraces, getTrace, tracesDurable, RETENTION_DAYS, type TraceRecord } from "@/lib/agent/trace-store";
import { Card } from "@/components/ui/card";
import type { TraceStep } from "@/lib/agent/trace";

export const dynamic = "force-dynamic";

/** Friendly names for the features that run agents — the raw key is shown too. */
const FEATURE_LABEL: Record<string, string> = {
  "agent.chat": "Analyst · chat",
  "agent.simulate": "Analyst · simulate",
  "agent.analysis": "Analyst · portfolio",
  "agent.poc": "Analyst · PoC",
};

const STEP_TONE: Record<TraceStep["kind"], string> = {
  model: "bg-info/10 text-info",
  tool_call: "bg-stage-s3/10 text-[hsl(var(--stage-s3))]",
  tool_result: "bg-ok/10 text-ok",
  note: "bg-secondary text-muted-foreground",
  error: "bg-warn/10 text-warn",
};

function when(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)}`;
}

function seconds(rec: TraceRecord): string {
  if (!rec.trace.finishedAt) return "—";
  const ms = Date.parse(rec.trace.finishedAt) - Date.parse(rec.trace.startedAt);
  return Number.isFinite(ms) ? `${(ms / 1000).toFixed(1)}s` : "—";
}

/** One run, in full: every step, and — the point of the page — what was withheld. */
function Detail({ rec }: { rec: TraceRecord }) {
  const t = rec.trace;
  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">{FEATURE_LABEL[rec.feature] ?? rec.feature}</h2>
        <span className="font-mono text-xs text-muted-foreground">{t.id}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${t.live ? "bg-ok/10 text-ok" : "bg-secondary text-muted-foreground"}`}>
          {t.live ? `● live · ${t.provider}` : `○ offline · ${t.provider}`}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {[
          ["Ran", when(t.startedAt)],
          ["Took", seconds(rec)],
          ["Steps", String(t.steps.length)],
          ["Tokens", `${t.totalUsage.input} in · ${t.totalUsage.output} out`],
        ].map(([label, value]) => (
          <Card key={label} className="p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
          </Card>
        ))}
      </dl>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tools offered</h3>
          {t.toolsOffered.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">None — this run answered without tools.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {t.toolsOffered.map((name) => (
                <li key={name} className="rounded border px-1.5 py-0.5 font-mono text-xs">{name}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tools withheld</h3>
          {t.toolsWithheld.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">None — every tool this run could have had, it had.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {t.toolsWithheld.map((w) => (
                <li key={w.name}>
                  <span className="font-mono text-xs">{w.name}</span>
                  <span className="text-muted-foreground"> — {w.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-3 divide-y p-0">
        {t.steps.map((s) => (
          <div key={s.index} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">{s.index}</span>
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${STEP_TONE[s.kind]}`}>{s.kind}</span>
              <span className="font-medium">{s.label}</span>
              {s.usage && (
                <span className="text-xs text-muted-foreground tabular-nums">{s.usage.input} in · {s.usage.output} out</span>
              )}
            </div>
            {s.detail && (
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-secondary/50 p-2 text-xs">{s.detail}</pre>
            )}
          </div>
        ))}
      </Card>
    </>
  );
}

/**
 * Administration · Agent traces (N1).
 *
 * Every persisted agent run, and one run in full when `?id=` names it. The
 * withheld tools are given equal weight to the offered ones deliberately: "this
 * run could not have passed a gate" is the claim the governance model rests on,
 * and a trace that only lists what an agent DID cannot support it.
 *
 * This is an audit surface, not an analytics one. It lists runs, never people:
 * nothing here totals, ranks or compares by session (constraint #6).
 */
export default async function TracesPage({ searchParams }: { searchParams: { id?: string } }) {
  const session = await getSession();
  if (!can(session, "all")) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">Administration · Agent traces</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page is for administrators only.</p>
        <Link href="/" className="mt-3 inline-block text-sm underline">← Home</Link>
      </main>
    );
  }

  const durable = tracesDurable();
  const selected = searchParams.id ? await getTrace(searchParams.id) : null;
  const records = await listTraces(100);

  return (
    <main className="mx-auto max-w-[980px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href="/settings" className="hover:text-foreground">Settings</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Agent traces</span>
      </nav>

      <h1 className="text-lg font-semibold">Agent traces</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Every agent run, replayable: its steps, the tools it was offered, and the tools it was
        withheld and why. Kept for {RETENTION_DAYS} days. This is a record of runs, never of people — nothing here
        ranks or compares who ran what.
      </p>

      {!durable && (
        <Card className="mt-5 border-warn/30 bg-warn/5 p-4 text-sm">
          <span className="font-medium">Traces need a durable store.</span> Without KV they are written to local
          disk, which a serverless deployment discards between invocations. Set{" "}
          <code className="rounded border px-1 py-0.5">KV_REST_API_URL</code> and{" "}
          <code className="rounded border px-1 py-0.5">KV_REST_API_TOKEN</code> to keep them.
        </Card>
      )}

      {searchParams.id && !selected && (
        <Card className="mt-5 p-4 text-sm text-muted-foreground">
          That trace is no longer stored — it may have passed the {RETENTION_DAYS}-day retention window.
        </Card>
      )}

      {selected && <Detail rec={selected} />}

      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {selected ? "All runs" : `${records.length} run${records.length === 1 ? "" : "s"}`}
      </h2>

      {records.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No runs recorded yet. Ask the <Link href="/assistant" className="underline">Analyst</Link> something and it will appear here.
        </Card>
      ) : (
        <Card className="divide-y p-0">
          {records.map((rec) => (
            <Link
              key={rec.recordId}
              href={`/admin/traces?id=${rec.recordId}`}
              className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40 ${
                rec.recordId === selected?.recordId ? "bg-secondary/60" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{FEATURE_LABEL[rec.feature] ?? rec.feature}</div>
                <div className="font-mono text-xs text-muted-foreground">{when(rec.trace.startedAt)} · {rec.trace.provider}</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                <span>{rec.trace.steps.length} steps</span>
                <span aria-hidden>·</span>
                <span>{rec.trace.totalUsage.input + rec.trace.totalUsage.output} tokens</span>
                {rec.trace.toolsWithheld.length > 0 && (
                  <span className="rounded bg-secondary px-1.5 py-0.5">{rec.trace.toolsWithheld.length} withheld</span>
                )}
                {!rec.trace.live && <span className="rounded bg-secondary px-1.5 py-0.5">offline</span>}
              </div>
            </Link>
          ))}
        </Card>
      )}
    </main>
  );
}
