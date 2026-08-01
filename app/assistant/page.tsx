"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers";

const LOADED_SKILLS = ["intake-conversation", "business-case-simulation", "implementation-analysis", "poc-builder"];

interface TraceStep { index: number; kind: string; label: string; detail?: string }
interface AgentReply {
  text: string;
  provider: { name: string; live: boolean };
  trace: { toolsOffered: string[]; steps: TraceStep[] };
  link?: string;
}

export default function Assistant() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [reply, setReply] = useState<AgentReply | null>(null);
  const [busy, setBusy] = useState(false);

  const SUGGESTIONS = [
    { label: t("assistant.suggest.quarter", "Analyse this quarter's workload & value"), body: { task: "analysis", horizon: "quarter" } },
    { label: t("assistant.suggest.year", "Analyse the year"), body: { task: "analysis", horizon: "year" } },
    { label: `${t("assistant.suggest.simulate", "Simulate")} UC-2026-0041${t("assistant.suggest.simulateTail", "'s business case")}`, body: { task: "simulate", useCaseId: "UC-2026-0041" } },
    { label: `${t("assistant.suggest.buildPoc", "Build a PoC for")} UC-2026-0041`, body: { task: "poc", useCaseId: "UC-2026-0041" } },
  ];

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
      setReply({ text: t("assistant.requestFailed", "Request failed."), provider: { name: "offline", live: false }, trace: { toolsOffered: [], steps: [] } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-14 text-center">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("assistant.title", "How can the analyst help?")}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {t("assistant.intro", "Describe a problem, or ask it to simulate a business case, size the portfolio, or scaffold a PoC. The assistant drafts and analyses — you decide what happens next.")}
      </p>

      <div className="mt-8 w-full">
        <div className="rounded-xl border bg-card p-2 shadow-sm">
          <textarea
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("assistant.inputPlaceholder", "Describe it in your own words…")}
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
              {busy ? t("assistant.thinking", "Thinking…") : t("assistant.send", "Send")}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => run(s.body)}
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
                {reply.provider.live ? t("assistant.liveModel", "live model") : t("assistant.offlineAnalyst", "offline analyst")}
              </Badge>
              {reply.trace.toolsOffered.length > 0 && <span>{t("assistant.toolsLabel", "tools:")} {reply.trace.toolsOffered.join(", ")}</span>}
            </div>
            <p className="whitespace-pre-wrap text-sm">{reply.text}</p>
            {reply.link && (
              <Link href={reply.link} className="mt-3 inline-block rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                {t("common.open", "Open")} →
              </Link>
            )}
            {reply.trace.steps.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">{t("assistant.trace", "Trace")} · {reply.trace.steps.length} {t("assistant.steps", "steps")}</summary>
                <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {reply.trace.steps.map((s) => (
                    <li key={s.index}><span className="font-mono">{s.kind}</span> — {s.label}</li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        </div>
      )}

      <p className="mt-8 text-xs text-muted-foreground">{t("assistant.footerPrefix", "Analyst · drafts and analyses only, never approves. To capture a new demand, use")} <Link href="/intake" className="underline">{t("intake.title", "Intake")}</Link>.</p>
    </main>
  );
}
