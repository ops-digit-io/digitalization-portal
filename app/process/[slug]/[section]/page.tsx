"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiGet, apiSend, Md } from "@/components/process/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function SectionEditor() {
  const params = useParams();
  const slug = String(params.slug);
  const key = String(params.section);

  const [detail, setDetail] = useState<any>(null);
  const [content, setContent] = useState("");
  const [live, setLive] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [savedAt, setSavedAt] = useState("");

  // Gate form
  const [gateReason, setGateReason] = useState("");

  // Coach
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [coachInput, setCoachInput] = useState("");
  const [coaching, setCoaching] = useState(false);
  const [artefact, setArtefact] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([
        apiGet<any>(`/engagements/${slug}/sections/${key}`),
        apiGet<any>(`/config`),
      ]);
      setDetail(d);
      setContent(d.content || "");
      setGateReason(d.gateResult?.reason || "");
      setLive(c.liveCoaching);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [slug, key]);
  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setErr("");
    try {
      const r = await apiSend<any>("PUT", `/engagements/${slug}/sections/${key}`, { content });
      setDetail((d: any) => ({ ...d, score: r.score }));
      setSavedAt(new Date().toISOString().slice(11, 19));
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function setGate(passed: boolean) {
    setErr("");
    try {
      await apiSend<any>("POST", `/engagements/${slug}/sections/${key}/gate`, { passed, reason: gateReason });
      await load();
      setMsg(passed ? "Gate passed." : "Gate recorded as failed.");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function copyPrompt() {
    try {
      const r = await apiGet<any>(`/engagements/${slug}/sections/${key}/prompt?mode=export`);
      await navigator.clipboard.writeText(r.prompt);
      setMsg("Prompt copied — paste into any assistant, then save the artefact back here.");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function coach() {
    if (!live) return;
    setCoaching(true);
    setErr("");
    const history = coachInput.trim() ? [...chat, { role: "user" as const, content: coachInput.trim() }] : chat;
    setChat(history);
    setCoachInput("");
    try {
      const r = await apiSend<any>("POST", `/engagements/${slug}/sections/${key}/coach`, { messages: history });
      setChat([...history, { role: "assistant", content: r.text }]);
      if (r.artefact) setArtefact(r.artefact);
    } catch (e) {
      const er = e as Error & { code?: string };
      setErr(er.code === "NO_KEY" ? "Live coaching is off — use “Copy prompt” instead." : er.message);
    } finally {
      setCoaching(false);
    }
  }

  if (!detail) return <main className="mx-auto max-w-[1100px] px-4 py-10 text-sm text-muted-foreground">{err || "Loading…"}</main>;
  const s = detail.section;
  const score = detail.score;

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <div className="mb-2 text-xs text-muted-foreground">
        <Link href="/process" className="hover:underline">
          Process Funnel
        </Link>{" "}
        /{" "}
        <Link href={`/process/${slug}`} className="hover:underline">
          {slug}
        </Link>{" "}
        / {s.label}
      </div>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">
            {s.order}. {s.label}
            {s.gate && <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[11px] uppercase tracking-wide">gate</span>}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{s.description}</p>
          {s.gate && s.gateQuestion && <p className="mt-1 max-w-2xl text-xs text-amber-600">Gate: {s.gateQuestion}</p>}
        </div>
        {score && (
          <div className="rounded-md border px-3 py-2 text-right">
            <div className="text-2xl font-semibold">{score.score}</div>
            <div className="text-[11px] text-muted-foreground">required {score.required}</div>
          </div>
        )}
      </div>

      {err && <p className="mb-3 text-xs text-[hsl(var(--destructive))]">{err}</p>}
      {msg && <p className="mb-3 text-xs text-muted-foreground">{msg}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Artefact</h2>
            <div className="flex items-center gap-2">
              {!content.trim() && detail.template && (
                <button onClick={() => setContent(detail.template)} className="rounded-md border px-2 py-1 text-xs hover:border-foreground/40">
                  Load template
                </button>
              )}
              <button onClick={save} className="rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background">
                Save{savedAt ? ` · ${savedAt}` : ""}
              </button>
            </div>
          </div>
          <textarea
            className="h-[460px] w-full rounded-md border bg-background p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="The section artefact, in markdown following the target template."
          />
          {score && score.missed?.length > 0 && (
            <details className="mt-2 text-xs text-muted-foreground">
              <summary>What the grader is still missing ({score.missed.length})</summary>
              <ul className="mt-1 list-disc pl-5">
                {score.missed.map((m: any, i: number) => (
                  <li key={i}>
                    {m.rule.type}
                    {m.rule.pattern ? `: ${m.rule.pattern}` : ""} (weight {m.rule.weight})
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        {/* Coach / export */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coaching</h2>
            <div className="flex items-center gap-2">
              <button onClick={copyPrompt} className="rounded-md border px-2 py-1 text-xs hover:border-foreground/40">
                Copy prompt (export)
              </button>
              {live && (
                <button onClick={coach} disabled={coaching} className="rounded-md border px-2 py-1 text-xs hover:border-foreground/40 disabled:opacity-50">
                  {coaching ? "…" : chat.length ? "Send" : "Start live coach"}
                </button>
              )}
            </div>
          </div>

          {!live && (
            <p className="mb-2 rounded-md bg-secondary/40 p-2 text-xs text-muted-foreground">
              No model key configured — coaching runs by export. Copy the prompt into any assistant, then paste the
              artefact back and save.
            </p>
          )}

          <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-md border p-3 text-sm">
            {chat.length === 0 && <p className="text-xs text-muted-foreground">The coach asks one question at a time and produces the artefact in a fenced block.</p>}
            {chat.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <div className={`inline-block max-w-[92%] rounded-md px-2.5 py-1.5 text-xs ${m.role === "user" ? "bg-foreground text-background" : "bg-secondary/50"}`}>
                  <Md>{m.content}</Md>
                </div>
              </div>
            ))}
          </div>

          {live && (
            <div className="mt-2 flex gap-2">
              <input
                className="h-9 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Answer the coach…"
                value={coachInput}
                onChange={(e) => setCoachInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && coach()}
              />
            </div>
          )}

          {artefact && (
            <div className="mt-2 rounded-md border p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium">Coach produced an artefact</span>
                <button
                  onClick={() => {
                    setContent(artefact);
                    setArtefact(null);
                    setMsg("Artefact inserted into the editor — review, then Save.");
                  }}
                  className="rounded-md border px-2 py-0.5 text-xs hover:border-foreground/40"
                >
                  Insert into editor
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Gate */}
      {s.gate && (
        <section className="mt-8 rounded-md border p-4">
          <h2 className="text-sm font-semibold">Gate verdict</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            A failed gate needs a written reason. {detail.gateResult ? `Currently: ${detail.gateResult.passed ? "passed" : "failed"}.` : "Not yet recorded."}
          </p>
          <textarea
            className="mt-2 w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            rows={2}
            placeholder="Reason (required to fail a gate)"
            value={gateReason}
            onChange={(e) => setGateReason(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            <button onClick={() => setGate(true)} className="rounded-md bg-[hsl(var(--ok))] px-3 py-1 text-xs font-medium text-white">
              Pass gate
            </button>
            <button onClick={() => setGate(false)} className="rounded-md bg-[hsl(var(--destructive))] px-3 py-1 text-xs font-medium text-white">
              Fail gate
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
