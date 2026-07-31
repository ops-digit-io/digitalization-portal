"use client";

/**
 * One section of the anamnesis: description, gate question, the markdown
 * document, and — when the section is a gate — the pass/fail verdict.
 *
 * The sections form a SEQUENCE, not a catalogue. A section whose blockers are
 * unfinished is shown LOCKED and names what it is waiting for, rather than being
 * hidden: knowing what comes next is half of knowing where you are.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet, apiSend, Md } from "@/components/process/ui";
import type { Locale } from "@/lib/i18n";
import { PromptButton } from "@/components/process/prompt-button";
import * as C from "@/lib/process/content";

const TEXTAREA =
  "mt-1 min-h-[240px] w-full rounded-md border bg-background px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring";
const LABEL = "block text-xs font-medium text-muted-foreground";

export interface SectionMeta {
  key: string;
  label: string;
  order: number;
  group: string;
  gate: boolean;
  blocking: string[];
  description: string;
  gateQuestion?: string;
}
export interface GateVerdict {
  passed: boolean;
  reason: string;
  at: string;
}

export function SectionCard({
  slug,
  section,
  filled,
  locked,
  blockedBy,
  verdict,
  live,
  locale,
  onChanged,
}: {
  slug: string;
  section: SectionMeta;
  filled: boolean;
  locked: boolean;
  /** Human labels of the sections this one is waiting for. */
  blockedBy: string[];
  verdict?: GateVerdict;
  live: boolean;
  locale: Locale;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [content, setContent] = useState("");
  const [template, setTemplate] = useState("");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [failing, setFailing] = useState(false);
  const [reason, setReason] = useState("");

  async function ensureLoaded() {
    if (loaded) return;
    setErr(null);
    try {
      const r = await apiGet<{ template: string; content: string }>(`/engagements/${slug}/section/${section.key}`);
      setTemplate(r.template);
      setContent(r.content);
      setLoaded(true);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void ensureLoaded();
  }

  async function save() {
    setBusy(true);
    setErr(null);
    setHint(null);
    try {
      await apiSend("PUT", `/engagements/${slug}/section/${section.key}`, { content });
      setSaved(C.pc(locale, "artefact.savedTick"));
      await onChanged(); // a filled section can unlock the next one
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    setErr(null);
    setHint(null);
    try {
      const r = await apiSend<{ content: string }>("POST", `/engagements/${slug}/section/${section.key}/generate?lang=${locale}`);
      setContent(r.content);
      setSaved(C.pc(locale, "artefact.savedTick"));
      await onChanged();
    } catch (e) {
      const ex = e as Error & { code?: string; status?: number };
      if (ex.code === "NO_KEY" || ex.status === 503) setHint(C.pc(locale, "artefact.noKey"));
      else setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  async function setGate(passed: boolean, why: string) {
    setBusy(true);
    setErr(null);
    try {
      await apiSend("POST", `/engagements/${slug}/gate`, { torId: section.key, passed, reason: why });
      await onChanged();
      setFailing(false);
      setReason("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Label, description and gate question come from the display overlay: the
  // section definition itself is a verbatim English port.
  const text = C.sectionText(locale, section);
  const state = locked ? "locked" : filled ? "filled" : "empty";
  const stateCls =
    state === "filled"
      ? "bg-[hsl(var(--ok))]/15 text-[hsl(var(--ok))]"
      : state === "locked"
        ? "bg-secondary text-muted-foreground"
        : "bg-secondary text-muted-foreground";

  return (
    <Card className={`p-3 ${locked ? "opacity-60" : ""}`}>
      <button
        type="button"
        onClick={toggle}
        disabled={locked}
        className="flex w-full items-start justify-between gap-3 text-left disabled:cursor-not-allowed"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] tabular-nums text-muted-foreground">{section.order}</span>
            <span className="text-sm font-medium">{text.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${stateCls}`}>
              {C.pc(locale, state === "filled" ? "artefact.filled" : state === "locked" ? "section.locked" : "artefact.empty")}
            </span>
            {section.gate && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  verdict
                    ? verdict.passed
                      ? "bg-[hsl(var(--ok))]/15 text-[hsl(var(--ok))]"
                      : "bg-destructive/10 text-[hsl(var(--destructive))]"
                    : "border text-muted-foreground"
                }`}
              >
                {C.pc(locale, "section.gate")}
                {verdict ? ` · ${C.pc(locale, verdict.passed ? "gate.pass" : "gate.fail")}` : ""}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{text.description}</p>
          {locked && blockedBy.length > 0 && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
              {C.pc(locale, "section.waitingFor")}: {blockedBy.join(", ")}
            </p>
          )}
        </div>
        {!locked && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {open ? C.pc(locale, "artefact.close") : C.pc(locale, "artefact.open")}
          </span>
        )}
      </button>

      {open && !locked && (
        <div className="mt-3">
          {text.gateQuestion && (
            <p className="mb-3 border-l-2 border-border pl-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{C.pc(locale, "section.gateQuestion")}:</span> {text.gateQuestion}
            </p>
          )}

          {!loaded && !err && <p className="text-sm text-muted-foreground">{C.pc(locale, "loading")}</p>}
          {loaded && (
            <>
              {preview ? (
                <div className="rounded-md border bg-background p-3">
                  {content.trim() ? <Md>{content}</Md> : <p className="text-sm text-muted-foreground">{C.pc(locale, "artefact.noContent")}</p>}
                </div>
              ) : (
                <textarea value={content} onChange={(e) => setContent(e.target.value)} className={TEXTAREA} spellCheck={false} />
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {!content.trim() && template && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setContent(template)}>
                    {C.pc(locale, "btn.loadTemplate")}
                  </Button>
                )}
                <Button size="sm" disabled={busy} onClick={save}>
                  {busy ? "…" : C.pc(locale, "btn.save")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPreview((p) => !p)}>
                  {preview ? C.pc(locale, "btn.edit") : C.pc(locale, "btn.preview")}
                </Button>
                {live && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={generate}>
                    {C.pc(locale, "btn.aiGenerate")}
                  </Button>
                )}
                {/* Always offered, not only when the key is missing: some people
                    would rather run the interview in their own assistant. */}
                <PromptButton
                  path={`/engagements/${slug}/section/${section.key}/prompt?lang=${locale}`}
                  locale={locale}
                  label={text.label}
                />
                {saved && <span className="text-xs text-muted-foreground">{saved}</span>}
              </div>
              {!live && <p className="mt-1 text-xs text-muted-foreground">{C.pc(locale, "prompt.offline")}</p>}

              {hint && <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">{hint}</p>}
              {err && <p className="mt-1 text-xs text-destructive">{err}</p>}

              {/* The gate verdict for a gated section. */}
              {section.gate && (
                <div className="mt-3 border-t pt-3">
                  {verdict && !verdict.passed && verdict.reason && (
                    <p className="mb-2 text-xs text-destructive">{C.pc(locale, "gate.reason")}: {verdict.reason}</p>
                  )}
                  {!failing ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setGate(true, "")}>
                        {C.pc(locale, "btn.gatePass")}
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setFailing(true)}>
                        {C.pc(locale, "btn.gateFail")}
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <label className={LABEL}>{C.pc(locale, "gate.failReason")}</label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={C.pc(locale, "gate.failPlaceholder")}
                        className="mt-1 min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" disabled={busy || !reason.trim()} onClick={() => setGate(false, reason.trim())}>
                          {C.pc(locale, "btn.confirmFail")}
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setFailing(false); setReason(""); }}>
                          {C.pc(locale, "btn.cancel")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {err && !loaded && <p className="text-xs text-destructive">{err}</p>}
        </div>
      )}
    </Card>
  );
}
