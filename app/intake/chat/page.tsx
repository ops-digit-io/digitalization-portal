"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildDemand, classifyDemand } from "@/lib/demand";
import type { ChatMessage, IntakeState } from "@/lib/intake-agent";
import { ToolHeader, SavedLinks, useIntakeSave } from "../shared";
import { IntakeEnhancer } from "../enhancer";

interface GovernedBy { playbook: string; skills: string[] }

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

export default function ChatTool() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<IntakeState | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"live" | "offline" | null>(null);
  const [governedBy, setGovernedBy] = useState<GovernedBy | null>(null);
  const { saving, saved, error, save, reset } = useIntakeSave();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Each turn goes through /api/intake/turn, which runs the playbook-governed
  // agent: the live model (guided by the s1-intake system prompt) or the
  // deterministic offline agent that encodes the same rules.
  async function turn(payload: { action: "start" | "answer"; userText?: string; msgs: ChatMessage[]; st: IntakeState | null }) {
    setBusy(true);
    try {
      const res = await fetch("/api/intake/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: payload.action, userText: payload.userText, messages: payload.msgs, state: payload.st }),
      });
      const data = (await res.json()) as { messages: ChatMessage[]; state: IntakeState; mode?: "live" | "offline"; governedBy?: GovernedBy };
      setState(data.state);
      if (data.mode) setMode(data.mode);
      if (data.governedBy) setGovernedBy(data.governedBy);
      setMessages((prev) => [...prev, ...(data.messages ?? [])]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Sorry — something went wrong. Try again." }]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void turn({ action: "start", msgs: [], st: null }); }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const done = state?.done ?? false;
  const classification = useMemo(() => (state ? classifyDemand(state.answers) : null), [state]);
  const preview = useMemo(
    () => (state && done && classification ? buildDemand({ id: "UC-YYYY-NNNN", createdOn: "YYYY-MM-DD", lane: classification.lane }, state.answers) : ""),
    [state, done, classification],
  );

  function send() {
    if (busy || done) return;
    const text = input;
    if (text.trim() === "") return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", text: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    void turn({ action: "answer", userText: text, msgs: next, st: state });
  }

  async function doSave() {
    if (!state) return;
    const data = await save({ answers: state.answers });
    if (data) setMessages((prev) => [...prev, { role: "assistant", text: `Saved as ${data.id}. It's on the demands list now, at S1 with G1 open — a human accepts it at triage.` }]);
  }

  function restart() {
    setMessages([]);
    setState(null);
    setInput("");
    reset();
    void turn({ action: "start", msgs: [], st: null });
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-2xl flex-col overflow-hidden px-4 py-3">
      <ToolHeader active="chat" blurb="An AI interview — one short question at a time, strictly governed by a playbook and skills." />

      {/* Governance strip — what drives this interview, editable in the catalog. */}
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {mode && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${mode === "live" ? "bg-ok/10 text-ok" : "bg-secondary text-muted-foreground"}`}>
            {mode === "live" ? "● live model" : "○ offline engine"}
          </span>
        )}
        {governedBy && (
          <span>
            Governed by{" "}
            <Link href={`/catalog/playbook/${governedBy.playbook}`} className="underline hover:text-foreground">{governedBy.playbook}</Link>
            {governedBy.skills.length > 0 && (
              <> · skills: {governedBy.skills.map((s, i) => (
                <span key={s}>
                  {i > 0 && ", "}
                  <Link href={`/catalog/skill/${s}`} className="underline hover:text-foreground">{s}</Link>
                </span>
              ))}</>
            )}
          </span>
        )}
      </div>

      <Card className="flex min-h-0 flex-1 flex-col p-0">
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
          {messages.map((m, i) => <Bubble key={i} m={m} />)}
          {busy && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-sm bg-secondary px-3.5 py-2 text-sm text-muted-foreground">…</div></div>}

          {done && classification && (
            <div className="pt-2">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demand page</span>
                <Badge variant="secondary" className="font-normal">{LANE_LABEL[classification.lane] ?? classification.lane}</Badge>
                {classification.domain && <Badge variant="outline" className="font-normal">{classification.domain}</Badge>}
              </div>
              <pre className="whitespace-pre-wrap rounded-lg border bg-secondary/20 p-3 text-xs leading-relaxed">{preview}</pre>

              {/* Same AI review the Form offers — sharpen the captured answers before
                  saving. Applying updates the answers, so the preview above re-renders. */}
              {!saved && state && (
                <div className="mt-3">
                  <IntakeEnhancer
                    answers={state.answers}
                    onApply={(patch) => setState((s) => (s ? { ...s, answers: { ...s.answers, ...patch } } : s))}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {!done ? (
          <div className="flex items-end gap-2 border-t p-2">
            <textarea
              autoFocus rows={1} value={input} disabled={busy}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type your answer…  (Enter to send · try 'back' or 'why')"
              className="max-h-32 min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
            />
            <button onClick={send} disabled={busy} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Send</button>
          </div>
        ) : (
          <div className="border-t px-4 py-2.5">
            {error && <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">{error}</div>}
            {!saved ? (
              <div className="flex items-center justify-between">
                <button onClick={restart} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Start over</button>
                <button onClick={doSave} disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                  {saving ? "Saving…" : "Save demand"}
                </button>
              </div>
            ) : (
              <SavedLinks id={saved.id} host={saved.result.host} onRestart={restart} />
            )}
          </div>
        )}
      </Card>
    </main>
  );
}
