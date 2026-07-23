"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { classifyDemand, missingRequired, INTAKE_FIELDS, FIELD_GROUPS, EMPTY_ANSWERS, type DemandField, type DemandAnswers } from "@/lib/demand";
import { ToolHeader, SavedLinks, useIntakeSave } from "../shared";
import { IntakeEnhancer } from "../enhancer";

const LANE_LABEL: Record<string, string> = {
  run: "run", regulatory: "regulatory", continuous_improvement: "continuous improvement",
  transform: "transform", innovation: "innovation", data_ai: "data / AI", local: "local", unassigned: "unassigned",
};

export default function FormTool() {
  const [answers, setAnswers] = useState<DemandAnswers>({ ...EMPTY_ANSWERS });
  const { saving, saved, error, save, reset } = useIntakeSave();

  const classification = useMemo(() => classifyDemand(answers), [answers]);
  const missing = useMemo(() => missingRequired(answers), [answers]);
  const canSave = missing.length === 0 && !saved;

  const set = (k: keyof DemandAnswers, v: string) => setAnswers((a) => ({ ...a, [k]: v }));
  function restart() { setAnswers({ ...EMPTY_ANSWERS }); reset(); }

  function Field({ f }: { f: DemandField }) {
    const common = "mt-1 w-full rounded-md border bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring";
    return (
      <div>
        <label htmlFor={f.key} className="text-sm font-medium">{f.label}{f.required && <span className="text-warn"> *</span>}</label>
        <p className="text-xs text-muted-foreground">{f.hint}</p>
        {f.input === "textarea" ? (
          <textarea id={f.key} rows={f.key === "problem" ? 3 : 2} value={answers[f.key]} onChange={(e) => set(f.key, e.target.value)} className={`${common} resize-none`} />
        ) : f.input === "select" ? (
          <select id={f.key} value={answers[f.key]} onChange={(e) => set(f.key, e.target.value)} className={common}>
            <option value="">{f.required ? "Select…" : "— none —"}</option>
            {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input id={f.key} value={answers[f.key]} onChange={(e) => set(f.key, e.target.value)} className={common} />
        )}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-3">
      <ToolHeader active="form" blurb="A plain form — fill the fields directly." />

      <Card className="p-5">
        <div className="space-y-6">
          {FIELD_GROUPS.map((g) => (
            <fieldset key={g} className="space-y-3.5">
              <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g}</legend>
              {INTAKE_FIELDS.filter((f) => f.group === g).map((f) => <Field key={f.key} f={f} />)}
            </fieldset>
          ))}
        </div>

        {!saved && (answers.problem.trim() !== "" || answers.title.trim() !== "") && (
          <div className="mt-5">
            <IntakeEnhancer answers={answers} onApply={(patch) => setAnswers((a) => ({ ...a, ...patch }))} />
          </div>
        )}

        <div className="mt-6 border-t pt-4">
          {error && <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">{error}</div>}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="uppercase tracking-wide">Proposed lane</span>
            <Badge variant="secondary" className="font-normal">{LANE_LABEL[classification.lane] ?? classification.lane}</Badge>
            <span>· triage confirms it. {classification.rationale}</span>
          </div>
          {!saved ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{canSave ? "Ready to save." : `Still needed: ${missing.map((m) => m.label).join(", ")}`}</span>
              <div className="flex gap-2">
                <button onClick={restart} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Clear</button>
                <button onClick={() => save({ answers })} disabled={!canSave || saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">
                  {saving ? "Saving…" : "Save demand"}
                </button>
              </div>
            </div>
          ) : (
            <SavedLinks id={saved.id} host={saved.result.host} onRestart={restart} />
          )}
        </div>
      </Card>
    </main>
  );
}
