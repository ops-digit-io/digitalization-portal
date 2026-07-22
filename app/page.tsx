"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const LOADED_SKILLS = ["intake-conversation", "demand-classification", "business-case-simulation", "implementation-analysis"];

interface TraceStep { index: number; kind: string; label: string; detail?: string }
interface AgentReply {
  text: string;
  provider: { name: string; live: boolean };
  trace: { toolsOffered: string[]; steps: TraceStep[] };
}

const SUGGESTIONS = [
  { label: "Analyse this quarter's workload & value", task: "analysis" as const, horizon: "quarter" as const },
  { label: "Analyse the year", task: "analysis" as const, horizon: "year" as const },
  { label: "Simulate UC-2026-0041's business case", task: "simulate" as const, useCaseId: "UC-2026-0041" },
];

export default function ChatLanding() {
  const [input, setInput] = useState("");
  const [reply, setReply] = useState<AgentReply | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(body: Record<string, unknown>) {
    setBusy(true);
    setReply(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      setReply(await res.json());
    } catch {
      setReply({ text: "Request failed.", provider: { name: "offline", live: false }, trace: { toolsOffered: [], steps: [] } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">What&apos;s the problem you&apos;re seeing?</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Describe it, or ask the analyst to simulate a business case or size the portfolio.
        The assistant drafts and analyses — you decide what happens next.
      </p>

      <div className="mt-8 w-full">
        <div className="rounded-xl border bg-card p-2 shadow-sm">
          <textarea
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe it in your own words…"
            className="w-full resize-none rounded-lg bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between gap-2 px-1 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {LOADED_SKILLS.map((s) => (
                <Badge key={s} variant="secondary" className="font-normal text-muted-foreground">{s}</Badge>
              ))}
            </div>
            <button
              onClick={() => run({ task: "chat", message: input })}
              disabled={busy}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Thinking…" : "Send"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => run(s)}
              disabled={busy}
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {reply && (
        <div className="mt-6 w-full text-left">
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={reply.provider.live ? "default" : "secondary"} className="font-normal">
                {reply.provider.live ? "live model" : "offline analyst"}
              </Badge>
              {reply.trace.toolsOffered.length > 0 && <span>tools: {reply.trace.toolsOffered.join(", ")}</span>}
            </div>
            <p className="whitespace-pre-wrap text-sm">{reply.text}</p>
            {reply.trace.steps.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                  Trace · {reply.trace.steps.length} steps
                </summary>
                <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {reply.trace.steps.map((s) => (
                    <li key={s.index}>
                      <span className="font-mono">{s.kind}</span> — {s.label}
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
        <Link href="/board" className="font-medium text-foreground hover:underline">Browse portfolio</Link>
        <span aria-hidden>·</span>
        <Link href="/analysis" className="hover:underline">Portfolio analysis</Link>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">AI assistant · drafts only, never approves</p>
    </main>
  );
}
