"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { blankDemandMarkdown, parseDemandToAnswers, classifyDemand, missingRequired } from "@/lib/demand";
import { ToolHeader, SavedLinks, useIntakeSave } from "../shared";

const LANE_LABEL: Record<string, string> = {
  run: "run", regulatory: "regulatory", continuous_improvement: "continuous improvement",
  transform: "transform", innovation: "innovation", data_ai: "data / AI", local: "local", unassigned: "unassigned",
};

export default function MarkdownTool() {
  const template = useMemo(() => blankDemandMarkdown(), []);
  const [text, setText] = useState(template);
  const { saving, saved, error, save, reset } = useIntakeSave();

  // Parse the edited markdown the same way the server will, so "still needed" and
  // the proposed lane match exactly what saving produces.
  const answers = useMemo(() => parseDemandToAnswers(text), [text]);
  const classification = useMemo(() => classifyDemand(answers), [answers]);
  const missing = useMemo(() => missingRequired(answers), [answers]);
  const canSave = missing.length === 0 && !saved;

  function restart() { setText(template); reset(); }

  return (
    <main className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col overflow-hidden px-4 py-3">
      <ToolHeader active="md" blurb="Write the demand page as markdown, from the template." />

      <Card className="flex min-h-0 flex-1 flex-col p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demand markdown</span>
            <Badge variant="secondary" className="font-normal">{LANE_LABEL[classification.lane] ?? classification.lane}</Badge>
            {classification.domain && <Badge variant="outline" className="font-normal">{classification.domain}</Badge>}
          </div>
          <span className="text-xs text-muted-foreground">normalised through <span className="font-mono">buildDemand</span> on save</span>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="min-h-0 flex-1 resize-none bg-secondary/10 p-4 font-mono text-xs leading-relaxed outline-none"
        />

        <div className="border-t px-4 py-2.5">
          {error && <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">{error}</div>}
          {!saved ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {canSave ? "Ready to save." : `Still needed: ${missing.map((m) => m.label).join(", ")} — fill the matching section(s).`}
              </span>
              <div className="flex gap-2">
                <button onClick={restart} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Reset</button>
                <button onClick={() => save({ markdown: text })} disabled={!canSave || saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">
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
