"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildDemand, classifyDemand, missingRequired, INTAKE_FIELDS, type DemandAnswers } from "@/lib/demand";
import { startIntake, submitAnswer, type ChatMessage, type IntakeState } from "@/lib/intake-agent";

interface SaveResponse {
  id: string;
  result: { host: string; target: string; repo: string; path: string };
  error?: string;
}

const LANE_LABEL: Record<string, string> = {
  run: "run", regulatory: "regulatory", continuous_improvement: "continuous improvement",
  transform: "transform", innovation: "innovation", data_ai: "data / AI", local: "local", unassigned: "unassigned",
};

function Bubble({ m }: { m: ChatMessage }) {
  const isUser = m.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${isUser ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-secondary text-foreground"}`}>
        {m.text}
      </div>
    </div>
  );
}

export default function Intake() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<IntakeState | null>(null);
  const [input, setInput] = useState("");
  const [view, setView] = useState<"markdown" | "form">("markdown");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SaveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { state: s, messages: m } = startIntake();
    setState(s);
    setMessages(m);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const answers = state?.answers ?? null;
  const done = state?.done ?? false;

  // Both views and the save render from the SAME deterministic functions.
  const classification = useMemo(() => (answers ? classifyDemand(answers) : null), [answers]);
  const preview = useMemo(
    () => (answers && classification ? buildDemand({ id: "UC-YYYY-NNNN", createdOn: "YYYY-MM-DD", lane: classification.lane }, answers) : ""),
    [answers, classification],
  );
  const missing = useMemo(() => (answers ? missingRequired(answers) : INTAKE_FIELDS.filter((f) => f.required)), [answers]);
  const canSave = missing.length === 0 && !saved;

  function send() {
    if (!state || done) return;
    const text = input;
    setInput("");
    const userMsg: ChatMessage = { role: "user", text: text.trim() || "(skip)" };
    const { state: next, messages: replies } = submitAnswer(state, text);
    setState(next);
    setMessages((prev) => [...prev, userMsg, ...replies]);
  }

  function setAnswer(k: keyof DemandAnswers, v: string) {
    setState((s) => (s ? { ...s, answers: { ...s.answers, [k]: v } } : s));
  }

  async function save() {
    if (!state) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save", answers: state.answers }),
      });
      const data = (await res.json()) as SaveResponse;
      if (!res.ok) setError(data.error ?? "Save failed.");
      else {
        setSaved(data);
        setMessages((prev) => [...prev, { role: "assistant", text: `Saved as ${data.id}. It's on the demands list now, at S1 with G1 open — a human accepts it at triage.` }]);
      }
    } catch {
      setError("Request failed.");
    } finally {
      setSaving(false);
    }
  }

  function restart() {
    const { state: s, messages: m } = startIntake();
    setState(s);
    setMessages(m);
    setSaved(null);
    setError(null);
    setInput("");
    setView("markdown");
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-[1400px] flex-col overflow-hidden px-4 py-3">
      <div className="flex items-start justify-between gap-3 pb-2">
        <div>
          <h1 className="text-base font-semibold">Capture a demand</h1>
          <p className="text-xs text-muted-foreground">
            Left: the <span className="font-mono">s1-intake</span> chat interview. Right: the demand as markdown or a form — filling in live. Same answers, same page.
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 font-normal text-muted-foreground">deterministic output</Badge>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-2 gap-3 lg:grid-cols-[1fr_1fr] lg:grid-rows-1">
        {/* Left — chat interview */}
        <Card className="flex min-h-0 flex-col p-0">
          <div className="border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Interview</div>
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
            {messages.map((m, i) => <Bubble key={i} m={m} />)}
          </div>
          {!done ? (
            <div className="flex items-end gap-2 border-t p-2">
              <textarea
                autoFocus
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Type your answer…  (Enter to send)"
                className="max-h-32 min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button onClick={send} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Send</button>
            </div>
          ) : (
            <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
              Interview complete — review the demand on the right, or <button onClick={restart} className="underline hover:text-foreground">start over</button>.
            </div>
          )}
        </Card>

        {/* Right — demand view (markdown or form) */}
        <Card className="flex min-h-0 flex-col p-0">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demand</span>
              {classification && <Badge variant="secondary" className="font-normal">{LANE_LABEL[classification.lane] ?? classification.lane}</Badge>}
              {classification?.domain && <Badge variant="outline" className="font-normal">{classification.domain}</Badge>}
            </div>
            <div className="flex rounded-md border p-0.5 text-xs">
              {(["markdown", "form"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`rounded px-2.5 py-1 capitalize ${view === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{v}</button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {view === "markdown" ? (
              <pre className="whitespace-pre-wrap rounded-lg border bg-secondary/20 p-3 text-xs leading-relaxed">{preview}</pre>
            ) : (
              <div className="space-y-3">
                {INTAKE_FIELDS.map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-xs font-medium">{f.question}{f.required && <span className="text-warn"> *</span>}</span>
                    {f.section !== null ? (
                      <textarea
                        rows={2}
                        value={answers?.[f.key] ?? ""}
                        onChange={(e) => setAnswer(f.key, e.target.value)}
                        placeholder="…"
                        className="mt-1 w-full resize-none rounded-md border bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                      />
                    ) : (
                      <input
                        value={answers?.[f.key] ?? ""}
                        onChange={(e) => setAnswer(f.key, e.target.value)}
                        placeholder="…"
                        className="mt-1 w-full rounded-md border bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                      />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="border-t px-4 py-2.5">
            {error && <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">{error}</div>}
            {classification && <p className="mb-2 text-xs text-muted-foreground">{classification.rationale} — a suggestion; triage confirms the lane.</p>}
            {!saved ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {canSave ? "Ready to save." : `Still needed: ${missing.map((m) => m.key).join(", ")}`}
                </span>
                <div className="flex gap-2">
                  <button onClick={restart} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Start over</button>
                  <button onClick={save} disabled={!canSave || saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">
                    {saving ? "Saving…" : "Save demand"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Link href="/demands" className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Open demands list →</Link>
                <Link href="/funnel" className="rounded-md border px-3 py-1.5 text-xs">See the funnel →</Link>
                <button onClick={restart} className="rounded-md border px-3 py-1.5 text-xs">Capture another</button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
