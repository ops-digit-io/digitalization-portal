"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { classifyDemand, missingRequired, INTAKE_FIELDS, EMPTY_ANSWERS, type DemandAnswers } from "@/lib/demand";
import { ToolHeader, SavedLinks, useIntakeSave } from "../shared";

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

  return (
    <main className="mx-auto max-w-2xl px-4 py-3">
      <ToolHeader active="form" blurb="A plain form — fill the fields directly." />

      <Card className="p-5">
        <div className="space-y-3.5">
          {INTAKE_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="text-sm font-medium">{f.question}{f.required && <span className="text-warn"> *</span>}</span>
              {f.section !== null ? (
                <textarea
                  rows={f.key === "problem" || f.key === "currentPain" ? 3 : 2}
                  value={answers[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder="In your own words…"
                  className="mt-1 w-full resize-none rounded-md border bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              ) : (
                <input
                  value={answers[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder="…"
                  className="mt-1 w-full rounded-md border bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              )}
            </label>
          ))}
        </div>

        <div className="mt-5 border-t pt-4">
          {error && <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">{error}</div>}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="font-normal">{LANE_LABEL[classification.lane] ?? classification.lane}</Badge>
            {classification.domain && <Badge variant="outline" className="font-normal">{classification.domain}</Badge>}
            <span>{classification.rationale} — triage confirms the lane.</span>
          </div>
          {!saved ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{canSave ? "Ready to save." : `Still needed: ${missing.map((m) => m.key).join(", ")}`}</span>
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
