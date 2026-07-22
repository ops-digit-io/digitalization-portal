"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  INTAKE_FIELDS,
  EMPTY_ANSWERS,
  buildDemand,
  classifyDemand,
  missingRequired,
  type DemandAnswers,
} from "@/lib/demand";

type Phase = "elicit" | "confirm-understanding" | "confirm-demand" | "saved";

interface SaveResponse {
  id: string;
  result: { host: string; target: string; repo: string; path: string };
  error?: string;
}

const LANE_LABEL: Record<string, string> = {
  run: "run", regulatory: "regulatory", continuous_improvement: "continuous improvement",
  transform: "transform", innovation: "innovation", data_ai: "data / AI", local: "local", unassigned: "unassigned",
};

export default function Intake() {
  const [answers, setAnswers] = useState<DemandAnswers>({ ...EMPTY_ANSWERS });
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("elicit");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SaveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The preview is rendered client-side from the SAME deterministic builder the
  // server saves with — proving the output is a function of the answers, not the
  // conversation. (Id/date are placeholders until save assigns real ones.)
  const classification = useMemo(() => classifyDemand(answers), [answers]);
  const preview = useMemo(
    () => buildDemand({ id: "UC-YYYY-NNNN", createdOn: "YYYY-MM-DD", lane: classification.lane }, answers),
    [answers, classification.lane],
  );
  const missing = useMemo(() => missingRequired(answers), [answers]);

  const field = INTAKE_FIELDS[step]!;
  const set = (k: keyof DemandAnswers, v: string) => setAnswers((a) => ({ ...a, [k]: v }));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save", answers }),
      });
      const data = (await res.json()) as SaveResponse;
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
      } else {
        setSaved(data);
        setPhase("saved");
      }
    } catch {
      setError("Request failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Intake</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Capture a demand</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Describe the problem in your own words. The intake follows the{" "}
            <span className="font-mono text-xs">s1-intake</span> playbook and always produces the
            same page from the same answers — a demand in the central intake repo. You draft; a human decides at triage.
          </p>
        </div>
        <Badge variant="secondary" className="font-normal text-muted-foreground">deterministic output</Badge>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        {/* Left: the guided conversation */}
        <Card className="flex flex-col p-5">
          {phase === "elicit" && (
            <>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Step {step + 1} of {INTAKE_FIELDS.length}</span>
                <span>{field.required ? "required" : "optional"}</span>
              </div>
              <div className="mb-3 h-1 w-full overflow-hidden rounded bg-secondary">
                <div className="h-1 rounded bg-info" style={{ width: `${((step + 1) / INTAKE_FIELDS.length) * 100}%` }} />
              </div>
              <label className="text-sm font-medium">{field.question}</label>
              {field.section !== null ? (
                <textarea
                  autoFocus
                  rows={5}
                  value={answers[field.key]}
                  onChange={(e) => set(field.key, e.target.value)}
                  placeholder="In your own words…"
                  className="mt-2 w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              ) : (
                <input
                  autoFocus
                  value={answers[field.key]}
                  onChange={(e) => set(field.key, e.target.value)}
                  placeholder="…"
                  className="mt-2 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              )}
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  ← Back
                </button>
                {step < INTAKE_FIELDS.length - 1 ? (
                  <button
                    onClick={() => setStep((s) => s + 1)}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={() => setPhase("confirm-understanding")}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Review →
                  </button>
                )}
              </div>
              <div className="mt-4 border-t pt-3">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Questions</div>
                <ol className="space-y-0.5 text-xs text-muted-foreground">
                  {INTAKE_FIELDS.map((f, i) => (
                    <li key={f.key}>
                      <button onClick={() => setStep(i)} className={`text-left hover:text-foreground ${i === step ? "font-medium text-foreground" : ""}`}>
                        {i + 1}. {f.question}
                        {f.required && answers[f.key].trim() === "" && <span className="ml-1 text-warn">•</span>}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}

          {phase === "confirm-understanding" && (
            <>
              <h2 className="text-sm font-semibold">Checkpoint · confirm understanding</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Here is what was captured, and the lane the classifier proposes for triage. Correct anything before continuing.
              </p>
              <div className="mt-3 rounded-lg border bg-secondary/30 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase text-muted-foreground">Proposed lane</span>
                  <Badge variant="secondary" className="font-normal">{LANE_LABEL[classification.lane] ?? classification.lane}</Badge>
                  {classification.domain && <><span className="text-xs uppercase text-muted-foreground">domain</span><Badge variant="outline" className="font-normal">{classification.domain}</Badge></>}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{classification.rationale}</p>
                <p className="mt-1 text-xs text-muted-foreground">A suggestion only — triage confirms the lane at G1/G2.</p>
              </div>
              {missing.length > 0 && (
                <div className="mt-3 rounded-lg border border-warn/40 bg-warn/5 px-3 py-2 text-sm">
                  <span className="text-warn" aria-hidden>⚠ </span>
                  Still needed: {missing.map((m) => m.question).join(" · ")}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between">
                <button onClick={() => setPhase("elicit")} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">← Edit answers</button>
                <button
                  onClick={() => setPhase("confirm-demand")}
                  disabled={missing.length > 0}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
                >
                  Looks right →
                </button>
              </div>
            </>
          )}

          {phase === "confirm-demand" && (
            <>
              <h2 className="text-sm font-semibold">Checkpoint · confirm demand</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This is the exact page that will be saved to the central intake repo. It opens at S1 with G1 open, awaiting triage.
              </p>
              {error && <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}
              <div className="mt-4 flex items-center justify-between">
                <button onClick={() => setPhase("confirm-understanding")} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">← Back</button>
                <button onClick={save} disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                  {saving ? "Saving…" : "Save demand"}
                </button>
              </div>
            </>
          )}

          {phase === "saved" && saved && (
            <>
              <h2 className="text-sm font-semibold text-ok">Demand captured</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Saved as <span className="font-mono">{saved.id}</span> to{" "}
                <span className="font-mono">{saved.result.repo}</span> ({saved.result.host} · {saved.result.target}).
                It now shows on the demands list and the board at S1, awaiting triage.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/demands" className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Open demands list →</Link>
                <Link href="/funnel" className="rounded-md border px-3 py-1.5 text-xs">See the funnel →</Link>
                <button
                  onClick={() => { setAnswers({ ...EMPTY_ANSWERS }); setStep(0); setSaved(null); setPhase("elicit"); }}
                  className="rounded-md border px-3 py-1.5 text-xs"
                >
                  Capture another
                </button>
              </div>
            </>
          )}
        </Card>

        {/* Right: the live deterministic preview */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Demand page (live)</h2>
            <span className="text-xs text-muted-foreground">rendered by <span className="font-mono">buildDemand</span></span>
          </div>
          <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-lg border bg-secondary/20 p-3 text-xs leading-relaxed">{preview}</pre>
        </Card>
      </div>
    </main>
  );
}
