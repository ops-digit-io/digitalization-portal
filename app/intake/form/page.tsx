"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { classifyDemand, missingRequired, INTAKE_FIELDS, FIELD_GROUPS, EMPTY_ANSWERS, type DemandField, type DemandAnswers } from "@/lib/demand";
import { useI18n } from "@/components/providers";
import { ToolHeader, SavedLinks, useIntakeSave, useDraft } from "../shared";
import { IntakeEnhancer } from "../enhancer";
import { SimilarDemands } from "../similar";

const LANE_LABEL: Record<string, string> = {
  run: "run", regulatory: "regulatory", continuous_improvement: "continuous improvement",
  transform: "transform", innovation: "innovation", data_ai: "data / AI", local: "local", unassigned: "unassigned",
};

const FIELD_CLASS = "mt-1 w-full rounded-md border bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring";

/**
 * A single form field. Defined at MODULE scope (not inside the page component) so
 * its element identity is stable across renders — otherwise React remounts the
 * input on every keystroke and it loses focus after one character.
 */
function Field({ f, value, onChange, options, t }: { f: DemandField; value: string; onChange: (v: string) => void; options?: readonly string[]; t: (k: string, fb?: string) => string }) {
  // Managed options (from the admin category store) override the baked-in seed.
  const opts = options ?? f.options ?? [];
  return (
    <div>
      <label htmlFor={f.key} className="text-sm font-medium">{f.label}{f.required && <span className="text-warn"> *</span>}</label>
      <p className="text-xs text-muted-foreground">{f.hint}</p>
      {f.input === "textarea" ? (
        <textarea id={f.key} rows={f.key === "problem" ? 3 : 2} value={value} onChange={(e) => onChange(e.target.value)} className={`${FIELD_CLASS} resize-none`} />
      ) : f.input === "select" ? (
        <select id={f.key} value={value} onChange={(e) => onChange(e.target.value)} className={FIELD_CLASS}>
          <option value="">{f.required ? t("intake.form.selectPlaceholder", "Select…") : t("intake.form.noneOption", "— none —")}</option>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input id={f.key} value={value} onChange={(e) => onChange(e.target.value)} className={FIELD_CLASS} />
      )}
    </div>
  );
}

/** Load the admin-managed category lists; the baked-in seed shows until they arrive. */
function useCategoryOptions(): Record<string, string[]> {
  const [cats, setCats] = useState<Record<string, string[]>>({});
  useEffect(() => {
    let alive = true;
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d: { categories?: Record<string, string[]> }) => { if (alive && d?.categories) setCats(d.categories); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return cats;
}

export default function FormTool() {
  const { t } = useI18n();
  const [answers, setAnswers, clearDraft] = useDraft<DemandAnswers>("intake:form:v1", { ...EMPTY_ANSWERS });
  const { saving, saved, error, save, reset } = useIntakeSave();
  const categoryOptions = useCategoryOptions();

  const classification = useMemo(() => classifyDemand(answers), [answers]);
  const missing = useMemo(() => missingRequired(answers), [answers]);
  const canSave = missing.length === 0 && !saved;

  // A saved demand is no longer a draft — drop it so a later refresh starts clean.
  useEffect(() => { if (saved) clearDraft(); }, [saved, clearDraft]);

  const set = (k: keyof DemandAnswers, v: string) => setAnswers((a) => ({ ...a, [k]: v }));
  function restart() { setAnswers({ ...EMPTY_ANSWERS }); clearDraft(); reset(); }

  return (
    <main className="mx-auto max-w-2xl px-4 py-3">
      <ToolHeader active="form" blurb={t("intake.form.blurb", "A plain form — fill the fields directly.")} />

      <Card className="p-5">
        <div className="space-y-6">
          {FIELD_GROUPS.map((g) => (
            <fieldset key={g} className="space-y-3.5">
              <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g}</legend>
              {INTAKE_FIELDS.filter((f) => f.group === g).map((f) => (
                <Field key={f.key} f={f} value={answers[f.key]} onChange={(v) => set(f.key, v)} options={categoryOptions[f.key]} t={t} />
              ))}
            </fieldset>
          ))}
        </div>

        {!saved && answers.title.trim().length >= 3 && (
          <div className="mt-4">
            <SimilarDemands query={answers.title} />
          </div>
        )}

        {!saved && (answers.problem.trim() !== "" || answers.title.trim() !== "") && (
          <div className="mt-5">
            <IntakeEnhancer answers={answers} onApply={(patch) => setAnswers((a) => ({ ...a, ...patch }))} />
          </div>
        )}

        <div className="mt-6 border-t pt-4">
          {error && <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">{error}</div>}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="uppercase tracking-wide">{t("intake.form.proposedLane", "Proposed lane")}</span>
            <Badge variant="secondary" className="font-normal">{t(`lane.${classification.lane}`, LANE_LABEL[classification.lane] ?? classification.lane)}</Badge>
            <span>· {t("intake.form.triageConfirms", "triage confirms it.")} {classification.rationale}</span>
          </div>
          {!saved ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{canSave ? t("intake.readyToSave", "Ready to save.") : `${t("intake.stillNeeded", "Still needed:")} ${missing.map((m) => m.label).join(", ")}`}</span>
              <div className="flex gap-2">
                <button onClick={restart} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">{t("intake.form.clear", "Clear")}</button>
                <button onClick={() => save({ answers })} disabled={!canSave || saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">
                  {saving ? t("common.saving", "Saving…") : t("intake.saveDemand", "Save demand")}
                </button>
              </div>
            </div>
          ) : (
            <SavedLinks id={saved.id} host={saved.result.host} pending={saved.result.pending} onRestart={restart} />
          )}
        </div>
      </Card>
    </main>
  );
}
