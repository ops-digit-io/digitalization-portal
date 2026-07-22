"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildDemand, classifyDemand } from "@/lib/demand";
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
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
          isUser ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-secondary text-foreground"
        }`}
      >
        {m.text}
      </div>
    </div>
  );
}

export default function Intake() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<IntakeState | null>(null);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SaveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Open the conversation once, on mount.
  useEffect(() => {
    const { state: s, messages: m } = startIntake();
    setState(s);
    setMessages(m);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, saved]);

  const done = state?.done ?? false;

  // The demand + classification are computed only from captured answers — the
  // same deterministic renderer the server saves with. Shown only once done.
  const classification = useMemo(() => (state ? classifyDemand(state.answers) : null), [state]);
  const preview = useMemo(
    () => (state && done && classification
      ? buildDemand({ id: "UC-YYYY-NNNN", createdOn: "YYYY-MM-DD", lane: classification.lane }, state.answers)
      : ""),
    [state, done, classification],
  );

  function send() {
    if (!state || done) return;
    const text = input;
    setInput("");
    const userMsg: ChatMessage = { role: "user", text: text.trim() || "(skip)" };
    const { state: next, messages: replies } = submitAnswer(state, text);
    setState(next);
    setMessages((prev) => [...prev, userMsg, ...replies]);
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
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
      } else {
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
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-2xl flex-col px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Intake</span>
      </nav>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Capture a demand</h1>
          <p className="text-sm text-muted-foreground">
            A short conversation — the <span className="font-mono text-xs">s1-intake</span> agent asks, you answer.
            The demand page appears at the end.
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 font-normal text-muted-foreground">deterministic output</Badge>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="mt-4 flex-1 space-y-2.5 overflow-y-auto rounded-xl border bg-card/40 p-4">
        {messages.map((m, i) => <Bubble key={i} m={m} />)}

        {/* The demand page — revealed only once the conversation is done. */}
        {done && classification && (
          <div className="pt-2">
            <Card className="p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">Demand page</h2>
                <Badge variant="secondary" className="font-normal">{LANE_LABEL[classification.lane] ?? classification.lane}</Badge>
                {classification.domain && <Badge variant="outline" className="font-normal">{classification.domain}</Badge>}
                <span className="text-xs text-muted-foreground">rendered by <span className="font-mono">buildDemand</span></span>
              </div>
              <pre className="max-h-[46vh] overflow-auto whitespace-pre-wrap rounded-lg border bg-secondary/20 p-3 text-xs leading-relaxed">{preview}</pre>
              <p className="mt-2 text-xs text-muted-foreground">{classification.rationale} — a suggestion; triage confirms the lane.</p>

              {error && <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}

              {!saved ? (
                <div className="mt-4 flex items-center justify-between">
                  <button onClick={restart} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Start over</button>
                  <button onClick={save} disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                    {saving ? "Saving…" : "Save demand"}
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/demands" className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Open demands list →</Link>
                  <Link href="/funnel" className="rounded-md border px-3 py-1.5 text-xs">See the funnel →</Link>
                  <button onClick={restart} className="rounded-md border px-3 py-1.5 text-xs">Capture another</button>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Composer — hidden once the conversation is done. */}
      {!done && (
        <div className="mt-3 flex items-end gap-2 rounded-xl border bg-card p-2 shadow-sm">
          <textarea
            autoFocus
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Type your answer…  (Enter to send · Shift+Enter for a new line)"
            className="max-h-40 min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button onClick={send} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Send</button>
        </div>
      )}
      <p className="mt-2 text-center text-xs text-muted-foreground">The agent drafts; a human decides at triage. Nothing here passes a gate.</p>
    </main>
  );
}
